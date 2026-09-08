import { createHash } from "node:crypto";
import type { AuthContext } from "@/shared/auth/auth.types";
import { ApiError } from "@/shared/errors/api-error";
import type { FinanceImportBundle } from "./import.schemas";
import { importRepository } from "./import.repository";
import { buildImportPreview } from "./import.rules";

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
    return existing.preview;
  }
  const [accounts, categories] = await importRepository.listReferences(
    context.membership.householdId,
  );
  const preview = buildImportPreview(bundle, accounts, categories);
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
