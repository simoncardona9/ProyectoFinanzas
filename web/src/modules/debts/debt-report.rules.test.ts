import { describe, expect, it } from "vitest";
import { buildDebtReport } from "./debt-report.rules";

const rows = [
  {
    id: "uyu-debt",
    creditorName: "Proveedor UYU",
    description: "Saldo UYU",
    currency: "UYU" as const,
    originalAmountMinor: 10_000,
    paidAmountMinor: 2_500,
    remainingAmountMinor: 7_500,
    status: "active",
  },
  {
    id: "usd-debt",
    creditorName: "Proveedor USD",
    description: "Saldo USD",
    currency: "USD" as const,
    originalAmountMinor: 20_000,
    paidAmountMinor: 5_000,
    remainingAmountMinor: 15_000,
    status: "active",
  },
];

describe("buildDebtReport", () => {
  it("keeps original-currency totals separate without a selected rate", () => {
    const report = buildDebtReport(rows);
    expect(report.totalsByOriginalCurrency.USD).toMatchObject({
      originalAmountMinor: 20_000,
      paidAmountMinor: 5_000,
      remainingAmountMinor: 15_000,
    });
    expect(report.uyuEquivalentExposureMinor).toBeNull();
    expect(report.debts[1].uyuEquivalentAmountMinor).toBeNull();
  });

  it("reflects a USD payment in original and selected UYU exposure totals", () => {
    const report = buildDebtReport(rows, {
      id: "rate",
      rate: "42.75",
      effectiveDate: "2026-09-06",
      source: "Banco Central",
      kind: "confirmed",
      movement: "buy_usd",
    });
    expect(report.debts[1].uyuEquivalentAmountMinor).toBe(641_250);
    expect(report.uyuEquivalentExposureMinor).toBe(648_750);
  });
});
