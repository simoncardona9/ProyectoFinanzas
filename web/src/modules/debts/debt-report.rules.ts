import { convertUsdMinorToUyuMinor } from "./debt-exposure.rules";

type DebtRow = {
  id: string;
  creditorName: string;
  description: string;
  currency: "UYU" | "USD";
  originalAmountMinor: number;
  remainingAmountMinor: number;
  status: string;
  paidAmountMinor: number;
};

type Rate = {
  id: string;
  rate: string;
  effectiveDate: string;
  source: string;
  kind: "confirmed" | "planning";
  movement: "buy_usd" | "sell_usd" | "reference";
};

export function buildDebtReport(rows: DebtRow[], selectedRate?: Rate) {
  const totalsByOriginalCurrency = {
    UYU: {
      originalAmountMinor: 0,
      paidAmountMinor: 0,
      remainingAmountMinor: 0,
    },
    USD: {
      originalAmountMinor: 0,
      paidAmountMinor: 0,
      remainingAmountMinor: 0,
    },
  };
  const debts = rows.map((row) => {
    const totals = totalsByOriginalCurrency[row.currency];
    totals.originalAmountMinor += row.originalAmountMinor;
    totals.paidAmountMinor += row.paidAmountMinor;
    totals.remainingAmountMinor += row.remainingAmountMinor;
    return {
      ...row,
      uyuEquivalentAmountMinor:
        row.currency === "UYU"
          ? row.remainingAmountMinor
          : selectedRate
            ? convertUsdMinorToUyuMinor(
                row.remainingAmountMinor,
                selectedRate.rate,
              )
            : null,
    };
  });
  return {
    debts,
    totalsByOriginalCurrency,
    selectedRate: selectedRate ?? null,
    uyuEquivalentExposureMinor: selectedRate
      ? debts.reduce(
          (total, debt) => total + (debt.uyuEquivalentAmountMinor ?? 0),
          0,
        )
      : null,
  };
}
