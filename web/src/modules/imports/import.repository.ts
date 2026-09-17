import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import {
  accounts,
  auditLogs,
  categories,
  debtPayments,
  debts,
  exchangeRates,
  importBatches,
  invoiceCollections,
  invoices,
  obligations,
  taxReserves,
  transactions,
} from "@/db/schema";
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
  async listExchangeRateKeys(householdId: string) {
    return db
      .select({
        baseCurrency: exchangeRates.baseCurrency,
        quoteCurrency: exchangeRates.quoteCurrency,
        effectiveDate: exchangeRates.effectiveDate,
        kind: exchangeRates.kind,
        movement: exchangeRates.movement,
      })
      .from(exchangeRates)
      .where(eq(exchangeRates.householdId, householdId));
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
          declaredPeriod: values.bundle.source.declaredPeriod,
          reconciliation: values.bundle.source.reconciliation
            ? {
                reportName: values.bundle.source.reconciliation.reportName,
                reportContentHash:
                  values.bundle.source.reconciliation.reportContentHash,
                reviewer: values.bundle.source.reconciliation.reviewer,
                signedAt: values.bundle.source.reconciliation.signedAt,
              }
            : undefined,
        },
      });
      return {
        importId: values.importId,
        accountsCreated: values.bundle.accounts.length,
        categoriesCreated: values.bundle.categories.length,
      };
    });
  },
  async commitCoreCashFlow(values: {
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

      const nameKey = (name: string) =>
        name
          .normalize("NFD")
          .replace(/\p{Diacritic}/gu, "")
          .toLocaleLowerCase("es");
      const [existingAccounts, existingCategories] = await Promise.all([
        tx
          .select({ id: accounts.id, name: accounts.name })
          .from(accounts)
          .where(eq(accounts.householdId, values.householdId)),
        tx
          .select({ id: categories.id, name: categories.name })
          .from(categories)
          .where(eq(categories.householdId, values.householdId)),
      ]);
      const accountIds = new Map(
        existingAccounts.map((row) => [nameKey(row.name), row.id]),
      );
      const categoryIds = new Map(
        existingCategories.map((row) => [nameKey(row.name), row.id]),
      );

      for (let index = 0; index < values.bundle.categories.length; index++) {
        const row = values.bundle.categories[index];
        const parentCategoryId = row.parent
          ? (categoryIds.get(nameKey(row.parent)) ??
            values.parentCategoryIds[index])
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
        categoryIds.set(nameKey(row.name), category.id);
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
        accountIds.set(nameKey(row.name), account.id);
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
      const accountIdFor = (name: string) => {
        const id = accountIds.get(nameKey(name));
        if (!id)
          throw new Error("Validated import account reference disappeared.");
        return id;
      };
      const categoryIdFor = (name: string) => {
        const id = categoryIds.get(nameKey(name));
        if (!id)
          throw new Error("Validated import category reference disappeared.");
        return id;
      };
      for (let index = 0; index < values.bundle.transactions.length; index++) {
        const row = values.bundle.transactions[index];
        const [transaction] = await tx
          .insert(transactions)
          .values({
            householdId: values.householdId,
            date: row.date,
            type: row.type,
            status: "paid",
            amountMinor: row.amountMinor,
            currency: row.currency,
            accountId: accountIdFor(row.account),
            categoryId: categoryIdFor(row.category),
            description: row.description,
            isRecurring: row.isRecurring,
            isOneOff: row.isOneOff,
          })
          .returning({ id: transactions.id });
        await tx.insert(auditLogs).values({
          householdId: values.householdId,
          actorUserId: values.actorUserId,
          action: "create",
          entityType: "transaction",
          entityId: transaction.id,
          details: {
            importId: values.importId,
            entity: "transactions",
            row: index + 1,
          },
        });
      }
      for (let index = 0; index < values.bundle.obligations.length; index++) {
        const row = values.bundle.obligations[index];
        const [obligation] = await tx
          .insert(obligations)
          .values({
            householdId: values.householdId,
            description: row.description,
            originalAmountMinor: row.amountMinor,
            remainingAmountMinor: row.amountMinor,
            currency: row.currency,
            dueDate: row.dueDate,
            categoryId: categoryIdFor(row.category),
            classification: row.classification,
            status: row.status,
            recurrenceRule: row.recurrenceRule ?? null,
          })
          .returning({ id: obligations.id });
        await tx.insert(auditLogs).values({
          householdId: values.householdId,
          actorUserId: values.actorUserId,
          action: "create",
          entityType: "obligation",
          entityId: obligation.id,
          details: {
            importId: values.importId,
            entity: "obligations",
            row: index + 1,
          },
        });
      }
      for (
        let index = 0;
        index < values.bundle.expectedIncome.length;
        index++
      ) {
        const row = values.bundle.expectedIncome[index];
        const [transaction] = await tx
          .insert(transactions)
          .values({
            householdId: values.householdId,
            date: row.date,
            type: "income",
            status: row.status,
            amountMinor: row.amountMinor,
            currency: row.currency,
            accountId: accountIdFor(row.account),
            categoryId: categoryIdFor(row.category),
            description: row.description,
            isRecurring: row.isRecurring,
            isOneOff: row.isOneOff,
          })
          .returning({ id: transactions.id });
        await tx.insert(auditLogs).values({
          householdId: values.householdId,
          actorUserId: values.actorUserId,
          action: "create",
          entityType: "transaction",
          entityId: transaction.id,
          details: {
            importId: values.importId,
            entity: "expectedIncome",
            row: index + 1,
          },
        });
      }
      const debtIds = new Map<
        string,
        { id: string; currency: string; remaining: number; description: string }
      >();
      for (let index = 0; index < values.bundle.debts.length; index++) {
        const row = values.bundle.debts[index];
        const [debt] = await tx
          .insert(debts)
          .values({
            householdId: values.householdId,
            creditorName: row.creditorName,
            description: row.description,
            originalAmountMinor: row.amountMinor,
            remainingAmountMinor: row.amountMinor,
            currency: row.currency,
            incurredDate: row.incurredDate,
          })
          .returning();
        debtIds.set(nameKey(row.reference), {
          id: debt.id,
          currency: debt.currency,
          remaining: debt.remainingAmountMinor,
          description: debt.description,
        });
        await tx
          .insert(auditLogs)
          .values({
            householdId: values.householdId,
            actorUserId: values.actorUserId,
            action: "create",
            entityType: "debt",
            entityId: debt.id,
            details: {
              importId: values.importId,
              entity: "debts",
              row: index + 1,
            },
          });
      }
      for (let index = 0; index < values.bundle.debtPayments.length; index++) {
        const row = values.bundle.debtPayments[index];
        const debt = debtIds.get(nameKey(row.debt));
        if (!debt)
          throw new Error("Validated import debt reference disappeared.");
        const [transaction] = await tx
          .insert(transactions)
          .values({
            householdId: values.householdId,
            date: row.paidDate,
            type: "debt_payment",
            status: "paid",
            amountMinor: row.amountMinor,
            currency: debt.currency,
            accountId: accountIdFor(row.account),
            categoryId: null,
            description: row.description ?? debt.description,
            isRecurring: false,
            isOneOff: false,
          })
          .returning({ id: transactions.id });
        await tx
          .insert(debtPayments)
          .values({
            debtId: debt.id,
            transactionId: transaction.id,
            amountMinor: row.amountMinor,
          });
        debt.remaining -= row.amountMinor;
        await tx
          .update(debts)
          .set({
            remainingAmountMinor: debt.remaining,
            status: debt.remaining === 0 ? "paid" : "active",
            updatedAt: new Date(),
          })
          .where(eq(debts.id, debt.id));
        await tx
          .insert(auditLogs)
          .values({
            householdId: values.householdId,
            actorUserId: values.actorUserId,
            action: "payment",
            entityType: "debt",
            entityId: debt.id,
            details: {
              importId: values.importId,
              entity: "debtPayments",
              row: index + 1,
              transactionId: transaction.id,
            },
          });
      }
      const invoiceIds = new Map<
        string,
        {
          id: string;
          currency: string;
          gross: number;
          iva: number;
          remaining: number;
          description: string;
        }
      >();
      for (let index = 0; index < values.bundle.invoices.length; index++) {
        const row = values.bundle.invoices[index];
        const ivaAmountMinor = Math.floor(
          (row.grossAmountMinor * row.ivaRateBasisPoints +
            Math.floor((10_000 + row.ivaRateBasisPoints) / 2)) /
            (10_000 + row.ivaRateBasisPoints),
        );
        const [invoice] = await tx
          .insert(invoices)
          .values({
            householdId: values.householdId,
            clientName: row.clientName,
            description: row.description,
            serviceDate: row.serviceDate,
            dueDate: row.dueDate,
            grossAmountMinor: row.grossAmountMinor,
            netAmountMinor: row.grossAmountMinor - ivaAmountMinor,
            ivaRateBasisPoints: row.ivaRateBasisPoints,
            ivaAmountMinor,
            currency: row.currency,
            sentDate: row.sentDate ?? null,
            status: row.sentDate ? "sent" : "draft",
            remainingAmountMinor: row.grossAmountMinor,
          })
          .returning();
        invoiceIds.set(nameKey(row.reference), {
          id: invoice.id,
          currency: invoice.currency,
          gross: invoice.grossAmountMinor,
          iva: invoice.ivaAmountMinor,
          remaining: invoice.remainingAmountMinor,
          description: invoice.description,
        });
        await tx
          .insert(auditLogs)
          .values({
            householdId: values.householdId,
            actorUserId: values.actorUserId,
            action: "create",
            entityType: "invoice",
            entityId: invoice.id,
            details: {
              importId: values.importId,
              entity: "invoices",
              row: index + 1,
            },
          });
      }
      const collectionIds = new Map<
        string,
        {
          id: string;
          invoiceId: string;
          currency: string;
          expectedReserve: number;
        }
      >();
      for (
        let index = 0;
        index < values.bundle.invoiceCollections.length;
        index++
      ) {
        const row = values.bundle.invoiceCollections[index];
        const invoice = invoiceIds.get(nameKey(row.invoice));
        if (!invoice)
          throw new Error("Validated import invoice reference disappeared.");
        const collectedBefore = invoice.gross - invoice.remaining;
        const expectedReserve = Number(
          (BigInt(collectedBefore + row.amountMinor) * BigInt(invoice.iva) +
            BigInt(invoice.gross / 2)) /
            BigInt(invoice.gross) -
            (BigInt(collectedBefore) * BigInt(invoice.iva) +
              BigInt(invoice.gross / 2)) /
              BigInt(invoice.gross),
        );
        const [transaction] = await tx
          .insert(transactions)
          .values({
            householdId: values.householdId,
            date: row.paidDate,
            type: "income",
            status: "paid",
            amountMinor: row.amountMinor,
            currency: invoice.currency,
            accountId: accountIdFor(row.account),
            categoryId: null,
            description: row.description ?? invoice.description,
            isRecurring: false,
            isOneOff: false,
          })
          .returning({ id: transactions.id });
        const [collection] = await tx
          .insert(invoiceCollections)
          .values({
            invoiceId: invoice.id,
            transactionId: transaction.id,
            amountMinor: row.amountMinor,
          })
          .returning({ id: invoiceCollections.id });
        invoice.remaining -= row.amountMinor;
        await tx
          .update(invoices)
          .set({
            remainingAmountMinor: invoice.remaining,
            status:
              invoice.remaining === 0 ? "collected" : "partially_collected",
            updatedAt: new Date(),
          })
          .where(eq(invoices.id, invoice.id));
        collectionIds.set(nameKey(row.reference), {
          id: collection.id,
          invoiceId: invoice.id,
          currency: invoice.currency,
          expectedReserve,
        });
        await tx
          .insert(auditLogs)
          .values({
            householdId: values.householdId,
            actorUserId: values.actorUserId,
            action: "collection",
            entityType: "invoice",
            entityId: invoice.id,
            details: {
              importId: values.importId,
              entity: "invoiceCollections",
              row: index + 1,
              transactionId: transaction.id,
            },
          });
      }
      for (let index = 0; index < values.bundle.ivaReserves.length; index++) {
        const row = values.bundle.ivaReserves[index];
        const collection = collectionIds.get(nameKey(row.collection));
        if (!collection || row.amountMinor !== collection.expectedReserve)
          throw new Error(
            "Validated import IVA reserve reference disappeared.",
          );
        const [reserve] = await tx
          .insert(taxReserves)
          .values({
            householdId: values.householdId,
            invoiceId: collection.invoiceId,
            invoiceCollectionId: collection.id,
            originalAmountMinor: row.amountMinor,
            remainingAmountMinor: row.amountMinor,
            currency: collection.currency,
          })
          .returning({ id: taxReserves.id });
        await tx
          .insert(auditLogs)
          .values({
            householdId: values.householdId,
            actorUserId: values.actorUserId,
            action: "create",
            entityType: "tax_reserve",
            entityId: reserve.id,
            details: {
              importId: values.importId,
              entity: "ivaReserves",
              row: index + 1,
            },
          });
      }
      for (let index = 0; index < values.bundle.exchangeRates.length; index++) {
        const row = values.bundle.exchangeRates[index];
        const [rate] = await tx
          .insert(exchangeRates)
          .values({ householdId: values.householdId, ...row })
          .returning({ id: exchangeRates.id });
        await tx
          .insert(auditLogs)
          .values({
            householdId: values.householdId,
            actorUserId: values.actorUserId,
            action: "create",
            entityType: "exchange_rate",
            entityId: rate.id,
            details: {
              importId: values.importId,
              entity: "exchangeRates",
              row: index + 1,
            },
          });
      }
      const result = {
        importId: values.importId,
        accountsCreated: values.bundle.accounts.length,
        categoriesCreated: values.bundle.categories.length,
        transactionsCreated: values.bundle.transactions.length,
        obligationsCreated: values.bundle.obligations.length,
        expectedIncomeCreated: values.bundle.expectedIncome.length,
        debtsCreated: values.bundle.debts.length,
        debtPaymentsCreated: values.bundle.debtPayments.length,
        invoicesCreated: values.bundle.invoices.length,
        invoiceCollectionsCreated: values.bundle.invoiceCollections.length,
        ivaReservesCreated: values.bundle.ivaReserves.length,
        exchangeRatesCreated: values.bundle.exchangeRates.length,
      };
      await tx.insert(auditLogs).values({
        householdId: values.householdId,
        actorUserId: values.actorUserId,
        action: "commit",
        entityType: "import_batch",
        entityId: values.importId,
        details: {
          ...result,
          declaredPeriod: values.bundle.source.declaredPeriod,
          reconciliation: values.bundle.source.reconciliation
            ? {
                reportName: values.bundle.source.reconciliation.reportName,
                reportContentHash:
                  values.bundle.source.reconciliation.reportContentHash,
                reviewer: values.bundle.source.reconciliation.reviewer,
                signedAt: values.bundle.source.reconciliation.signedAt,
              }
            : undefined,
        },
      });
      return result;
    });
  },
};
