import type { FinanceImportBundle } from "./import.schemas";
import { calculateCollectionIvaReserve, calculateInvoiceIva } from "@/modules/invoices/invoice.rules";

type Reference = {
  id?: string;
  name: string;
  currency?: string;
  kind?: string;
  active: boolean;
};
type RowError = { field: string; message: string };

export type ImportPreview = {
  rows: Array<{
    entity: string;
    row: number;
    status: "valid" | "invalid" | "deferred";
    resolved?: {
      accountId?: string;
      categoryId?: string;
      parentCategoryId?: string;
    };
    errors: RowError[];
  }>;
  totals: Record<
    "UYU" | "USD",
    {
      transactionIncomeMinor: number;
      transactionExpenseMinor: number;
      obligationMinor: number;
      expectedIncomeMinor: number;
      debtPaymentMinor: number;
      invoiceGrossMinor: number;
      invoiceCollectionMinor: number;
      ivaReserveMinor: number;
    }
  >;
  errors: number;
  warnings: string[];
};

function matches(rows: Reference[], name: string) {
  return rows.filter(
    (row) =>
      row.name.localeCompare(name, "es", { sensitivity: "accent" }) === 0,
  );
}

function nameKey(name: string) {
  return name
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLocaleLowerCase("es");
}

function duplicateNames(names: string[]) {
  const seen = new Set<string>();
  const duplicates = new Set<string>();
  for (const name of names) {
    const key = nameKey(name);
    if (seen.has(key)) duplicates.add(key);
    seen.add(key);
  }
  return duplicates;
}

