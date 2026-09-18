import { describe, expect, it } from "vitest";
import { buildAccountCashFlowReport } from "./account-cash-flow.rules";

describe("buildAccountCashFlowReport", () => {
  it("keeps currencies separate and derives opening, paid movement, and closing", () => {
    const report = buildAccountCashFlowReport(
      [
        {
          id: "uyu",
          name: "Caja",
          type: "cash",
          currency: "UYU",
          active: true,
          openingBalanceMinor: 1_000,
          openingBalanceDate: "2026-08-01",
        },
        {
          id: "usd",
          name: "Dólares",
          type: "bank",
          currency: "USD",
          active: true,
          openingBalanceMinor: 500,
          openingBalanceDate: "2026-09-10",
        },
      ],
      [
        {
          id: "before",
          accountId: "uyu",
          date: "2026-08-31",
          type: "income",
          amountMinor: 200,
          description: "Antes",
        },
        {
          id: "income",
          accountId: "uyu",
          date: "2026-09-02",
          type: "income",
          amountMinor: 500,
          description: "Cobro",
        },
        {
          id: "expense",
          accountId: "uyu",
          date: "2026-09-03",
          type: "expense",
          amountMinor: 125,
          description: "Compra",
        },
        {
          id: "debt",
          accountId: "uyu",
          date: "2026-09-04",
          type: "debt_payment",
          amountMinor: 75,
          description: "Deuda",
        },
        {
          id: "usd-income",
          accountId: "usd",
          date: "2026-09-11",
          type: "income",
          amountMinor: 100,
          description: "Cobro USD",
        },
      ],
      { from: "2026-09-01", to: "2026-09-30" },
    );

    expect(report.accounts[0]).toMatchObject({
      openingMinor: 1_200,
      openingEntryMinor: 0,
      paidIncomeMinor: 500,
      paidExpenseMinor: 200,
      paidMovementMinor: 300,
      closingMinor: 1_500,
    });
    expect(report.accounts[1]).toMatchObject({
      openingMinor: 0,
      openingEntryMinor: 500,
      paidMovementMinor: 100,
      closingMinor: 600,
    });
    expect(report.totalsByCurrency.UYU.closingMinor).toBe(1_500);
    expect(report.totalsByCurrency.USD.closingMinor).toBe(600);
  });
});
