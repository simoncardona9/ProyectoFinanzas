import { requireRole } from "@/shared/auth/authorization";
import type { AuthContext } from "@/shared/auth/auth.types";
import { buildFinancialCsv, type FinancialExportRow } from "./audit-export.rules";
import { auditExportRepository } from "./audit-export.repository";
import type { AuditReportQuery, FinancialExportQuery } from "./audit-export.schemas";

export async function getAuditReport(context: AuthContext, query: AuditReportQuery) {
  requireRole(context, ["owner", "accountant"]);
  const result = await auditExportRepository.auditEvents(context.membership.householdId, query);
  return {
    events: result.events,
    meta: { page: query.page, pageSize: query.pageSize, total: result.total },
  };
}

export async function createFinancialCsvExport(context: AuthContext, range: FinancialExportQuery) {
  requireRole(context, ["owner", "editor", "accountant"]);
  const source = await auditExportRepository.financialRows(context.membership.householdId, range);
  const rows: FinancialExportRow[] = [
    ...source.transactionRows.map((row) => ({ record_type: `transaction:${row.type}`, id: row.id, date: row.date, status: row.status, currency: row.currency, amount_minor: row.amountMinor, account_id: row.accountId, account_name: row.accountName, category_id: row.categoryId, category_name: row.categoryName, description: row.description })),
    ...source.obligationRows.map((row) => ({ record_type: "obligation", id: row.id, date: row.dueDate, status: row.status, currency: row.currency, amount_minor: row.originalAmountMinor, category_id: row.categoryId, description: row.description })),
    ...source.invoiceRows.map((row) => ({ record_type: "invoice", id: row.id, date: row.serviceDate, status: row.status, currency: row.currency, amount_minor: row.grossAmountMinor, counterparty: row.clientName, description: row.description })),
    ...source.debtRows.map((row) => ({ record_type: "debt", id: row.id, date: row.incurredDate, status: row.status, currency: row.currency, amount_minor: row.originalAmountMinor, counterparty: row.creditorName, description: row.description })),
    ...source.rateRows.map((row) => ({ record_type: "exchange_rate", id: row.id, date: row.effectiveDate, status: row.kind, currency: `${row.baseCurrency}/${row.quoteCurrency}`, amount_minor: row.rate, counterparty: row.source, description: row.movement })),
  ].sort((left, right) => String(left.date).localeCompare(String(right.date)) || String(left.record_type).localeCompare(String(right.record_type)));
  await auditExportRepository.recordExport({ householdId: context.membership.householdId, actorUserId: context.user.id, range, rowCount: rows.length });
  return { csv: buildFinancialCsv(rows), rowCount: rows.length };
}
