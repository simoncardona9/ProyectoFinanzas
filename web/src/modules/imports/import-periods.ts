import type { FinanceImportBundle } from "./import.schemas";

/** Dates whose historical financial effects are introduced by an import commit. */
export function importAffectedFinancialDates(bundle: FinanceImportBundle) {
  return [
    ...bundle.transactions.map((row) => row.date),
    ...bundle.obligations.map((row) => row.dueDate),
    ...bundle.expectedIncome.map((row) => row.date),
    ...bundle.debts.map((row) => row.incurredDate),
    ...bundle.debtPayments.map((row) => row.paidDate),
    ...bundle.invoices.map((row) => row.serviceDate),
    ...bundle.invoiceCollections.map((row) => row.paidDate),
  ];
}
