import { describe, expect, it } from "vitest";
import { mergeDashboardCurrencies } from "./dashboard.rules";

describe("dashboard currency rollup", () => {
  it("keeps currencies separate while joining forecast and income totals", () => {
    expect(
      mergeDashboardCurrencies([
        {
          currency: "UYU",
          currentCashMinor: 10_000,
          pendingObligationsMinor: 2_000,
          projectedCashMinor: 8_000,
        },
        {
          currency: "UYU",
          collectedIncomeMinor: 5_000,
          expectedIncomeMinor: 2_500,
          oneOffIncomeMinor: 1_000,
        },
        {
          currency: "USD",
          currentCashMinor: 200,
          projectedCashMinor: 200,
          collectedIncomeMinor: 50,
        },
      ]),
    ).toEqual([
      {
        currency: "USD",
        currentCashMinor: 200,
        pendingObligationsMinor: 0,
        projectedCashMinor: 200,
        collectedIncomeMinor: 50,
        expectedIncomeMinor: 0,
        oneOffIncomeMinor: 0,
      },
      {
        currency: "UYU",
        currentCashMinor: 10_000,
        pendingObligationsMinor: 2_000,
        projectedCashMinor: 10_500,
        collectedIncomeMinor: 5_000,
        expectedIncomeMinor: 2_500,
        oneOffIncomeMinor: 1_000,
      },
    ]);
  });
});
