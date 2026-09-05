import { and, asc, eq, gte, lte, sql } from "drizzle-orm";
import { db } from "@/db";
import {
  accounts,
  auditLogs,
  categories,
  obligationPayments,
  obligations,
  transactions,
} from "@/db/schema";
import type {
  CreateObligation,
  CreateObligationPayment,
  ListObligations,
} from "./obligation.schemas";

export const obligationRepository = {
  async create(
    householdId: string,
    actorUserId: string,
    values: CreateObligation,
  ) {
    return db.transaction(async (tx) => {
      const [obligation] = await tx
        .insert(obligations)
        .values({
          householdId,
          description: values.description,
          originalAmountMinor: values.amountMinor,
          remainingAmountMinor: values.amountMinor,
          currency: values.currency,
          dueDate: values.dueDate,
          categoryId: values.categoryId,
          classification: values.classification,
          status: values.status,
          recurrenceRule: values.recurrenceRule ?? null,
        })
        .returning();
      await tx.insert(auditLogs).values({
        householdId,
        actorUserId,
        action: "create",
        entityType: "obligation",
        entityId: obligation.id,
      });
      return obligation;
    });
  },
  list(householdId: string, filters: ListObligations) {
    return db
      .select({
        id: obligations.id,
        description: obligations.description,
        originalAmountMinor: obligations.originalAmountMinor,
        remainingAmountMinor: obligations.remainingAmountMinor,
        currency: obligations.currency,
        dueDate: obligations.dueDate,
        classification: obligations.classification,
        status: obligations.status,
        recurrenceRule: obligations.recurrenceRule,
        categoryId: obligations.categoryId,
        categoryName: categories.name,
      })
      .from(obligations)
      .innerJoin(categories, eq(obligations.categoryId, categories.id))
      .where(
        and(
          eq(obligations.householdId, householdId),
          filters.dueFrom
            ? gte(obligations.dueDate, filters.dueFrom)
            : undefined,
          filters.dueTo ? lte(obligations.dueDate, filters.dueTo) : undefined,
          filters.status ? eq(obligations.status, filters.status) : undefined,
          filters.currency
            ? eq(obligations.currency, filters.currency)
            : undefined,
        ),
      )
      .orderBy(asc(obligations.dueDate), asc(obligations.createdAt))
      .limit(filters.limit)
      .offset(filters.offset);
  },
  find(householdId: string, id: string) {
    return db.query.obligations.findFirst({
      where: and(
        eq(obligations.id, id),
        eq(obligations.householdId, householdId),
      ),
    });
  },
  async pay(
    householdId: string,
    actorUserId: string,
    obligation: typeof obligations.$inferSelect,
    values: CreateObligationPayment,
  ) {
    return db.transaction(async (tx) => {
      const [transaction] = await tx
        .insert(transactions)
        .values({
          householdId,
          date: values.paidDate,
          type: "expense",
          status: "paid",
          amountMinor: values.amountMinor,
          currency: obligation.currency,
          accountId: values.accountId,
          categoryId: obligation.categoryId,
          description: values.description ?? obligation.description,
          isRecurring: false,
          isOneOff: false,
        })
        .returning();
      await tx.insert(obligationPayments).values({
        obligationId: obligation.id,
        transactionId: transaction.id,
        amountMinor: values.amountMinor,
      });
      const remainingAmountMinor =
        obligation.remainingAmountMinor - values.amountMinor;
      const [updated] = await tx
        .update(obligations)
        .set({
          remainingAmountMinor,
          status: remainingAmountMinor === 0 ? "paid" : "pending",
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(obligations.id, obligation.id),
            eq(obligations.householdId, householdId),
            eq(
              obligations.remainingAmountMinor,
              obligation.remainingAmountMinor,
            ),
          ),
        )
        .returning();
      if (!updated) throw new Error("Concurrent obligation payment.");
      await tx.insert(auditLogs).values({
        householdId,
        actorUserId,
        action: "payment",
        entityType: "obligation",
        entityId: obligation.id,
        details: {
          amountMinor: values.amountMinor,
          transactionId: transaction.id,
        },
      });
      return { obligation: updated, transaction };
    });
  },
  async defer(
    householdId: string,
    actorUserId: string,
    obligation: typeof obligations.$inferSelect,
    newDueDate: string,
    reason: string,
  ) {
    return db.transaction(async (tx) => {
      const [updated] = await tx
        .update(obligations)
        .set({ dueDate: newDueDate, status: "deferred", updatedAt: new Date() })
        .where(
          and(
            eq(obligations.id, obligation.id),
            eq(obligations.householdId, householdId),
            eq(obligations.dueDate, obligation.dueDate),
          ),
        )
        .returning();
      if (!updated) return undefined;
      await tx.insert(auditLogs).values({
        householdId,
        actorUserId,
        action: "defer",
        entityType: "obligation",
        entityId: obligation.id,
        details: { reason, previousDueDate: obligation.dueDate, newDueDate },
      });
      return updated;
    });
  },
  async forecast(householdId: string, from: string, to: string) {
    const [cashAccounts, cashTransactions, obligationRows] = await Promise.all([
      db
        .select({
          id: accounts.id,
          currency: accounts.currency,
          openingBalanceMinor: accounts.openingBalanceMinor,
        })
        .from(accounts)
        .where(
          and(
            eq(accounts.householdId, householdId),
            sql`${accounts.type} in ('cash', 'bank')`,
          ),
        ),
      db
        .select({
          accountId: transactions.accountId,
          type: transactions.type,
          amountMinor: transactions.amountMinor,
        })
        .from(transactions)
        .innerJoin(accounts, eq(transactions.accountId, accounts.id))
        .where(
          and(
            eq(transactions.householdId, householdId),
            eq(transactions.status, "paid"),
            sql`${accounts.type} in ('cash', 'bank')`,
          ),
        ),
      db
        .select({
          currency: obligations.currency,
          pendingMinor: sql<string>`coalesce(sum(${obligations.remainingAmountMinor}), 0)`,
        })
        .from(obligations)
        .where(
          and(
            eq(obligations.householdId, householdId),
            gte(obligations.dueDate, from),
            lte(obligations.dueDate, to),
            sql`${obligations.status} in ('planned', 'pending', 'deferred')`,
          ),
        )
        .groupBy(obligations.currency),
    ]);
    const byCurrency = new Map<
      string,
      {
        currency: string;
        currentCashMinor: number;
        pendingObligationsMinor: number;
        projectedCashMinor: number;
      }
    >();
    const accountCurrency = new Map(
      cashAccounts.map((account) => [account.id, account.currency]),
    );
    for (const account of cashAccounts) {
      const current = byCurrency.get(account.currency) ?? {
        currency: account.currency,
        currentCashMinor: 0,
        pendingObligationsMinor: 0,
        projectedCashMinor: 0,
      };
      current.currentCashMinor += account.openingBalanceMinor;
      current.projectedCashMinor = current.currentCashMinor;
      byCurrency.set(account.currency, current);
    }
    for (const transaction of cashTransactions) {
      const currency = accountCurrency.get(transaction.accountId);
      if (!currency) continue;
      const current = byCurrency.get(currency)!;
      current.currentCashMinor +=
        transaction.type === "income"
          ? transaction.amountMinor
          : -transaction.amountMinor;
      current.projectedCashMinor =
        current.currentCashMinor - current.pendingObligationsMinor;
    }
    for (const row of obligationRows) {
      const current = byCurrency.get(row.currency) ?? {
        currency: row.currency,
        currentCashMinor: 0,
        pendingObligationsMinor: 0,
        projectedCashMinor: 0,
      };
      current.pendingObligationsMinor = Number(row.pendingMinor);
      current.projectedCashMinor =
        current.currentCashMinor - current.pendingObligationsMinor;
      byCurrency.set(row.currency, current);
    }
    return [...byCurrency.values()].sort((a, b) =>
      a.currency.localeCompare(b.currency),
    );
  },
};
