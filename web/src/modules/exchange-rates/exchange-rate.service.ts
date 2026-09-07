import type { AuthContext } from "@/shared/auth/auth.types";
import { ApiError } from "@/shared/errors/api-error";
import { exchangeRateRepository } from "./exchange-rate.repository";
import { validateExchangeRate } from "./exchange-rate.rules";
import type { CreateExchangeRate } from "./exchange-rate.schemas";

export async function createExchangeRate(
  context: AuthContext,
  values: CreateExchangeRate,
) {
  validateExchangeRate(values);
  try {
    return await exchangeRateRepository.create(
      context.membership.householdId,
      context.user.id,
      values,
    );
  } catch (error) {
    if (
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      error.code === "23505"
    )
      throw new ApiError(
        409,
        "DUPLICATE_EXCHANGE_RATE",
        "An exchange rate already exists for this pair, date, kind, and movement.",
      );
    throw error;
  }
}
