type FlowAccount = {
  currency: "UYU" | "USD";
  transactions: { date: string; type: string; amountMinor: number }[];
};

export function overviewMonths(period: string) {
  const [year, month] = period.split("-").map(Number);
  return Array.from({ length: 6 }, (_, index) => {
    const date = new Date(0);
    date.setUTCFullYear(year, month - 6 + index, 1);
    return date.toISOString().slice(0, 7);
  });
}

export function buildMonthlyFlow(
  accounts: FlowAccount[],
  period: string,
  currency: "UYU" | "USD",
) {
  return overviewMonths(period).map((month) => {
    let incomeMinor = 0;
    let expenseMinor = 0;
    for (const account of accounts.filter((row) => row.currency === currency)) {
      for (const transaction of account.transactions) {
        if (!transaction.date.startsWith(month)) continue;
        if (transaction.type === "income")
          incomeMinor += transaction.amountMinor;
        if (
          transaction.type === "expense" ||
          transaction.type === "debt_payment"
        )
          expenseMinor += transaction.amountMinor;
      }
    }
    return { month, incomeMinor, expenseMinor };
  });
}
