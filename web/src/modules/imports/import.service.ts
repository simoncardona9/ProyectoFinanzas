import { createHash } from "node:crypto";
import type { AuthContext } from "@/shared/auth/auth.types";
import { ApiError } from "@/shared/errors/api-error";
import type { FinanceImportBundle } from "./import.schemas";
import { importRepository } from "./import.repository";
import { buildImportPreview, type ImportPreview } from "./import.rules";
import { financialPeriodRepository } from "@/modules/financial-periods/financial-period.repository";
import { assertFinancialPeriodsOpen } from "@/modules/financial-periods/financial-period.service";
import { importAffectedFinancialDates } from "./import-periods";

function stableJson(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(stableJson).join(",")}]`;
  if (value && typeof value === "object") {
    const object = value as Record<string, unknown>;
    return `{${Object.keys(object)
      .sort()
      .map((key) => `${JSON.stringify(key)}:${stableJson(object[key])}`)
      .join(",")}}`;
  }
  return JSON.stringify(value);
}

export function importContentHash(bundle: FinanceImportBundle) {
  return createHash("sha256").update(stableJson(bundle)).digest("hex");
}

/** Keeps previews staged before Slice 8.6 safe to read and, for August, blocked. */
function compatiblePreview(
  value: unknown,
  bundle: FinanceImportBundle,
): ImportPreview {
  const preview = value as ImportPreview;
  if (preview.reconciliation) return preview;
  return {
    ...preview,
    totals: {
      UYU: { ...preview.totals.UYU, debtOriginalMinor: 0 },
      USD: { ...preview.totals.USD, debtOriginalMinor: 0 },
    },
    reconciliation: {
      status:
        bundle.source.declaredPeriod === "2026-08"
          ? "required"
          : "not_required",
      differences: [],
    },
  };
}

export async function previewJsonImport(
  context: AuthContext,
  idempotencyKey: string,
  bundle: FinanceImportBundle,
) {
  const contentHash = importContentHash(bundle);
  const existing = await importRepository.findByKey(
    context.membership.householdId,
    idempotencyKey,
  );
  if (existing) {
    if (existing.contentHash !== contentHash)
      throw new ApiError(
        409,
        "IDEMPOTENCY_KEY_REUSED",
        "La clave de idempotencia ya se usó con otro contenido.",
      );
    return {
      importId: existing.id,
      ...compatiblePreview(
        existing.preview,
        existing.bundle as FinanceImportBundle,
      ),
    };
  }
  const [[accounts, categories], existingRates] = await Promise.all([
    importRepository.listReferences(context.membership.householdId),
    importRepository.listExchangeRateKeys(context.membership.householdId),
  ]);
  const preview = buildImportPreview(
    bundle,
    accounts,
    categories,
    existingRates.map((rate) =>
      [
        rate.baseCurrency,
        rate.quoteCurrency,
        rate.effectiveDate,
        rate.kind,
        rate.movement,
      ].join(":"),
    ),
  );
  const batch = await importRepository.create({
    householdId: context.membership.householdId,
    actorUserId: context.user.id,
    idempotencyKey,
    contentHash,
    bundle,
    preview,
  });
  return { importId: batch.id, ...preview };
}

function canCommit(preview: ImportPreview, context: AuthContext) {
  if (preview.errors)
    throw new ApiError(
      422,
      "IMPORT_HAS_ERRORS",
      "La importación tiene filas inválidas y no se puede confirmar.",
    );
  if (preview.reconciliation.status === "required")
    throw new ApiError(
      422,
      "AUGUST_RECONCILIATION_REQUIRED",
      "Agosto de 2026 requiere un informe corregido, firmado y conciliado antes de confirmar.",
    );
  if (preview.reconciliation.status === "mismatched")
    throw new ApiError(
      422,
      "IMPORT_RECONCILIATION_MISMATCH",
      "Los totales importados no coinciden con el informe de conciliación aprobado.",
    );
  if (
    preview.reconciliation.status === "matched" &&
    context.membership.role !== "owner"
  )
    throw new ApiError(
      403,
      "AUGUST_RECONCILIATION_OWNER_REQUIRED",
      "Solo la persona propietaria puede confirmar una importación conciliada de agosto de 2026.",
    );
}

export async function commitStructureImport(
  context: AuthContext,
  importId: string,
  idempotencyKey: string,
) {
  const batch = await importRepository.findById(
    context.membership.householdId,
    importId,
  );
  if (!batch)
    throw new ApiError(
      404,
      "NOT_FOUND",
      "No existe esa importación en el hogar activo.",
    );
  if (batch.idempotencyKey !== idempotencyKey)
    throw new ApiError(
      409,
      "IDEMPOTENCY_KEY_CONFLICT",
      "La confirmación debe usar la clave de idempotencia de la previsualización.",
    );
  const bundle = batch.bundle as FinanceImportBundle;
  const preview = compatiblePreview(batch.preview, bundle);
  if (batch.status === "committed")
    return {
      importId: batch.id,
      accountsCreated: bundle.accounts.length,
      categoriesCreated: bundle.categories.length,
      alreadyCommitted: true,
    };
  canCommit(preview, context);
  const result = await importRepository.commitStructure({
    householdId: context.membership.householdId,
    actorUserId: context.user.id,
    importId: batch.id,
    bundle,
    parentCategoryIds: preview.rows
      .filter((row) => row.entity === "categories")
      .map((row) => row.resolved?.parentCategoryId),
  });
  if (!result)
    throw new ApiError(
      409,
      "IMPORT_STATE_CONFLICT",
      "La importación ya fue confirmada o cambió de estado.",
    );
  return { ...result, alreadyCommitted: false };
}

export async function commitCoreCashFlowImport(
  context: AuthContext,
  importId: string,
  idempotencyKey: string,
) {
  const batch = await importRepository.findById(
    context.membership.householdId,
    importId,
  );
  if (!batch)
    throw new ApiError(
      404,
      "NOT_FOUND",
      "No existe esa importación en el hogar activo.",
    );
  if (batch.idempotencyKey !== idempotencyKey)
    throw new ApiError(
      409,
      "IDEMPOTENCY_KEY_CONFLICT",
      "La confirmación debe usar la clave de idempotencia de la previsualización.",
    );
  const bundle = batch.bundle as FinanceImportBundle;
  if (batch.status === "committed")
    return {
      importId: batch.id,
      accountsCreated: bundle.accounts.length,
      categoriesCreated: bundle.categories.length,
      transactionsCreated: bundle.transactions.length,
      obligationsCreated: bundle.obligations.length,
      expectedIncomeCreated: bundle.expectedIncome.length,
      debtsCreated: bundle.debts.length,
      debtPaymentsCreated: bundle.debtPayments.length,
      invoicesCreated: bundle.invoices.length,
      invoiceCollectionsCreated: bundle.invoiceCollections.length,
      ivaReservesCreated: bundle.ivaReserves.length,
      exchangeRatesCreated: bundle.exchangeRates.length,
      alreadyCommitted: true,
    };
  const [[accounts, categories], existingRates] = await Promise.all([
    importRepository.listReferences(context.membership.householdId),
    importRepository.listExchangeRateKeys(context.membership.householdId),
  ]);
  // Revalidate immediately before claiming the batch: a reference may have been
  // archived or changed after the reviewer saw the staged preview.
  const preview = buildImportPreview(
    bundle,
    accounts,
    categories,
    existingRates.map((rate) =>
      [
        rate.baseCurrency,
        rate.quoteCurrency,
        rate.effectiveDate,
        rate.kind,
        rate.movement,
      ].join(":"),
    ),
  );
  canCommit(preview, context);
  await assertFinancialPeriodsOpen(
    financialPeriodRepository,
    context.membership.householdId,
    importAffectedFinancialDates(bundle),
  );
  const result = await importRepository.commitCoreCashFlow({
    householdId: context.membership.householdId,
    actorUserId: context.user.id,
    importId: batch.id,
    bundle,
    parentCategoryIds: preview.rows
      .filter((row) => row.entity === "categories")
      .map((row) => row.resolved?.parentCategoryId),
  });
  if (!result)
    throw new ApiError(
      409,
      "IMPORT_STATE_CONFLICT",
      "La importación ya fue confirmada o cambió de estado.",
    );
  return { ...result, alreadyCommitted: false };
}

/** Slice 8.4 commits all historical links alongside the core staged rows. */
export const commitHistoricalImport = commitCoreCashFlowImport;
