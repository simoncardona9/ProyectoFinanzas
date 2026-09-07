import { and, asc, eq, gte, lte } from "drizzle-orm";
import { db } from "@/db";
import { auditLogs, invoices } from "@/db/schema";
import type { CreateInvoice, ListInvoices } from "./invoice.schemas";

export const invoiceRepository = {
  async create(
    householdId: string,
    actorUserId: string,
    values: CreateInvoice,
    calculated: { ivaAmountMinor: number; netAmountMinor: number },
  ) {
    return db.transaction(async (tx) => {
      const [invoice] = await tx
        .insert(invoices)
        .values({ ...values, householdId, ...calculated })
        .returning();
      await tx.insert(auditLogs).values({
        householdId,
        actorUserId,
        action: "create",
        entityType: "invoice",
        entityId: invoice.id,
        details: {
          grossAmountMinor: invoice.grossAmountMinor,
          ivaRateBasisPoints: invoice.ivaRateBasisPoints,
          ivaAmountMinor: invoice.ivaAmountMinor,
          currency: invoice.currency,
        },
      });
      return invoice;
    });
  },
  list(householdId: string, filters: ListInvoices) {
    return db
      .select()
      .from(invoices)
      .where(
        and(
          eq(invoices.householdId, householdId),
          filters.status ? eq(invoices.status, filters.status) : undefined,
          filters.currency
            ? eq(invoices.currency, filters.currency)
            : undefined,
          filters.dueFrom ? gte(invoices.dueDate, filters.dueFrom) : undefined,
          filters.dueTo ? lte(invoices.dueDate, filters.dueTo) : undefined,
        ),
      )
      .orderBy(asc(invoices.dueDate), asc(invoices.createdAt))
      .limit(filters.limit)
      .offset(filters.offset);
  },
};
