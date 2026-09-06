import { and, asc, eq } from "drizzle-orm";
import { db } from "@/db";
import { auditLogs, debts } from "@/db/schema";
import type { CreateDebt, ListDebts } from "./debt.schemas";

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
    return { debt, audit };
  },
};
