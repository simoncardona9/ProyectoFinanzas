import { and, asc, eq } from "drizzle-orm";
import { db } from "@/db";
import {
  accounts,
  auditLogs,
  debtPayments,
  debts,
  transactions,
} from "@/db/schema";
import type { CreateDebt, CreateDebtPayment, ListDebts } from "./debt.schemas";

export const debtRepository = {
  async create(householdId: string, actorUserId: string, values: CreateDebt) {
    return db.transaction(async (tx) => {
      const [debt] = await tx
        .insert(debts)
        .values({
          householdId,
          creditorName: values.creditorName,
          description: values.description,
          originalAmountMinor: values.amountMinor,
          remainingAmountMinor: values.amountMinor,
          currency: values.currency,
          incurredDate: values.incurredDate,
        })
        .returning();
      await tx.insert(auditLogs).values({
        householdId,
        actorUserId,
        action: "create",
        entityType: "debt",
        entityId: debt.id,
        details: {
          originalAmountMinor: values.amountMinor,
          currency: values.currency,
        },
      });
      return debt;
    });
  },
  list(householdId: string, filters: ListDebts) {
    return db
      .select()
      .from(debts)
      .where(
        and(
          eq(debts.householdId, householdId),
          filters.status ? eq(debts.status, filters.status) : undefined,
          filters.currency ? eq(debts.currency, filters.currency) : undefined,
        ),
      )
      .orderBy(asc(debts.incurredDate), asc(debts.createdAt))
      .limit(filters.limit)
      .offset(filters.offset);
  },
  find(householdId: string, id: string) {
    return db.query.debts.findFirst({
      where: and(eq(debts.id, id), eq(debts.householdId, householdId)),
    });
  },
  async findDetail(householdId: string, id: string) {
    const debt = await this.find(householdId, id);
    if (!debt) return undefined;
    const audit = await db.query.auditLogs.findMany({
      where: and(
        eq(auditLogs.householdId, householdId),
        eq(auditLogs.entityType, "debt"),
        eq(auditLogs.entityId, id),
      ),
      orderBy: asc(auditLogs.createdAt),
    });
    const payments = await db
      .select({
        id: debtPayments.id,
        amountMinor: debtPayments.amountMinor,
        transactionId: transactions.id,
        paidDate: transactions.date,
        description: transactions.description,
        accountId: accounts.id,
        accountName: accounts.name,
      })
      .from(debtPayments)
      .innerJoin(transactions, eq(debtPayments.transactionId, transactions.id))
      .innerJoin(accounts, eq(transactions.accountId, accounts.id))
      .where(eq(debtPayments.debtId, id))
      .orderBy(asc(transactions.date), asc(debtPayments.createdAt));
    return { debt, audit, payments };
  },
  async pay(
    householdId: string,
    actorUserId: string,
    debt: typeof debts.$inferSelect,
    values: CreateDebtPayment,
  ) {
    return db.transaction(async (tx) => {
      const [transaction] = await tx
        .insert(transactions)
        .values({
          householdId,
          date: values.paidDate,
          type: "debt_payment",
          status: "paid",
          amountMinor: values.amountMinor,
          currency: debt.currency,
          accountId: values.accountId,
          categoryId: null,
          description: values.description ?? debt.description,
          isRecurring: false,
          isOneOff: false,
        })
        .returning();
      await tx.insert(debtPayments).values({
        debtId: debt.id,
        transactionId: transaction.id,
        amountMinor: values.amountMinor,
      });
      const remainingAmountMinor =
        debt.remainingAmountMinor - values.amountMinor;
      const [updated] = await tx
        .update(debts)
        .set({
          remainingAmountMinor,
          status: remainingAmountMinor === 0 ? "paid" : "active",
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(debts.id, debt.id),
            eq(debts.householdId, householdId),
            eq(debts.status, "active"),
            eq(debts.remainingAmountMinor, debt.remainingAmountMinor),
          ),
        )
        .returning();
      if (!updated) throw new Error("Concurrent debt payment.");
      await tx.insert(auditLogs).values({
        householdId,
        actorUserId,
        action: "payment",
        entityType: "debt",
        entityId: debt.id,
        details: {
          amountMinor: values.amountMinor,
          transactionId: transaction.id,
          accountId: values.accountId,
        },
      });
      return { debt: updated, transaction };
    });
  },
};
