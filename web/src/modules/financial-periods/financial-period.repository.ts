import { and, asc, eq } from "drizzle-orm";
import { db } from "@/db";
import { auditLogs, financialPeriods } from "@/db/schema";

export const financialPeriodRepository = {
  find(householdId: string, periodStart: string) {
    return db.query.financialPeriods.findFirst({
      where: and(
        eq(financialPeriods.householdId, householdId),
        eq(financialPeriods.periodStart, periodStart),
      ),
    });
  },
  findClosed(householdId: string, periodStart: string) {
    return db.query.financialPeriods.findFirst({
      where: and(
        eq(financialPeriods.householdId, householdId),
        eq(financialPeriods.periodStart, periodStart),
        eq(financialPeriods.status, "closed"),
      ),
    });
  },
  history(householdId: string, periodId: string) {
    return db.query.auditLogs.findMany({
      where: and(
        eq(auditLogs.householdId, householdId),
        eq(auditLogs.entityType, "financial_period"),
        eq(auditLogs.entityId, periodId),
      ),
      orderBy: [asc(auditLogs.createdAt)],
    });
  },
  async close(householdId: string, actorUserId: string, periodStart: string) {
    return db.transaction(async (tx) => {
      const [period] = await tx
        .insert(financialPeriods)
        .values({ householdId, periodStart, status: "closed" })
        .onConflictDoUpdate({
          target: [financialPeriods.householdId, financialPeriods.periodStart],
          set: { status: "closed", updatedAt: new Date() },
          where: eq(financialPeriods.status, "open"),
        })
        .returning();
      if (!period) return undefined;
      await tx.insert(auditLogs).values({
        householdId,
        actorUserId,
        action: "close",
        entityType: "financial_period",
        entityId: period.id,
        details: { period: periodStart },
      });
      return period;
    });
  },
  async reopen(
    householdId: string,
    actorUserId: string,
    periodStart: string,
    reason: string,
  ) {
    return db.transaction(async (tx) => {
      const [period] = await tx
        .update(financialPeriods)
        .set({ status: "open", updatedAt: new Date() })
        .where(
          and(
            eq(financialPeriods.householdId, householdId),
            eq(financialPeriods.periodStart, periodStart),
            eq(financialPeriods.status, "closed"),
          ),
        )
        .returning();
      if (!period) return undefined;
      await tx.insert(auditLogs).values({
        householdId,
        actorUserId,
        action: "reopen",
        entityType: "financial_period",
        entityId: period.id,
        details: { period: periodStart, reason },
      });
      return period;
    });
  },
};
