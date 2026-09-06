import { ApiError } from "@/shared/errors/api-error";
import type { CreateExchangeRate } from "./exchange-rate.schemas";

export function validateExchangeRate(values: CreateExchangeRate) {
  if (values.baseCurrency === values.quoteCurrency)
    throw new ApiError(
      422,
      "INVALID_CURRENCY_PAIR",
      "Base and quote currencies must be different.",
    );
  if (values.baseCurrency !== "USD" || values.quoteCurrency !== "UYU")
    throw new ApiError(
      422,
      "INVALID_CURRENCY_PAIR",
      "Exchange rates must state how many UYU equal one USD.",
    );
}
