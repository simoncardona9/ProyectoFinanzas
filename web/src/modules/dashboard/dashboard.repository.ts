import { and, eq, gte, lte, sql } from "drizzle-orm";
import { db } from "@/db";
import { transactions } from "@/db/schema";

export const dashboardRepository = {
  async collectedIncome(householdId: string, from: string, to: string) {
    const rows = await db
      .select({
        currency: transactions.currency,
        collectedIncomeMinor: sql<string>`coalesce(sum(${transactions.amountMinor}), 0)`,
        oneOffIncomeMinor: sql<string>`coalesce(sum(case when ${transactions.isOneOff} then ${transactions.amountMinor} else 0 end), 0)`,
      })
      .from(transactions)
      .where(
        and(
          eq(transactions.householdId, householdId),
          eq(transactions.type, "income"),
          eq(transactions.status, "paid"),
          gte(transactions.date, from),
          lte(transactions.date, to),
        ),
      )
      .groupBy(transactions.currency);
    return rows.map((row) => ({
      currency: row.currency,
      collectedIncomeMinor: Number(row.collectedIncomeMinor),
      oneOffIncomeMinor: Number(row.oneOffIncomeMinor),
    }));
  },
  async expectedIncome(householdId: string, from: string, to: string) {
    const rows = await db
      .select({
        currency: transactions.currency,
        expectedIncomeMinor: sql<string>`coalesce(sum(${transactions.amountMinor}), 0)`,
      })
      .from(transactions)
      .where(
        and(
          eq(transactions.householdId, householdId),
          eq(transactions.type, "income"),
          sql`${transactions.status} in ('planned', 'pending')`,
          gte(transactions.date, from),
          lte(transactions.date, to),
        ),
      )
      .groupBy(transactions.currency);
    return rows.map((row) => ({
      currency: row.currency,
      expectedIncomeMinor: Number(row.expectedIncomeMinor),
    }));
  },
};
