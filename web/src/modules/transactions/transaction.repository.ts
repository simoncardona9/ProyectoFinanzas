import { and, asc, desc, eq, gte, lte, sql } from "drizzle-orm";
import { db } from "@/db";
import { accounts, auditLogs, categories, transactions } from "@/db/schema";
import type {
  CreatePaidTransaction,
  ListPaidTransactions,
  UpdatePaidTransaction,
} from "./transaction.schemas";

export const transactionRepository = {
  async createPaid(
    householdId: string,
    actorUserId: string,
    values: CreatePaidTransaction,
  ) {
    return db.transaction(async (tx) => {
      const [transaction] = await tx
        .insert(transactions)
        .values({ ...values, householdId })
        .returning();
      await tx.insert(auditLogs).values({
        householdId,
        actorUserId,
        action: "create",
        entityType: "transaction",
        entityId: transaction.id,
      });
      return transaction;
    });
  },
  listPaid(householdId: string, filters: ListPaidTransactions) {
    return db
      .select({
        id: transactions.id,
        date: transactions.date,
        type: transactions.type,
        amountMinor: transactions.amountMinor,
        currency: transactions.currency,
        description: transactions.description,
        accountId: transactions.accountId,
        accountName: accounts.name,
        categoryId: transactions.categoryId,
        categoryName: categories.name,
      })
      .from(transactions)
      .innerJoin(accounts, eq(transactions.accountId, accounts.id))
      .innerJoin(categories, eq(transactions.categoryId, categories.id))
      .where(
        and(
          eq(transactions.householdId, householdId),
          eq(transactions.status, "paid"),
          filters.from ? gte(transactions.date, filters.from) : undefined,
          filters.to ? lte(transactions.date, filters.to) : undefined,
          filters.accountId
            ? eq(transactions.accountId, filters.accountId)
            : undefined,
          filters.categoryId
            ? eq(transactions.categoryId, filters.categoryId)
            : undefined,
          filters.type ? eq(transactions.type, filters.type) : undefined,
          filters.currency
            ? eq(transactions.currency, filters.currency)
            : undefined,
          filters.isRecurring === undefined
            ? undefined
            : eq(transactions.isRecurring, filters.isRecurring),
          filters.isOneOff === undefined
            ? undefined
            : eq(transactions.isOneOff, filters.isOneOff),
        ),
      )
      .orderBy(desc(transactions.date), asc(transactions.createdAt))
      .limit(filters.limit)
      .offset(filters.offset);
  },
  async findDetail(householdId: string, id: string) {
    const [transaction] = await db
      .select({
        id: transactions.id,
        date: transactions.date,
        type: transactions.type,
        status: transactions.status,
        amountMinor: transactions.amountMinor,
        currency: transactions.currency,
        description: transactions.description,
        isRecurring: transactions.isRecurring,
        isOneOff: transactions.isOneOff,
        voidedAt: transactions.voidedAt,
        createdAt: transactions.createdAt,
        accountId: transactions.accountId,
        accountName: accounts.name,
        categoryId: transactions.categoryId,
        categoryName: categories.name,
      })
      .from(transactions)
      .innerJoin(accounts, eq(transactions.accountId, accounts.id))
      .innerJoin(categories, eq(transactions.categoryId, categories.id))
      .where(
        and(eq(transactions.id, id), eq(transactions.householdId, householdId)),
      );
    if (!transaction) return undefined;
    const audit = await db.query.auditLogs.findMany({
      where: and(
        eq(auditLogs.householdId, householdId),
        eq(auditLogs.entityType, "transaction"),
        eq(auditLogs.entityId, id),
      ),
      orderBy: [asc(auditLogs.createdAt)],
    });
    return { transaction, audit };
  },
  async updatePaid(
    householdId: string,
    actorUserId: string,
    id: string,
    values: UpdatePaidTransaction,
    before: Record<string, unknown>,
  ) {
    const { changeReason, ...changes } = values;
    return db.transaction(async (tx) => {
      const [transaction] = await tx
        .update(transactions)
        .set({ ...changes, updatedAt: new Date() })
        .where(
          and(
            eq(transactions.id, id),
            eq(transactions.householdId, householdId),
            eq(transactions.status, "paid"),
          ),
        )
        .returning();
      if (!transaction) return undefined;
      await tx.insert(auditLogs).values({
        householdId,
        actorUserId,
        action: "update",
        entityType: "transaction",
        entityId: transaction.id,
        details: { reason: changeReason, before },
      });
      return transaction;
    });
  },
  async voidPaid(
    householdId: string,
    actorUserId: string,
    id: string,
    reason: string,
    before: Record<string, unknown>,
  ) {
    return db.transaction(async (tx) => {
      const [transaction] = await tx
        .update(transactions)
        .set({
          status: "cancelled",
          voidedAt: new Date(),
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(transactions.id, id),
            eq(transactions.householdId, householdId),
            eq(transactions.status, "paid"),
          ),
        )
        .returning();
      if (!transaction) return undefined;
      await tx.insert(auditLogs).values({
        householdId,
        actorUserId,
        action: "void",
        entityType: "transaction",
        entityId: transaction.id,
        details: { reason, before },
      });
      return transaction;
    });
  },
  async accountBalance(householdId: string, accountId: string) {
    const [row] = await db
      .select({
        openingBalanceMinor: accounts.openingBalanceMinor,
        incomeMinor: sql<string>`coalesce(sum(case when ${transactions.type} = 'income' then ${transactions.amountMinor} else 0 end), 0)`,
        expenseMinor: sql<string>`coalesce(sum(case when ${transactions.type} = 'expense' then ${transactions.amountMinor} else 0 end), 0)`,
      })
      .from(accounts)
      .leftJoin(
        transactions,
        and(
          eq(transactions.accountId, accounts.id),
          eq(transactions.householdId, householdId),
          eq(transactions.status, "paid"),
        ),
      )
      .where(
        and(eq(accounts.id, accountId), eq(accounts.householdId, householdId)),
      )
      .groupBy(accounts.id);
    if (!row) return undefined;
    return (
      row.openingBalanceMinor +
      Number(row.incomeMinor) -
      Number(row.expenseMinor)
    );
  },
  async categoryTotal(
    householdId: string,
    categoryId: string,
    currency: string,
  ) {
    const [row] = await db
      .select({
        total: sql<string>`coalesce(sum(${transactions.amountMinor}), 0)`,
      })
      .from(transactions)
      .where(
        and(
          eq(transactions.householdId, householdId),
          eq(transactions.categoryId, categoryId),
          eq(transactions.type, "expense"),
          eq(transactions.status, "paid"),
          eq(transactions.currency, currency),
        ),
      );
    return Number(row?.total ?? 0);
  },
};