export function buildImportPreview(
  bundle: FinanceImportBundle,
  accounts: Reference[],
  categories: Reference[],
  existingRateKeys: string[] = [],
): ImportPreview {
  const totals = {
    UYU: {
      transactionIncomeMinor: 0,
      transactionExpenseMinor: 0,
      obligationMinor: 0,
      expectedIncomeMinor: 0,
      debtPaymentMinor: 0,
      invoiceGrossMinor: 0,
      invoiceCollectionMinor: 0,
      ivaReserveMinor: 0,
    },
    USD: {
      transactionIncomeMinor: 0,
      transactionExpenseMinor: 0,
      obligationMinor: 0,
      expectedIncomeMinor: 0,
      debtPaymentMinor: 0,
      invoiceGrossMinor: 0,
      invoiceCollectionMinor: 0,
      ivaReserveMinor: 0,
    },
  };
  const rows: ImportPreview["rows"] = [];
  const accountDuplicateNames = duplicateNames(
    bundle.accounts.map((row) => row.name),
  );
  bundle.accounts.forEach((account, index) => {
    const errors: RowError[] = [];
    const existing = matches(accounts, account.name);
    if (accountDuplicateNames.has(nameKey(account.name)))
      errors.push({
        field: "name",
        message: "El nombre de cuenta se repite en el paquete.",
      });
    if (existing.length)
      errors.push({
        field: "name",
        message: "Ya existe una cuenta con ese nombre en el hogar activo.",
      });
    rows.push({
      entity: "accounts",
      row: index + 1,
      status: errors.length ? "invalid" : "valid",
      errors,
    });
  });

  const categoryDuplicateNames = duplicateNames(
    bundle.categories.map((row) => row.name),
  );
  const categoryRowsByName = new Map(
    bundle.categories.map((category, index) => [
      nameKey(category.name),
      { category, index },
    ]),
  );
  bundle.categories.forEach((category, index) => {
    const errors: RowError[] = [];
    const existing = matches(categories, category.name);
    const stagedParent = category.parent
      ? categoryRowsByName.get(nameKey(category.parent))
      : undefined;
    const existingParents = category.parent
      ? matches(categories, category.parent)
      : [];
    if (categoryDuplicateNames.has(nameKey(category.name)))
      errors.push({
        field: "name",
        message: "El nombre de categoría se repite en el paquete.",
      });
    if (existing.length)
      errors.push({
        field: "name",
        message: "Ya existe una categoría con ese nombre en el hogar activo.",
      });
    if (category.parent) {
      if (nameKey(category.parent) === nameKey(category.name))
        errors.push({
          field: "parent",
          message: "Una categoría no puede ser su propia superior.",
        });
      if (stagedParent) {
        if (stagedParent.index >= index)
          errors.push({
            field: "parent",
            message: "La categoría superior debe aparecer antes que su hija.",
          });
        if (stagedParent.category.kind !== category.kind)
          errors.push({
            field: "parent",
            message: "La categoría superior debe tener el mismo tipo.",
          });
      } else if (existingParents.length !== 1) {
        errors.push({
          field: "parent",
          message: existingParents.length
            ? "El nombre de categoría superior es ambiguo."
            : "No existe la categoría superior en el hogar activo ni antes en el paquete.",
        });
      } else if (
        !existingParents[0].active ||
        existingParents[0].kind !== category.kind
      ) {
        errors.push({
          field: "parent",
          message:
            "La categoría superior debe estar activa y tener el mismo tipo.",
        });
      }
    }
    rows.push({
      entity: "categories",
      row: index + 1,
      status: errors.length ? "invalid" : "valid",
      resolved:
        !errors.length && category.parent && !stagedParent
          ? { parentCategoryId: existingParents[0].id }
          : undefined,
      errors,
    });
  });

  const stagedAccounts = bundle.accounts.map((row) => ({
    id: undefined,
    name: row.name,
    currency: row.currency,
    active: true,
  }));
  const stagedCategories = bundle.categories.map((row) => ({
    id: undefined,
    name: row.name,
    kind: row.kind,
    active: true,
  }));
  const resolvedAccounts = [...accounts, ...stagedAccounts];
  const resolvedCategories = [...categories, ...stagedCategories];

  function resolveAccount(name: string, currency: string, errors: RowError[]) {
    const candidates = matches(resolvedAccounts, name);
    const account = candidates.length === 1 ? candidates[0] : undefined;
    if (candidates.length !== 1)
      errors.push({
        field: "account",
        message: candidates.length
          ? "El nombre de cuenta es ambiguo en este hogar o paquete."
          : "No existe esa cuenta en el hogar activo ni en el paquete.",
      });
    else if (!account?.active)
      errors.push({ field: "account", message: "La cuenta está archivada." });
    else if (account.currency !== currency)
      errors.push({
        field: "currency",
        message: "La moneda no coincide con la cuenta.",
      });
    return account;
  }

  function resolveCategory(name: string, kind: string, errors: RowError[]) {
    const candidates = matches(resolvedCategories, name);
    const category = candidates.length === 1 ? candidates[0] : undefined;
    if (candidates.length !== 1)
      errors.push({
        field: "category",
        message: candidates.length
          ? "El nombre de categoría es ambiguo en este hogar o paquete."
          : "No existe esa categoría en el hogar activo ni en el paquete.",
      });
    else if (!category?.active)
      errors.push({
        field: "category",
        message: "La categoría está archivada.",
      });
    else if (category.kind !== kind)
      errors.push({
        field: "category",
        message: "El tipo de categoría no coincide con el movimiento.",
      });
    return category;
  }

  bundle.transactions.forEach((transaction, index) => {
    const errors: RowError[] = [];
    const account = resolveAccount(
      transaction.account,
      transaction.currency,
      errors,
    );
    const category = resolveCategory(
      transaction.category,
      transaction.type,
      errors,
    );
    if (!errors.length) {
      if (transaction.type === "income")
        totals[transaction.currency].transactionIncomeMinor +=
          transaction.amountMinor;
      else
        totals[transaction.currency].transactionExpenseMinor +=
          transaction.amountMinor;
    }
    rows.push({
      entity: "transactions",
      row: index + 1,
      status: errors.length ? "invalid" : "valid",
      resolved:
        account && category
          ? { accountId: account.id, categoryId: category.id }
          : undefined,
      errors,
    });
  });
  bundle.obligations.forEach((obligation, index) => {
    const errors: RowError[] = [];
    const category = resolveCategory(obligation.category, "expense", errors);
    if (!errors.length)
      totals[obligation.currency].obligationMinor += obligation.amountMinor;
    rows.push({
      entity: "obligations",
      row: index + 1,
      status: errors.length ? "invalid" : "valid",
      resolved: category?.id ? { categoryId: category.id } : undefined,
      errors,
    });
  });
  bundle.expectedIncome.forEach((income, index) => {
    const errors: RowError[] = [];
    const account = resolveAccount(income.account, income.currency, errors);
    const category = resolveCategory(income.category, "income", errors);
    if (!errors.length)
      totals[income.currency].expectedIncomeMinor += income.amountMinor;
    rows.push({
      entity: "expectedIncome",
      row: index + 1,
      status: errors.length ? "invalid" : "valid",
      resolved:
        account?.id && category?.id
          ? { accountId: account.id, categoryId: category.id }
          : undefined,
      errors,
    });
  });
  const references = (rows: Array<{ reference: string }>) =>
    duplicateNames(rows.map((row) => row.reference));
  const debtDuplicates = references(bundle.debts);
  const debtRows = new Map(bundle.debts.map((row) => [nameKey(row.reference), row]));
  bundle.debts.forEach((debt, index) => {
    const errors: RowError[] = [];
    if (debtDuplicates.has(nameKey(debt.reference)))
      errors.push({ field: "reference", message: "La referencia de deuda se repite en el paquete." });
    rows.push({ entity: "debts", row: index + 1, status: errors.length ? "invalid" : "valid", errors });
  });
  const debtPaid = new Map<string, number>();
  bundle.debtPayments.forEach((payment, index) => {
    const errors: RowError[] = [];
    const debt = debtRows.get(nameKey(payment.debt));
    if (!debt) errors.push({ field: "debt", message: "La referencia de deuda no existe en el paquete." });
    const account = resolveAccount(payment.account, debt?.currency ?? "", errors);
    const paid = (debtPaid.get(nameKey(payment.debt)) ?? 0) + payment.amountMinor;
    debtPaid.set(nameKey(payment.debt), paid);
    if (debt && paid > debt.amountMinor)
      errors.push({ field: "amountMinor", message: "Los pagos superan el saldo original de la deuda." });
    if (!errors.length && debt) totals[debt.currency as "UYU" | "USD"].debtPaymentMinor += payment.amountMinor;
    rows.push({ entity: "debtPayments", row: index + 1, status: errors.length ? "invalid" : "valid", resolved: account?.id ? { accountId: account.id } : undefined, errors });
  });
  const invoiceDuplicates = references(bundle.invoices);
  const invoiceRows = new Map(bundle.invoices.map((row) => [nameKey(row.reference), row]));
  bundle.invoices.forEach((invoice, index) => {
    const errors: RowError[] = [];
    if (invoiceDuplicates.has(nameKey(invoice.reference))) errors.push({ field: "reference", message: "La referencia de factura se repite en el paquete." });
    if (invoice.dueDate < invoice.serviceDate) errors.push({ field: "dueDate", message: "El vencimiento no puede ser anterior al servicio." });
    if (!errors.length) totals[invoice.currency].invoiceGrossMinor += invoice.grossAmountMinor;
    rows.push({ entity: "invoices", row: index + 1, status: errors.length ? "invalid" : "valid", errors });
  });
  const collectionDuplicates = references(bundle.invoiceCollections);
  const collectionsByReference = new Map(bundle.invoiceCollections.map((row) => [nameKey(row.reference), row]));
  const reserveCollectionDuplicates = duplicateNames(
    bundle.ivaReserves.map((row) => row.collection),
  );
  const reserveCollections = new Set(
    bundle.ivaReserves.map((row) => nameKey(row.collection)),
  );
  const collected = new Map<string, number>();
  bundle.invoiceCollections.forEach((collection, index) => {
    const errors: RowError[] = [];
    const invoice = invoiceRows.get(nameKey(collection.invoice));
    if (collectionDuplicates.has(nameKey(collection.reference))) errors.push({ field: "reference", message: "La referencia de cobranza se repite en el paquete." });
    if (!invoice) errors.push({ field: "invoice", message: "La referencia de factura no existe en el paquete." });
    if (invoice && !invoice.sentDate) errors.push({ field: "invoice", message: "Una factura cobrada debe declarar sentDate." });
    const account = resolveAccount(collection.account, invoice?.currency ?? "", errors);
    const totalCollected = (collected.get(nameKey(collection.invoice)) ?? 0) + collection.amountMinor;
    collected.set(nameKey(collection.invoice), totalCollected);
    if (invoice && totalCollected > invoice.grossAmountMinor) errors.push({ field: "amountMinor", message: "Las cobranzas superan el total de la factura." });
    if (!reserveCollections.has(nameKey(collection.reference)))
      errors.push({ field: "ivaReserve", message: "Cada cobranza debe incluir su reserva IVA vinculada." });
    if (!errors.length && invoice) totals[invoice.currency].invoiceCollectionMinor += collection.amountMinor;
    rows.push({ entity: "invoiceCollections", row: index + 1, status: errors.length ? "invalid" : "valid", resolved: account?.id ? { accountId: account.id } : undefined, errors });
  });
  const collectionAmounts = new Map<string, number>();
  bundle.ivaReserves.forEach((reserve, index) => {
    const errors: RowError[] = [];
    const collection = collectionsByReference.get(nameKey(reserve.collection));
    const invoice = collection && invoiceRows.get(nameKey(collection.invoice));
    if (!collection || !invoice) errors.push({ field: "collection", message: "La cobranza de IVA no existe en el paquete." });
    if (reserveCollectionDuplicates.has(nameKey(reserve.collection)))
      errors.push({ field: "collection", message: "La cobranza tiene más de una reserva IVA." });
    const previous = collection && invoice ? collectionAmounts.get(nameKey(collection.invoice)) ?? 0 : 0;
    const expected = collection && invoice ? calculateCollectionIvaReserve({ grossAmountMinor: invoice.grossAmountMinor, ivaAmountMinor: calculateInvoiceIva(invoice.grossAmountMinor, invoice.ivaRateBasisPoints).ivaAmountMinor, remainingAmountMinor: invoice.grossAmountMinor - previous }, collection.amountMinor) : 0;
    if (collection && invoice) collectionAmounts.set(nameKey(collection.invoice), previous + collection.amountMinor);
    if (!errors.length && reserve.amountMinor !== expected) errors.push({ field: "amountMinor", message: "La reserva IVA no coincide con la asignación calculada de la cobranza." });
    if (!errors.length && invoice) totals[invoice.currency].ivaReserveMinor += reserve.amountMinor;
    rows.push({ entity: "ivaReserves", row: index + 1, status: errors.length ? "invalid" : "valid", errors });
  });
  const rateKeys = new Set<string>();
  bundle.exchangeRates.forEach((rate, index) => {
    const errors: RowError[] = [];
    const key = [rate.baseCurrency, rate.quoteCurrency, rate.effectiveDate, rate.kind, rate.movement].join(":");
    if (rateKeys.has(key) || existingRateKeys.includes(key)) errors.push({ field: "effectiveDate", message: "La tasa se repite para el par, fecha, tipo y movimiento." });
    rateKeys.add(key);
    rows.push({ entity: "exchangeRates", row: index + 1, status: errors.length ? "invalid" : "valid", errors });
  });
  return {
    rows,
    totals,
    errors: rows.filter((row) => row.status === "invalid").length,
    warnings: [],
  };
}
