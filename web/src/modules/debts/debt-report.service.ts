import { exchangeRateRepository } from "@/modules/exchange-rates/exchange-rate.repository";
import { ApiError } from "@/shared/errors/api-error";
import { debtReportRepository } from "./debt-report.repository";
import { buildDebtReport } from "./debt-report.rules";

export async function getDebtReport(
  householdId: string,
  exchangeRateId?: string,
) {
  const [rows, rate] = await Promise.all([
    debtReportRepository.listRows(householdId),
    exchangeRateId
      ? exchangeRateRepository.find(householdId, exchangeRateId)
      : undefined,
  ]);
  if (
    exchangeRateId &&
    (!rate ||
      rate.baseCurrency !== "USD" ||
      rate.quoteCurrency !== "UYU" ||
      rate.movement !== "buy_usd")
  )
    throw new ApiError(
      422,
      "INVALID_EXCHANGE_RATE",
      "Select a household USD-buying rate (UYU to USD) for this report.",
    );
  return buildDebtReport(
    rows as Parameters<typeof buildDebtReport>[0],
    rate
      ? {
          id: rate.id,
          rate: rate.rate,
          effectiveDate: rate.effectiveDate,
          source: rate.source,
          kind: rate.kind,
          movement: rate.movement,
        }
      : undefined,
  );
}
