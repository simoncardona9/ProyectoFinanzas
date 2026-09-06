import type { debts, exchangeRates } from "@/db/schema";
import { exchangeRateRepository } from "@/modules/exchange-rates/exchange-rate.repository";
import { ApiError } from "@/shared/errors/api-error";
import { convertUsdMinorToUyuMinor } from "./debt-exposure.rules";

type Debt = Pick<
  typeof debts.$inferSelect,
  "currency" | "remainingAmountMinor"
>;
type ExchangeRate = typeof exchangeRates.$inferSelect;

function selectedRate(rate: ExchangeRate) {
  return {
    id: rate.id,
    baseCurrency: rate.baseCurrency,
    quoteCurrency: rate.quoteCurrency,
    rate: rate.rate,
    effectiveDate: rate.effectiveDate,
    source: rate.source,
    kind: rate.kind,
    movement: rate.movement,
  };
}

export async function getDebtExposure(
  householdId: string,
  debt: Debt,
  exchangeRateId?: string,
) {
  if (debt.currency === "UYU")
    return {
      originalRemainingAmountMinor: debt.remainingAmountMinor,
      originalCurrency: "UYU",
      uyuEquivalentAmountMinor: debt.remainingAmountMinor,
      selectedRate: null,
    };
  if (!exchangeRateId) return null;
  const rate = await exchangeRateRepository.find(householdId, exchangeRateId);
  if (
    !rate ||
    rate.baseCurrency !== "USD" ||
    rate.quoteCurrency !== "UYU" ||
    rate.movement !== "buy_usd"
  )
    throw new ApiError(
      422,
      "INVALID_EXCHANGE_RATE",
      "Select a household USD-buying rate (UYU to USD) for this debt.",
    );
  return {
    originalRemainingAmountMinor: debt.remainingAmountMinor,
    originalCurrency: "USD",
    uyuEquivalentAmountMinor: convertUsdMinorToUyuMinor(
      debt.remainingAmountMinor,
      rate.rate,
    ),
    selectedRate: selectedRate(rate),
  };
}
