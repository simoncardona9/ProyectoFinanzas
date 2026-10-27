import { and, asc, eq, inArray, lte } from "drizzle-orm";
import { db } from "@/db";
import { obligations } from "@/db/schema";
import { getAccountCashFlowReport } from "@/modules/reports/account-cash-flow.service";
import { getCategoryTaxReport } from "@/modules/reports/category-tax-report.service";
import { getDashboard } from "./dashboard.service";
import { buildMonthlyFlow, overviewMonths } from "./overview.rules";

export async function getOverview(
  householdId: string,
  period: string,
  currency: "UYU" | "USD",
) {
  const from = `${period}-01`;
  const end = new Date(`${from}T12:00:00Z`);
  end.setUTCMonth(end.getUTCMonth() + 1, 0);
  const to = end.toISOString().slice(0, 10);
  const today = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Montevideo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
  const horizon = new Date(`${today}T12:00:00Z`);
  horizon.setUTCDate(horizon.getUTCDate() + 30);
  const horizonDate = horizon.toISOString().slice(0, 10);
  const [dashboard, flow, categories, openObligations] = await Promise.all([
    getDashboard(householdId, period),
    getAccountCashFlowReport(householdId, {
      from: `${overviewMonths(period)[0]}-01`,
      to,
    }),
    getCategoryTaxReport(householdId, { from, to, groupBy: "category" }),
    db
      .select({
        id: obligations.id,
        description: obligations.description,
        dueDate: obligations.dueDate,
        remainingAmountMinor: obligations.remainingAmountMinor,
      })
      .from(obligations)
      .where(
        and(
          eq(obligations.householdId, householdId),
          eq(obligations.currency, currency),
          inArray(obligations.status, ["planned", "pending"]),
          lte(obligations.dueDate, horizonDate),
        ),
      )
      .orderBy(asc(obligations.dueDate), asc(obligations.id)),
  ]);
  const months = buildMonthlyFlow(flow.accounts, period, currency);
  return {
    today,
    horizonDate,
    months,
    summary: dashboard.currencies.find((row) => row.currency === currency),
    lowBuffer: dashboard.alerts.some((row) => row.currency === currency),
    expensesMinor: months.at(-1)!.expenseMinor,
    categories: categories.categoryRows
      .filter((row) => row.currency === currency)
      .sort((a, b) => b.totalMinor - a.totalMinor),
    overdueCount: openObligations.filter((row) => row.dueDate < today).length,
    upcomingTotalMinor: openObligations
      .filter((row) => row.dueDate >= today)
      .reduce((total, row) => total + row.remainingAmountMinor, 0),
    obligations: openObligations.slice(0, 8),
    obligationCount: openObligations.length,
  };
}
