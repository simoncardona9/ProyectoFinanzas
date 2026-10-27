import { describe, expect, it } from "vitest";
import { buildMonthlyFlow, overviewMonths } from "./overview.rules";

describe("overview financial charts", () => {
  it("builds six calendar months across year boundaries", () => {
    expect(overviewMonths("2026-02")).toEqual([
      "2025-09",
      "2025-10",
      "2025-11",
      "2025-12",
      "2026-01",
      "2026-02",
    ]);
  });

  it("keeps currencies separate, counts debt payments as outflows, and excludes transfers and adjustments", () => {
    const accounts = [
      {
        currency: "UYU" as const,
        transactions: [
          { date: "2026-10-01", type: "income", amountMinor: 10000 },
          { date: "2026-10-02", type: "expense", amountMinor: 2300 },
          { date: "2026-10-03", type: "debt_payment", amountMinor: 1700 },
          { date: "2026-10-03", type: "transfer", amountMinor: 50000 },
          { date: "2026-10-03", type: "adjustment", amountMinor: 40000 },
          { date: "2026-11-01", type: "income", amountMinor: 99999 },
        ],
      },
      {
        currency: "USD" as const,
        transactions: [
          { date: "2026-10-01", type: "income", amountMinor: 100 },
        ],
      },
    ];
    expect(buildMonthlyFlow(accounts, "2026-10", "UYU").at(-1)).toEqual({
      month: "2026-10",
      incomeMinor: 10000,
      expenseMinor: 4000,
    });
    expect(buildMonthlyFlow(accounts, "2026-10", "USD").at(-1)).toEqual({
      month: "2026-10",
      incomeMinor: 100,
      expenseMinor: 0,
    });
  });

  it("retains zero months instead of inventing chart activity", () => {
    const months = buildMonthlyFlow([], "2026-10", "UYU");
    expect(months).toHaveLength(6);
    expect(
      months.every((row) => row.incomeMinor === 0 && row.expenseMinor === 0),
    ).toBe(true);
  });
});
