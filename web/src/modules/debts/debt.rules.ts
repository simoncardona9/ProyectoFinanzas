import { ApiError } from "@/shared/errors/api-error";
import type { CreateDebt, CreateDebtPayment } from "./debt.schemas";

export function validateDebt(values: CreateDebt) {
  if (values.amountMinor <= 0)
    throw new ApiError(422, "INVALID_AMOUNT", "Debt amount must be positive.");
}

type DebtForPayment = {
  status: string;
  remainingAmountMinor: number;
  currency: string;
};
type AccountForPayment = { active: boolean; currency: string };

export function validateDebtPayment(
  debt: DebtForPayment,
  account: AccountForPayment | undefined,
  values: CreateDebtPayment,
) {
  if (debt.status !== "active")
    throw new ApiError(
      422,
      "INVALID_STATUS_TRANSITION",
      "Only active debts can receive payments.",
    );
  if (values.amountMinor > debt.remainingAmountMinor)
    throw new ApiError(
      422,
      "PAYMENT_EXCEEDS_BALANCE",
      "The payment cannot exceed the remaining debt balance.",
    );
  if (!account || !account.active)
    throw new ApiError(422, "INVALID_ACCOUNT", "The account must be active.");
  if (account.currency !== debt.currency)
    throw new ApiError(
      422,
      "CURRENCY_MISMATCH",
      "The payment account currency must match the debt currency.",
    );
}
