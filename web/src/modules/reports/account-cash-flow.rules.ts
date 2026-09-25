type Account = {
  id: string;
  name: string;
  type: string;
  currency: "UYU" | "USD";
  active: boolean;
  openingBalanceMinor: number;
  openingBalanceDate: string;
};

type PaidTransaction = {
  id: string;
  accountId: string;
  date: string;
  type: "income" | "expense" | "debt_payment" | "transfer" | "adjustment";
  amountMinor: number;
  description: string;
};

function signedAmount(transaction: PaidTransaction) {
  return transaction.type === "income"
    ? transaction.amountMinor
    : transaction.type === "expense" || transaction.type === "debt_payment"
      ? -transaction.amountMinor
      : 0;
}

/**
 * Reports retain a separate account-opening entry when it occurs inside the
 * selected range. It is not a paid cash-flow movement, but it is needed for a
 * closing balance that agrees with the account ledger.
 */
export function buildAccountCashFlowReport(
  accounts: Account[],
  transactions: PaidTransaction[],
  range: { from: string; to: string },
) {
  const byCurrency = {
    UYU: {
      openingMinor: 0,
      openingEntriesMinor: 0,
      paidIncomeMinor: 0,
      paidExpenseMinor: 0,
      paidMovementMinor: 0,
      closingMinor: 0,
    },
    USD: {
      openingMinor: 0,
      openingEntriesMinor: 0,
      paidIncomeMinor: 0,
      paidExpenseMinor: 0,
      paidMovementMinor: 0,
      closingMinor: 0,
    },
  };

  const accountRows = accounts
    .filter((account) => account.openingBalanceDate <= range.to)
    .map((account) => {
      const accountTransactions = transactions.filter(
        (transaction) => transaction.accountId === account.id,
      );
      const before = accountTransactions.filter(
        (transaction) => transaction.date < range.from,
      );
      const inRange = accountTransactions.filter(
        (transaction) =>
          transaction.date >= range.from && transaction.date <= range.to,
      );
      const openingMinor =
        (account.openingBalanceDate < range.from
          ? account.openingBalanceMinor
          : 0) +
        before.reduce(
          (total, transaction) => total + signedAmount(transaction),
          0,
        );
      const openingEntryMinor =
        account.openingBalanceDate >= range.from &&
        account.openingBalanceDate <= range.to
          ? account.openingBalanceMinor
          : 0;
      const paidIncomeMinor = inRange
        .filter((transaction) => transaction.type === "income")
        .reduce((total, transaction) => total + transaction.amountMinor, 0);
      const paidExpenseMinor = inRange
        .filter(
          (transaction) =>
            transaction.type === "expense" ||
            transaction.type === "debt_payment",
        )
        .reduce((total, transaction) => total + transaction.amountMinor, 0);
      const paidMovementMinor = inRange.reduce(
        (total, transaction) => total + signedAmount(transaction),
        0,
      );
      const closingMinor = openingMinor + openingEntryMinor + paidMovementMinor;
      const totals = byCurrency[account.currency];
      totals.openingMinor += openingMinor;
      totals.openingEntriesMinor += openingEntryMinor;
      totals.paidIncomeMinor += paidIncomeMinor;
      totals.paidExpenseMinor += paidExpenseMinor;
      totals.paidMovementMinor += paidMovementMinor;
      totals.closingMinor += closingMinor;
      return {
        id: account.id,
        name: account.name,
        type: account.type,
        currency: account.currency,
        active: account.active,
        openingMinor,
        openingEntryMinor,
        paidIncomeMinor,
        paidExpenseMinor,
        paidMovementMinor,
        closingMinor,
        transactions: inRange.map((transaction) => ({
          ...transaction,
          signedAmountMinor: signedAmount(transaction),
          href: `/transactions/${transaction.id}`,
        })),
      };
    });
  return { range, accounts: accountRows, totalsByCurrency: byCurrency };
}
