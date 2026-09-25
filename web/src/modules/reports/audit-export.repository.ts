import { and, asc, count, desc, eq, gte, lte, type AnyColumn } from "drizzle-orm";
import { db } from "@/db";
import {
  accounts,
  auditLogs,
  categories,
  debts,
  exchangeRates,
  invoices,
  obligations,
  transactions,
  users,
} from "@/db/schema";
import type { AuditReportQuery, FinancialExportQuery } from "./audit-export.schemas";

function startOfDay(value: string) {
  return new Date(`${value}T00:00:00.000Z`);
}

function endOfDay(value: string) {
  return new Date(`${value}T23:59:59.999Z`);
}

export const auditExportRepository = {
  async auditEvents(householdId: string, query: AuditReportQuery) {
    const filters = and(
      eq(auditLogs.householdId, householdId),
      query.from ? gte(auditLogs.createdAt, startOfDay(query.from)) : undefined,
      query.to ? lte(auditLogs.createdAt, endOfDay(query.to)) : undefined,
      query.action ? eq(auditLogs.action, query.action) : undefined,
      query.entityType ? eq(auditLogs.entityType, query.entityType) : undefined,
    );
    const [events, total] = await Promise.all([
      db
        .select({
          id: auditLogs.id,
          action: auditLogs.action,
          entityType: auditLogs.entityType,
          entityId: auditLogs.entityId,
          details: auditLogs.details,
          createdAt: auditLogs.createdAt,
          actorEmail: users.email,
        })
        .from(auditLogs)
        .leftJoin(users, eq(auditLogs.actorUserId, users.id))
        .where(filters)
        .orderBy(desc(auditLogs.createdAt), desc(auditLogs.id))
        .limit(query.pageSize)
        .offset((query.page - 1) * query.pageSize),
      db.select({ value: count() }).from(auditLogs).where(filters),
    ]);
    return { events, total: total[0]?.value ?? 0 };
  },

  async financialRows(householdId: string, range: FinancialExportQuery) {
    const dated = (column: AnyColumn) =>
      and(gte(column, range.from), lte(column, range.to));
    const [transactionRows, obligationRows, invoiceRows, debtRows, rateRows] =
      await Promise.all([
        db
          .select({
            id: transactions.id, date: transactions.date, status: transactions.status,
            currency: transactions.currency, amountMinor: transactions.amountMinor,
            accountId: accounts.id, accountName: accounts.name,
            categoryId: categories.id, categoryName: categories.name,
            description: transactions.description, type: transactions.type,
          })
          .from(transactions)
          .innerJoin(accounts, eq(transactions.accountId, accounts.id))
          .leftJoin(categories, eq(transactions.categoryId, categories.id))
          .where(and(eq(transactions.householdId, householdId), dated(transactions.date)))
          .orderBy(asc(transactions.date), asc(transactions.createdAt)),
        db.query.obligations.findMany({
          where: and(eq(obligations.householdId, householdId), dated(obligations.dueDate)),
          orderBy: [asc(obligations.dueDate), asc(obligations.createdAt)],
        }),
        db.query.invoices.findMany({
          where: and(eq(invoices.householdId, householdId), dated(invoices.serviceDate)),
          orderBy: [asc(invoices.serviceDate), asc(invoices.createdAt)],
        }),
        db.query.debts.findMany({
          where: and(eq(debts.householdId, householdId), dated(debts.incurredDate)),
          orderBy: [asc(debts.incurredDate), asc(debts.createdAt)],
        }),
        db.query.exchangeRates.findMany({
          where: and(eq(exchangeRates.householdId, householdId), dated(exchangeRates.effectiveDate)),
          orderBy: [asc(exchangeRates.effectiveDate), asc(exchangeRates.createdAt)],
        }),
      ]);
    return { transactionRows, obligationRows, invoiceRows, debtRows, rateRows };
  },

  async recordExport(values: { householdId: string; actorUserId: string; range: FinancialExportQuery; rowCount: number }) {
    await db.insert(auditLogs).values({
      householdId: values.householdId,
      actorUserId: values.actorUserId,
      action: "export",
      entityType: "financial_export",
      details: { format: "csv", from: values.range.from, to: values.range.to, rowCount: values.rowCount },
    });
  },
};
