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
    resolved?: {
      accountId?: string;
      categoryId?: string;
      parentCategoryId?: string;
    };
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
): ImportPreview {
  const totals = {
    UYU: { transactionIncomeMinor: 0, transactionExpenseMinor: 0 },
    USD: { transactionIncomeMinor: 0, transactionExpenseMinor: 0 },
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

  const unsupported = ["obligations", "expectedIncome"] as const;
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
