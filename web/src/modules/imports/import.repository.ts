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
  findById(householdId: string, id: string) {
    return db.query.importBatches.findFirst({
      where: and(
        eq(importBatches.householdId, householdId),
        eq(importBatches.id, id),
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
  async commitStructure(values: {
    householdId: string;
    actorUserId: string;
    importId: string;
    bundle: FinanceImportBundle;
    parentCategoryIds: Array<string | undefined>;
  }) {
    return db.transaction(async (tx) => {
      const [claimed] = await tx
        .update(importBatches)
        .set({ status: "committed" })
        .where(
          and(
            eq(importBatches.id, values.importId),
            eq(importBatches.householdId, values.householdId),
            eq(importBatches.status, "staged"),
          ),
        )
        .returning({ id: importBatches.id });
      if (!claimed) return null;

      const categoryIdsByName = new Map<string, string>();
      for (let index = 0; index < values.bundle.categories.length; index++) {
        const row = values.bundle.categories[index];
        const parentCategoryId = row.parent
          ? (categoryIdsByName.get(
              row.parent
                .normalize("NFD")
                .replace(/\p{Diacritic}/gu, "")
                .toLocaleLowerCase("es"),
            ) ?? values.parentCategoryIds[index])
          : values.parentCategoryIds[index];
        const [category] = await tx
          .insert(categories)
          .values({
            householdId: values.householdId,
            name: row.name,
            kind: row.kind,
            parentCategoryId: parentCategoryId ?? null,
            defaultClassification: row.defaultClassification ?? null,
          })
          .returning({ id: categories.id });
        categoryIdsByName.set(
          row.name
            .normalize("NFD")
            .replace(/\p{Diacritic}/gu, "")
            .toLocaleLowerCase("es"),
          category.id,
        );
        await tx.insert(auditLogs).values({
          householdId: values.householdId,
          actorUserId: values.actorUserId,
          action: "create",
          entityType: "category",
          entityId: category.id,
          details: {
            importId: values.importId,
            entity: "categories",
            row: index + 1,
          },
        });
      }
      for (let index = 0; index < values.bundle.accounts.length; index++) {
        const row = values.bundle.accounts[index];
        const [account] = await tx
          .insert(accounts)
          .values({ ...row, householdId: values.householdId })
          .returning({ id: accounts.id });
        await tx.insert(auditLogs).values({
          householdId: values.householdId,
          actorUserId: values.actorUserId,
          action: "create",
          entityType: "account",
          entityId: account.id,
          details: {
            importId: values.importId,
            entity: "accounts",
            row: index + 1,
          },
        });
      }
      await tx.insert(auditLogs).values({
        householdId: values.householdId,
        actorUserId: values.actorUserId,
        action: "commit",
        entityType: "import_batch",
        entityId: values.importId,
        details: {
          accounts: values.bundle.accounts.length,
          categories: values.bundle.categories.length,
        },
      });
      return {
        importId: values.importId,
        accountsCreated: values.bundle.accounts.length,
        categoriesCreated: values.bundle.categories.length,
      };
    });
  },
};
