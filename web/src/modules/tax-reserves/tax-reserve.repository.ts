import { and, asc, eq } from "drizzle-orm";
import { db } from "@/db";
import {
  accounts,
  auditLogs,
  taxReserveSettlements,
  taxReserves,
  transactions,
} from "@/db/schema";
import type { SettleTaxReserve } from "./tax-reserve.schemas";

export const taxReserveRepository = {
  find(householdId: string, id: string) {
    return db.query.taxReserves.findFirst({
      where: and(
        eq(taxReserves.id, id),
        eq(taxReserves.householdId, householdId),
      ),
    });
  },
  async findDetail(householdId: string, id: string) {
    const reserve = await this.find(householdId, id);
    if (!reserve) return undefined;
    const settlements = await db
      .select({
        id: taxReserveSettlements.id,
        amountMinor: taxReserveSettlements.amountMinor,
        reference: taxReserveSettlements.reference,
        transactionId: transactions.id,
        paidDate: transactions.date,
        accountId: accounts.id,
        accountName: accounts.name,
      })
      .from(taxReserveSettlements)
      .innerJoin(
        transactions,
        eq(taxReserveSettlements.transactionId, transactions.id),
      )
      .innerJoin(accounts, eq(transactions.accountId, accounts.id))
      .where(eq(taxReserveSettlements.taxReserveId, id))
      .orderBy(asc(transactions.date), asc(taxReserveSettlements.createdAt));
    return { reserve, settlements };
  },
  async settle(
    householdId: string,
    actorUserId: string,
    reserve: typeof taxReserves.$inferSelect,
    values: SettleTaxReserve,
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
          currency: reserve.currency,
          accountId: values.accountId,
          categoryId: null,
          description: `Pago de IVA: ${values.reference}`,
          isRecurring: false,
          isOneOff: false,
        })
        .returning();
      const [settlement] = await tx
        .insert(taxReserveSettlements)
        .values({
          taxReserveId: reserve.id,
          transactionId: transaction.id,
          amountMinor: values.amountMinor,
          reference: values.reference,
        })
        .returning();
      const remainingAmountMinor =
        reserve.remainingAmountMinor - values.amountMinor;
      const [updated] = await tx
        .update(taxReserves)
        .set({
          remainingAmountMinor,
          status: remainingAmountMinor === 0 ? "settled" : "partially_settled",
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(taxReserves.id, reserve.id),
            eq(taxReserves.householdId, householdId),
            eq(taxReserves.remainingAmountMinor, reserve.remainingAmountMinor),
            eq(taxReserves.status, reserve.status),
          ),
        )
        .returning();
      if (!updated) throw new Error("Concurrent tax reserve settlement.");
      await tx.insert(auditLogs).values([
        {
          householdId,
          actorUserId,
          action: "create",
          entityType: "transaction",
          entityId: transaction.id,
          details: { taxReserveId: reserve.id, settlementId: settlement.id },
        },
        {
          householdId,
          actorUserId,
          action: "settlement",
          entityType: "tax_reserve",
          entityId: reserve.id,
          details: {
            amountMinor: values.amountMinor,
            transactionId: transaction.id,
            settlementId: settlement.id,
            reference: values.reference,
          },
        },
      ]);
      return { reserve: updated, settlement, transaction };
    });
  },
};
