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
});
