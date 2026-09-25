import { and, asc, eq, lte } from "drizzle-orm";
import { db } from "@/db";
import { accounts, transactions } from "@/db/schema";

export const accountCashFlowReportRepository = {
  async accountsAndPaidTransactions(householdId: string, to: string) {
    const [accountRows, transactionRows] = await Promise.all([
      db.query.accounts.findMany({
        where: eq(accounts.householdId, householdId),
        orderBy: [asc(accounts.currency), asc(accounts.name)],
      }),
      db
        .select({
          id: transactions.id,
          accountId: transactions.accountId,
          date: transactions.date,
          type: transactions.type,
          amountMinor: transactions.amountMinor,
          description: transactions.description,
        })
        .from(transactions)
        .where(
          and(
            eq(transactions.householdId, householdId),
            eq(transactions.status, "paid"),
            lte(transactions.date, to),
          ),
        )
        .orderBy(asc(transactions.date), asc(transactions.createdAt)),
    ]);
    return { accounts: accountRows, transactions: transactionRows };
  },
};
