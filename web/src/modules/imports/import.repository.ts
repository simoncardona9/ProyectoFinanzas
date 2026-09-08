import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { accounts, auditLogs, categories, importBatches } from "@/db/schema";
import type { FinanceImportBundle } from "./import.schemas";
import type { ImportPreview } from "./import.rules";

export const importRepository = {
  listReferences(householdId: string) {
    return Promise.all([
      db.query.accounts.findMany({
        where: eq(accounts.householdId, householdId),
        columns: { id: true, name: true, currency: true, active: true },
      }),
      db.query.categories.findMany({
        where: eq(categories.householdId, householdId),
        columns: { id: true, name: true, kind: true, active: true },
      }),
    ]);
  },
  findByKey(householdId: string, idempotencyKey: string) {
    return db.query.importBatches.findFirst({
      where: and(
        eq(importBatches.householdId, householdId),
        eq(importBatches.idempotencyKey, idempotencyKey),
      ),
    });
  },
  async create(values: {
    householdId: string;
    actorUserId: string;
    idempotencyKey: string;
    contentHash: string;
    bundle: FinanceImportBundle;
    preview: ImportPreview;
  }) {
    return db.transaction(async (tx) => {
      const [batch] = await tx
        .insert(importBatches)
        .values({
          ...values,
          sourceType: values.bundle.source.type,
          sourceName: values.bundle.source.name,
          status: values.preview.errors ? "invalid" : "staged",
        })
        .returning();
      await tx.insert(auditLogs).values({
        householdId: values.householdId,
        actorUserId: values.actorUserId,
        action: "stage",
        entityType: "import_batch",
        entityId: batch.id,
        details: {
          sourceType: values.bundle.source.type,
          contentHash: values.contentHash,
        },
      });
      return batch;
    });
  },
};
