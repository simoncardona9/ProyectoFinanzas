import { describe, expect, it } from "vitest";
import type { FinanceImportBundle } from "./import.schemas";
import { importAffectedFinancialDates } from "./import-periods";

describe("import affected financial dates", () => {
  it("includes every committed dated financial row", () => {
    const bundle = {
      transactions: [{ date: "2026-01-01" }],
      obligations: [{ dueDate: "2026-02-01" }],
      expectedIncome: [{ date: "2026-03-01" }],
      debts: [{ incurredDate: "2026-04-01" }],
      debtPayments: [{ paidDate: "2026-05-01" }],
      invoices: [{ serviceDate: "2026-06-01" }],
      invoiceCollections: [{ paidDate: "2026-07-01" }],
    } as FinanceImportBundle;

    expect(importAffectedFinancialDates(bundle)).toEqual([
      "2026-01-01",
      "2026-02-01",
      "2026-03-01",
      "2026-04-01",
      "2026-05-01",
      "2026-06-01",
      "2026-07-01",
    ]);
  });
});
