export type CurrencyDashboardInput = {
  currency: string;
  currentCashMinor?: number;
  pendingObligationsMinor?: number;
  projectedCashMinor?: number;
  collectedIncomeMinor?: number;
  expectedIncomeMinor?: number;
  oneOffIncomeMinor?: number;
};

export function mergeDashboardCurrencies(inputs: CurrencyDashboardInput[]) {
  const byCurrency = new Map<string, Required<CurrencyDashboardInput>>();
  for (const input of inputs) {
    const current = byCurrency.get(input.currency) ?? {
      currency: input.currency,
      currentCashMinor: 0,
      pendingObligationsMinor: 0,
      projectedCashMinor: 0,
      collectedIncomeMinor: 0,
      expectedIncomeMinor: 0,
      oneOffIncomeMinor: 0,
    };
    current.currentCashMinor += input.currentCashMinor ?? 0;
    current.pendingObligationsMinor += input.pendingObligationsMinor ?? 0;
    current.projectedCashMinor += input.projectedCashMinor ?? 0;
    current.collectedIncomeMinor += input.collectedIncomeMinor ?? 0;
    current.expectedIncomeMinor += input.expectedIncomeMinor ?? 0;
    current.oneOffIncomeMinor += input.oneOffIncomeMinor ?? 0;
    byCurrency.set(input.currency, current);
  }
  return [...byCurrency.values()]
    .map((summary) => ({
      ...summary,
      projectedCashMinor:
        summary.currentCashMinor -
        summary.pendingObligationsMinor +
        summary.expectedIncomeMinor,
    }))
    .sort((a, b) => a.currency.localeCompare(b.currency));
}
