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
});
