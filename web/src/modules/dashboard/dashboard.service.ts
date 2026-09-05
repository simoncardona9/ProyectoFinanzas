import { obligationRepository } from "@/modules/obligations/obligation.repository";
import { authRepository } from "@/modules/auth/auth.repository";
import { dashboardRepository } from "./dashboard.repository";
import { lowBufferAlerts, mergeDashboardCurrencies } from "./dashboard.rules";

export async function getDashboard(householdId: string, period: string) {
  const [year, month] = period.split("-").map(Number);
  const from = `${period}-01`;
  const to = new Date(Date.UTC(year, month, 0)).toISOString().slice(0, 10);
  const [forecast, income, expectedIncome, household] = await Promise.all([
    obligationRepository.forecast(householdId, from, to),
    dashboardRepository.collectedIncome(householdId, from, to),
    dashboardRepository.expectedIncome(householdId, from, to),
    authRepository.getHousehold(householdId),
  ]);
  const currencies = mergeDashboardCurrencies([
    ...forecast,
    ...income,
    ...expectedIncome,
  ]);
  return {
    period,
    currencies,
    alerts: household
      ? lowBufferAlerts(
          currencies,
          household.defaultCurrency,
          household.lowBufferMinor,
        )
      : [],
    capabilities: {
      expectedIncome: true,
      taxReserves: false,
    },
  };
}
