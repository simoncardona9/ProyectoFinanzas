import { ApiError } from "@/shared/errors/api-error";

type AccountForTransaction = { active: boolean; currency: string };
type CategoryForTransaction = { active: boolean; kind: string };

export function validatePaidTransactionReferences(
  type: "income" | "expense",
  currency: string,
  account: AccountForTransaction | undefined,
  category: CategoryForTransaction | undefined,
) {
  if (!account || !account.active)
    throw new ApiError(422, "INVALID_ACCOUNT", "The account must be active.");
  if (account.currency !== currency)
    throw new ApiError(
      422,
      "CURRENCY_MISMATCH",
      "The transaction currency must match the account currency.",
    );
  if (!category || !category.active || category.kind !== type)
    throw new ApiError(
      422,
      "INVALID_CATEGORY",
      "The category must be active and match the transaction type.",
    );
}

export function applyPaidTransactionToBalance(
  openingBalanceMinor: number,
  type: "income" | "expense",
  amountMinor: number,
) {
  return type === "income"
    ? openingBalanceMinor + amountMinor
    : openingBalanceMinor - amountMinor;
}

export function ensurePaidTransactionCanChange(transaction: {
  type?: string;
  status: string;
  voidedAt: Date | null;
}) {
  if (
    (transaction.type !== undefined &&
      transaction.type !== "income" &&
      transaction.type !== "expense") ||
    transaction.status !== "paid" ||
    transaction.voidedAt
  )
    throw new ApiError(
      422,
      "INVALID_STATUS_TRANSITION",
      "Only paid transactions that have not been voided can be changed.",
    );
}
