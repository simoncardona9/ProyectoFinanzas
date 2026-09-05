import { ApiError } from "@/shared/errors/api-error";

export function validateObligationCategory(
  category:
    | {
        active: boolean;
        kind: string;
      }
    | undefined,
) {
  if (!category || !category.active)
    throw new ApiError(
      422,
      "INVALID_CATEGORY",
      "The expense category is inactive or unavailable.",
    );
  if (category.kind !== "expense")
    throw new ApiError(
      422,
      "INVALID_CATEGORY",
      "An obligation requires an expense category.",
    );
}

export function validatePayment(
  obligation: {
    status: string;
    remainingAmountMinor: number;
    currency: string;
  },
  account: { active: boolean; currency: string } | undefined,
  amountMinor: number,
) {
  if (!account || !account.active)
    throw new ApiError(
      422,
      "INVALID_ACCOUNT",
      "The payment account is inactive or unavailable.",
    );
  if (account.currency !== obligation.currency)
    throw new ApiError(
      422,
      "CURRENCY_MISMATCH",
      "The payment account must use the obligation currency.",
    );
  if (!["planned", "pending", "deferred"].includes(obligation.status))
    throw new ApiError(
      422,
      "OBLIGATION_CLOSED",
      "Only open obligations can receive payments.",
    );
  if (amountMinor > obligation.remainingAmountMinor)
    throw new ApiError(
      422,
      "PAYMENT_EXCEEDS_BALANCE",
      "Payment exceeds the remaining obligation balance.",
    );
}

export function validateDeferral(
  obligation: { status: string; dueDate: string },
  newDueDate: string,
) {
  if (!["planned", "pending", "deferred"].includes(obligation.status))
    throw new ApiError(
      422,
      "OBLIGATION_CLOSED",
      "Only open obligations can be deferred.",
    );
  if (newDueDate <= obligation.dueDate)
    throw new ApiError(
      422,
      "INVALID_DUE_DATE",
      "The deferred due date must be later than the current due date.",
    );
}
