import type { FinanceImportBundle } from "./import.schemas";

type Reference = {
  id: string;
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
    resolved?: { accountId?: string; categoryId?: string };
    errors: RowError[];
  }>;
  totals: Record<
    "UYU" | "USD",
    { transactionIncomeMinor: number; transactionExpenseMinor: number }
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

export function buildImportPreview(
  bundle: FinanceImportBundle,
  accounts: Reference[],
  categories: Reference[],
): ImportPreview {
  const totals = {
    UYU: { transactionIncomeMinor: 0, transactionExpenseMinor: 0 },
    USD: { transactionIncomeMinor: 0, transactionExpenseMinor: 0 },
  };
  const rows: ImportPreview["rows"] = [];
  const unsupported = [
    "accounts",
    "categories",
    "obligations",
    "expectedIncome",
  ] as const;
  for (const entity of unsupported) {
    for (let index = 0; index < bundle[entity].length; index++)
      rows.push({
        entity,
        row: index + 1,
        status: "deferred",
        errors: [
          {
            field: entity,
            message:
              "Esta entidad se previsualiza, pero su validación y escritura llegarán en una próxima entrega.",
          },
        ],
      });
  }
  bundle.transactions.forEach((transaction, index) => {
    const errors: RowError[] = [];
    const accountMatches = matches(accounts, transaction.account);
    const categoryMatches = matches(categories, transaction.category);
    const account = accountMatches.length === 1 ? accountMatches[0] : undefined;
    const category =
      categoryMatches.length === 1 ? categoryMatches[0] : undefined;
    if (accountMatches.length !== 1)
      errors.push({
        field: "account",
        message: accountMatches.length
          ? "El nombre de cuenta es ambiguo en este hogar."
          : "No existe esa cuenta en el hogar activo.",
      });
    else if (account && !account.active)
      errors.push({ field: "account", message: "La cuenta está archivada." });
    else if (account && account.currency !== transaction.currency)
      errors.push({
        field: "currency",
        message: "La moneda no coincide con la cuenta.",
      });
    if (categoryMatches.length !== 1)
      errors.push({
        field: "category",
        message: categoryMatches.length
          ? "El nombre de categoría es ambiguo en este hogar."
          : "No existe esa categoría en el hogar activo.",
      });
    else if (category && !category.active)
      errors.push({
        field: "category",
        message: "La categoría está archivada.",
      });
    else if (category && category.kind !== transaction.type)
      errors.push({
        field: "category",
        message: "El tipo de categoría no coincide con el movimiento.",
      });
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
  return {
    rows,
    totals,
    errors: rows.filter((row) => row.status === "invalid").length,
    warnings: rows.some((row) => row.status === "deferred")
      ? ["Las filas diferidas no se pueden confirmar todavía."]
      : [],
  };
}
