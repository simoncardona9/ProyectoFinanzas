/**
 * Converts a positive decimal quantity to thousandths without floating point
 * arithmetic. The plan schema limits quantity to three decimal places.
 */
export function quantityThousandths(quantity: number | undefined) {
  if (quantity === undefined) return 1000;
  return Math.round(quantity * 1000);
}

/** Positive-only integer arithmetic gives deterministic half-up rounding. */
export function estimatedItemTotalMinor(
  plannedUnitPriceMinor: number,
  quantity: number | undefined,
) {
  return Math.floor(
    (plannedUnitPriceMinor * quantityThousandths(quantity) + 500) / 1000,
  );
}

export function resolvePlannedUnitPriceMinor(
  planCurrency: string,
  productId: string | undefined,
  manualUnitPriceMinor: number | undefined,
  suggestion:
    { amountMinor: number; currency: string; productId: string } | undefined,
) {
  if (!suggestion) return manualUnitPriceMinor;
  if (
    suggestion.currency !== planCurrency ||
    suggestion.productId !== productId
  )
    return undefined;
  return suggestion.amountMinor;
}

export function receiptLinesTotalMinor(lines: Array<{ totalMinor: number }>) {
  return lines.reduce((total, line) => total + line.totalMinor, 0);
}
