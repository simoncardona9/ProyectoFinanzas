import { asc, eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { debtPayments, debts } from "@/db/schema";

export const debtReportRepository = {
  async listRows(householdId: string) {
    const rows = await db
      .select({
        id: debts.id,
        creditorName: debts.creditorName,
        description: debts.description,
        currency: debts.currency,
        originalAmountMinor: debts.originalAmountMinor,
        remainingAmountMinor: debts.remainingAmountMinor,
        status: debts.status,
        paidAmountMinor: sql<string>`coalesce(sum(${debtPayments.amountMinor}), 0)`,
      })
      .from(debts)
      .leftJoin(debtPayments, eq(debtPayments.debtId, debts.id))
      .where(eq(debts.householdId, householdId))
      .groupBy(debts.id)
      .orderBy(asc(debts.incurredDate), asc(debts.createdAt));
    return rows.map((row) => ({
      ...row,
      paidAmountMinor: Number(row.paidAmountMinor),
    }));
  },
};
