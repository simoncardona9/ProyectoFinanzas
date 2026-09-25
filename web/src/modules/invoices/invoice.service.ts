import type { AuthContext } from "@/shared/auth/auth.types";
import { invoiceRepository } from "./invoice.repository";
import type { CreateInvoice, CreateInvoiceCollection } from "./invoice.schemas";
import {
  validateInvoice,
  validateInvoiceCancellation,
  validateInvoiceCollection,
  validateInvoiceSend,
  calculateCollectionIvaReserve,
} from "./invoice.rules";
import { ApiError } from "@/shared/errors/api-error";
import { structureRepository } from "@/modules/structure/structure.repository";
import { financialPeriodRepository } from "@/modules/financial-periods/financial-period.repository";
import { assertFinancialPeriodOpen } from "@/modules/financial-periods/financial-period.service";

export async function createInvoice(
  context: AuthContext,
  values: CreateInvoice,
) {
  const breakdown = validateInvoice(values);
  await assertFinancialPeriodOpen(
    financialPeriodRepository,
    context.membership.householdId,
    values.serviceDate,
  );
  return invoiceRepository.create(
    context.membership.householdId,
    context.user.id,
    values,
    breakdown,
  );
}

export async function sendInvoice(
  context: AuthContext,
  id: string,
  sentDate: string,
) {
  const invoice = await invoiceRepository.find(
    context.membership.householdId,
    id,
  );
  if (!invoice) throw new ApiError(404, "NOT_FOUND", "Invoice not found.");
  validateInvoiceSend(invoice);
  await assertFinancialPeriodOpen(
    financialPeriodRepository,
    context.membership.householdId,
    sentDate,
  );
  const updated = await invoiceRepository.send(
    context.membership.householdId,
    context.user.id,
    invoice,
    sentDate,
  );
  if (!updated)
    throw new ApiError(
      409,
      "CONCURRENT_MODIFICATION",
      "The invoice changed before it could be sent.",
    );
  return updated;
}

export async function collectInvoice(
  context: AuthContext,
  id: string,
  values: CreateInvoiceCollection,
) {
  const [invoice, account] = await Promise.all([
    invoiceRepository.find(context.membership.householdId, id),
    structureRepository.findAccount(
      context.membership.householdId,
      values.accountId,
    ),
  ]);
  if (!invoice) throw new ApiError(404, "NOT_FOUND", "Invoice not found.");
  validateInvoiceCollection(invoice, account, values);
  await assertFinancialPeriodOpen(
    financialPeriodRepository,
    context.membership.householdId,
    values.paidDate,
  );
  const reserveAmountMinor = calculateCollectionIvaReserve(
    invoice,
    values.amountMinor,
  );
  try {
    return await invoiceRepository.collect(
      context.membership.householdId,
      context.user.id,
      invoice,
      values,
      reserveAmountMinor,
    );
  } catch (error) {
    if (
      error instanceof Error &&
      error.message === "Concurrent invoice collection."
    )
      throw new ApiError(
        409,
        "CONCURRENT_MODIFICATION",
        "The invoice changed before the collection could be applied.",
      );
    throw error;
  }
}

export async function cancelInvoice(
  context: AuthContext,
  id: string,
  reason: string,
) {
  const invoice = await invoiceRepository.find(
    context.membership.householdId,
    id,
  );
  if (!invoice) throw new ApiError(404, "NOT_FOUND", "Invoice not found.");
  validateInvoiceCancellation(invoice);
  await assertFinancialPeriodOpen(
    financialPeriodRepository,
    context.membership.householdId,
    invoice.serviceDate,
  );
  const updated = await invoiceRepository.cancel(
    context.membership.householdId,
    context.user.id,
    invoice,
    reason,
  );
  if (!updated)
    throw new ApiError(
      409,
      "CONCURRENT_MODIFICATION",
      "The invoice changed before it could be cancelled.",
    );
  return updated;
}
