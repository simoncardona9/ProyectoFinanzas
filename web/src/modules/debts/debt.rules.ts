import { ApiError } from "@/shared/errors/api-error";
import type { CreateDebt } from "./debt.schemas";

export function validateDebt(values: CreateDebt) {
  if (values.amountMinor <= 0)
    throw new ApiError(422, "INVALID_AMOUNT", "Debt amount must be positive.");
}
