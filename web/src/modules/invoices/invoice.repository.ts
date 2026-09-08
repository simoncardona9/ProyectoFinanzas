import { and, asc, eq, gte, lte } from "drizzle-orm";
import { db } from "@/db";
import {
  accounts,
  auditLogs,
  invoiceCollections,
  invoices,
  taxReserves,
  transactions,
} from "@/db/schema";
import type {
  CreateInvoice,
  CreateInvoiceCollection,
  ListInvoices,
} from "./invoice.schemas";

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
        .values({
          ...values,
          householdId,
          ...calculated,
          remainingAmountMinor: values.grossAmountMinor,
        })
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
  find(householdId: string, id: string) {
    return db.query.invoices.findFirst({
      where: and(eq(invoices.id, id), eq(invoices.householdId, householdId)),
    });
  },
  async findDetail(householdId: string, id: string) {
    const invoice = await this.find(householdId, id);
    if (!invoice) return undefined;
    const [audit, collections] = await Promise.all([
      db.query.auditLogs.findMany({
        where: and(
          eq(auditLogs.householdId, householdId),
          eq(auditLogs.entityType, "invoice"),
          eq(auditLogs.entityId, id),
        ),
        orderBy: [asc(auditLogs.createdAt)],
      }),
      db
        .select({
          id: invoiceCollections.id,
          amountMinor: invoiceCollections.amountMinor,
          transactionId: transactions.id,
          paidDate: transactions.date,
          description: transactions.description,
          accountId: accounts.id,
          accountName: accounts.name,
          reserveId: taxReserves.id,
          reserveAmountMinor: taxReserves.originalAmountMinor,
          reserveRemainingAmountMinor: taxReserves.remainingAmountMinor,
          reserveStatus: taxReserves.status,
        })
        .from(invoiceCollections)
        .innerJoin(
          transactions,
          eq(invoiceCollections.transactionId, transactions.id),
        )
        .innerJoin(accounts, eq(transactions.accountId, accounts.id))
        .leftJoin(
          taxReserves,
          eq(taxReserves.invoiceCollectionId, invoiceCollections.id),
        )
        .where(eq(invoiceCollections.invoiceId, id))
        .orderBy(asc(transactions.date), asc(invoiceCollections.createdAt)),
    ]);
    return { invoice, audit, collections };
  },
  async send(
    householdId: string,
    actorUserId: string,
    invoice: typeof invoices.$inferSelect,
    sentDate: string,
  ) {
    return db.transaction(async (tx) => {
      const [updated] = await tx
        .update(invoices)
        .set({ status: "sent", sentDate, updatedAt: new Date() })
        .where(
          and(
            eq(invoices.id, invoice.id),
            eq(invoices.householdId, householdId),
            eq(invoices.status, "draft"),
          ),
        )
        .returning();
      if (!updated) return undefined;
      await tx.insert(auditLogs).values({
        householdId,
        actorUserId,
        action: "send",
        entityType: "invoice",
        entityId: invoice.id,
        details: { sentDate },
      });
      return updated;
    });
  },
  async collect(
    householdId: string,
    actorUserId: string,
    invoice: typeof invoices.$inferSelect,
    values: CreateInvoiceCollection,
    reserveAmountMinor: number,
  ) {
    return db.transaction(async (tx) => {
      const [transaction] = await tx
        .insert(transactions)
        .values({
          householdId,
          date: values.paidDate,
          type: "income",
          status: "paid",
          amountMinor: values.amountMinor,
          currency: invoice.currency,
          accountId: values.accountId,
          categoryId: null,
          description: values.description ?? invoice.description,
          isRecurring: false,
          isOneOff: false,
        })
        .returning();
      const [collection] = await tx
        .insert(invoiceCollections)
        .values({
          invoiceId: invoice.id,
          transactionId: transaction.id,
          amountMinor: values.amountMinor,
        })
        .returning();
      const [reserve] = await tx
        .insert(taxReserves)
        .values({
          householdId,
          invoiceId: invoice.id,
          invoiceCollectionId: collection.id,
          originalAmountMinor: reserveAmountMinor,
          remainingAmountMinor: reserveAmountMinor,
          currency: invoice.currency,
        })
        .returning();
      const remainingAmountMinor =
        invoice.remainingAmountMinor - values.amountMinor;
      const [updated] = await tx
        .update(invoices)
        .set({
          remainingAmountMinor,
          status:
            remainingAmountMinor === 0 ? "collected" : "partially_collected",
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(invoices.id, invoice.id),
            eq(invoices.householdId, householdId),
            eq(invoices.remainingAmountMinor, invoice.remainingAmountMinor),
            eq(invoices.status, invoice.status),
          ),
        )
        .returning();
      if (!updated) throw new Error("Concurrent invoice collection.");
      await tx.insert(auditLogs).values({
        householdId,
        actorUserId,
        action: "collection",
        entityType: "invoice",
        entityId: invoice.id,
        details: {
          amountMinor: values.amountMinor,
          transactionId: transaction.id,
          accountId: values.accountId,
          reserveId: reserve.id,
          reserveAmountMinor,
        },
      });
      return { invoice: updated, transaction, collection, reserve };
    });
  },
  async cancel(
    householdId: string,
    actorUserId: string,
    invoice: typeof invoices.$inferSelect,
    reason: string,
  ) {
    return db.transaction(async (tx) => {
      const [updated] = await tx
        .update(invoices)
        .set({ status: "cancelled", updatedAt: new Date() })
        .where(
          and(
            eq(invoices.id, invoice.id),
            eq(invoices.householdId, householdId),
            eq(invoices.status, invoice.status),
          ),
        )
        .returning();
      if (!updated) return undefined;
      await tx.insert(auditLogs).values({
        householdId,
        actorUserId,
        action: "cancel",
        entityType: "invoice",
        entityId: invoice.id,
        details: { reason },
      });
      return updated;
    });
  },
};
