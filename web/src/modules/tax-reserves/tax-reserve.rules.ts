import { ApiError } from "@/shared/errors/api-error";
import type { SettleTaxReserve } from "./tax-reserve.schemas";

export function validateTaxReserveSettlement(
  reserve: {
    status: string;
    remainingAmountMinor: number;
    currency: string;
  },
  account: { active: boolean; currency: string } | undefined,
  values: SettleTaxReserve,
) {
  if (!account || !account.active)
    throw new ApiError(
      422,
      "INVALID_ACCOUNT",
      "The tax-payment account is inactive or unavailable.",
    );
  if (account.currency !== reserve.currency)
    throw new ApiError(
      422,
      "CURRENCY_MISMATCH",
      "The tax-payment account must use the reserve currency.",
    );
  if (!["protected", "partially_settled"].includes(reserve.status))
    throw new ApiError(
      422,
      "RESERVE_CLOSED",
      "Only protected reserves can be settled.",
    );
  if (values.amountMinor > reserve.remainingAmountMinor)
    throw new ApiError(
      422,
      "SETTLEMENT_EXCEEDS_BALANCE",
      "Settlement exceeds the remaining reserve balance.",
    );
}
