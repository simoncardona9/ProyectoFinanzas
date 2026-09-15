import { describe, expect, it } from "vitest";
import { financeImportBundleSchema } from "./import.schemas";
import { buildImportPreview } from "./import.rules";

const bundle = financeImportBundleSchema.parse({
  version: "finance-import/v1",
  source: { type: "json_paste" },
  transactions: [
    {
      date: "2026-09-08",
      type: "expense",
      amountMinor: 1250,
      currency: "UYU",
      account: "Banco",
      category: "Hogar",
      description: "Compra",
    },
  ],
});

describe("buildImportPreview", () => {
  it("resolves active household-local names and keeps UYU totals separate", () => {
    const preview = buildImportPreview(
      bundle,
      [{ id: "a", name: "Banco", currency: "UYU", active: true }],
      [{ id: "c", name: "Hogar", kind: "expense", active: true }],
    );
    expect(preview.errors).toBe(0);
    expect(preview.rows[0]).toMatchObject({
      status: "valid",
      resolved: { accountId: "a", categoryId: "c" },
    });
    expect(preview.totals.UYU.transactionExpenseMinor).toBe(1250);
    expect(preview.totals.USD.transactionExpenseMinor).toBe(0);
  });

  it("rejects inactive, missing, and type-incompatible references", () => {
    const preview = buildImportPreview(
      bundle,
      [{ id: "a", name: "Banco", currency: "USD", active: false }],
      [{ id: "c", name: "Hogar", kind: "income", active: true }],
    );
    expect(preview.errors).toBe(1);
    expect(preview.rows[0].errors.map((error) => error.field)).toEqual([
      "account",
      "category",
    ]);
  });

  it("accepts ordered categories and accounts for the structure commit", () => {
    const structureBundle = financeImportBundleSchema.parse({
      version: "finance-import/v1",
      source: { type: "json_paste" },
      categories: [
        { name: "Ingresos importados", kind: "income" },
        {
          name: "Clases importadas",
          kind: "income",
          parent: "Ingresos importados",
        },
      ],
      accounts: [
        {
          name: "Caja importada",
          type: "cash",
          currency: "UYU",
          openingBalanceMinor: 0,
          openingBalanceDate: "2026-09-01",
        },
      ],
    });
    const preview = buildImportPreview(structureBundle, [], []);
    expect(preview.errors).toBe(0);
    expect(preview.rows.map((row) => row.status)).toEqual([
      "valid",
      "valid",
      "valid",
    ]);
  });

  it("rejects a child before its parent and duplicate structure names", () => {
    const structureBundle = financeImportBundleSchema.parse({
      version: "finance-import/v1",
      source: { type: "json_paste" },
      categories: [
        { name: "Hija", kind: "income", parent: "Padre" },
        { name: "Padre", kind: "income" },
      ],
      accounts: [
        {
          name: "Caja",
          type: "cash",
          currency: "UYU",
          openingBalanceMinor: 0,
          openingBalanceDate: "2026-09-01",
        },
        {
          name: "Caja",
          type: "bank",
          currency: "UYU",
          openingBalanceMinor: 0,
          openingBalanceDate: "2026-09-01",
        },
      ],
    });
    const preview = buildImportPreview(structureBundle, [], []);
    expect(preview.errors).toBe(3);
    expect(preview.rows[2].errors[0].field).toBe("parent");
  });

  it("resolves a clean cash-flow batch against structure staged in that batch", () => {
    const cashFlowBundle = financeImportBundleSchema.parse({
      version: "finance-import/v1",
      source: { type: "json_paste" },
      accounts: [
        {
          name: "Caja nueva",
          type: "cash",
          currency: "UYU",
          openingBalanceMinor: 0,
          openingBalanceDate: "2026-09-01",
        },
      ],
      categories: [
        { name: "Ingresos nuevos", kind: "income" },
        {
          name: "Gastos nuevos",
          kind: "expense",
          defaultClassification: "variable",
        },
      ],
      transactions: [
        {
          date: "2026-09-10",
          type: "income",
          amountMinor: 2000,
          currency: "UYU",
          account: "Caja nueva",
          category: "Ingresos nuevos",
          description: "Cobro importado",
        },
      ],
      obligations: [
        {
          description: "Servicio",
          amountMinor: 500,
          currency: "UYU",
          dueDate: "2026-09-20",
          category: "Gastos nuevos",
          classification: "variable",
          status: "pending",
        },
      ],
      expectedIncome: [
        {
          date: "2026-09-25",
          amountMinor: 1000,
          currency: "UYU",
          account: "Caja nueva",
          category: "Ingresos nuevos",
          description: "Clase prevista",
          status: "planned",
        },
      ],
    });
    const preview = buildImportPreview(cashFlowBundle, [], []);
    expect(preview.errors).toBe(0);
    expect(preview.warnings).toEqual([]);
    expect(preview.rows.map((row) => row.status)).toEqual([
      "valid",
      "valid",
      "valid",
      "valid",
      "valid",
      "valid",
    ]);
    expect(preview.totals.UYU.transactionIncomeMinor).toBe(2000);
    expect(preview.totals.UYU.obligationMinor).toBe(500);
    expect(preview.totals.UYU.expectedIncomeMinor).toBe(1000);
  });

  it("rejects cash-flow rows with cross-currency or wrong-kind references", () => {
    const cashFlowBundle = financeImportBundleSchema.parse({
      version: "finance-import/v1",
      source: { type: "json_paste" },
      obligations: [
        {
          description: "No corresponde",
          amountMinor: 100,
          currency: "USD",
          dueDate: "2026-09-20",
          category: "Ingresos",
          classification: "fixed",
        },
      ],
      expectedIncome: [
        {
          date: "2026-09-20",
          amountMinor: 100,
          currency: "USD",
          account: "Caja UYU",
          category: "Ingresos",
          description: "Previsto",
        },
      ],
    });
    const preview = buildImportPreview(
      cashFlowBundle,
      [{ id: "account", name: "Caja UYU", currency: "UYU", active: true }],
      [{ id: "income", name: "Ingresos", kind: "income", active: true }],
    );
    expect(preview.errors).toBe(2);
    expect(
      preview.rows.find((row) => row.entity === "obligations")?.status,
    ).toBe("invalid");
    expect(
      preview.rows.find((row) => row.entity === "expectedIncome")?.errors[0]
        .field,
    ).toBe("currency");
  });
});
