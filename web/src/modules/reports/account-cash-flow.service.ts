import { buildAccountCashFlowReport } from "./account-cash-flow.rules";
import { accountCashFlowReportRepository } from "./account-cash-flow.repository";
import type { AccountCashFlowReportQuery } from "./account-cash-flow.schemas";

export async function getAccountCashFlowReport(
  householdId: string,
  range: AccountCashFlowReportQuery,
) {
  const rows =
    await accountCashFlowReportRepository.accountsAndPaidTransactions(
      householdId,
      range.to,
    );
  return buildAccountCashFlowReport(
    rows.accounts as Parameters<typeof buildAccountCashFlowReport>[0],
    rows.transactions as Parameters<typeof buildAccountCashFlowReport>[1],
    range,
  );
}
