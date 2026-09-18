import type { CategoryTaxReportQuery } from "./category-tax-report.schemas";

type ExpenseTransaction = {
  id: string;
  date: string;
  amountMinor: number;
  currency: "UYU" | "USD";
  description: string;
  categoryId: string;
  categoryName: string;
};

type Invoice = {
  id: string;
  serviceDate: string;
  currency: "UYU" | "USD";
  grossAmountMinor: number;
  netAmountMinor: number;
  ivaAmountMinor: number;
};

type TaxMovement = {
  id: string;
  invoiceId: string;
  date: string;
  currency: "UYU" | "USD";
  amountMinor: number;
};

function emptyTaxTotals() {
  return {
    invoicedGrossMinor: 0,
    invoicedNetMinor: 0,
    invoicedIvaMinor: 0,
    collectedGrossMinor: 0,
    reservedIvaMinor: 0,
    settledIvaMinor: 0,
  };
}

function categoryGroup(
  transaction: ExpenseTransaction,
  groupBy: CategoryTaxReportQuery["groupBy"],
) {
  if (groupBy === "category")
    return { key: transaction.categoryId, label: transaction.categoryName };
  if (groupBy === "month")
    return {
      key: transaction.date.slice(0, 7),
      label: transaction.date.slice(0, 7),
    };
  return {
    key: transaction.date.slice(0, 4),
    label: transaction.date.slice(0, 4),
  };
}

export function buildCategoryTaxReport(
  expenses: ExpenseTransaction[],
  invoices: Invoice[],
  collections: TaxMovement[],
  reserves: TaxMovement[],
  settlements: TaxMovement[],
  range: CategoryTaxReportQuery,
) {
  const categoryGroups = new Map<
    string,
    {
      key: string;
      label: string;
      currency: "UYU" | "USD";
      totalMinor: number;
      transactions: Array<ExpenseTransaction & { href: string }>;
    }
  >();
  for (const transaction of expenses) {
    const group = categoryGroup(transaction, range.groupBy);
    const key = `${transaction.currency}:${group.key}`;
    const row = categoryGroups.get(key) ?? {
      ...group,
      currency: transaction.currency,
      totalMinor: 0,
      transactions: [],
    };
    row.totalMinor += transaction.amountMinor;
    row.transactions.push({
      ...transaction,
      href: `/transactions/${transaction.id}`,
    });
    categoryGroups.set(key, row);
  }

  const taxTotalsByCurrency = { UYU: emptyTaxTotals(), USD: emptyTaxTotals() };
  for (const invoice of invoices) {
    const totals = taxTotalsByCurrency[invoice.currency];
    totals.invoicedGrossMinor += invoice.grossAmountMinor;
    totals.invoicedNetMinor += invoice.netAmountMinor;
    totals.invoicedIvaMinor += invoice.ivaAmountMinor;
  }
  for (const collection of collections)
    taxTotalsByCurrency[collection.currency].collectedGrossMinor +=
      collection.amountMinor;
  for (const reserve of reserves)
    taxTotalsByCurrency[reserve.currency].reservedIvaMinor +=
      reserve.amountMinor;
  for (const settlement of settlements)
    taxTotalsByCurrency[settlement.currency].settledIvaMinor +=
      settlement.amountMinor;

  return {
    range,
    categoryGrouping: range.groupBy,
    categoryRows: [...categoryGroups.values()].sort((a, b) =>
      a.currency === b.currency
        ? a.label.localeCompare(b.label, "es")
        : a.currency.localeCompare(b.currency),
    ),
    taxTotalsByCurrency,
    taxSources: [
      ...invoices.map((invoice) => ({
        id: invoice.id,
        kind: "invoice" as const,
        date: invoice.serviceDate,
        currency: invoice.currency,
        amountMinor: invoice.grossAmountMinor,
        href: "/invoices/" + invoice.id,
      })),
      ...collections.map((movement) => ({
        id: movement.id,
        kind: "collection" as const,
        date: movement.date,
        currency: movement.currency,
        amountMinor: movement.amountMinor,
        href: "/invoices/" + movement.invoiceId,
      })),
      ...reserves.map((movement) => ({
        id: movement.id,
        kind: "reserve" as const,
        date: movement.date,
        currency: movement.currency,
        amountMinor: movement.amountMinor,
        href: "/invoices/" + movement.invoiceId,
      })),
      ...settlements.map((movement) => ({
        id: movement.id,
        kind: "settlement" as const,
        date: movement.date,
        currency: movement.currency,
        amountMinor: movement.amountMinor,
        href: "/invoices/" + movement.invoiceId,
      })),
    ].sort((a, b) => a.date.localeCompare(b.date)),
  };
}
