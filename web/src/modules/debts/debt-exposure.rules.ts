import { ApiError } from "@/shared/errors/api-error";

export function convertUsdMinorToUyuMinor(usdMinor: number, rate: string) {
  const [whole, fraction = ""] = rate.split(".");
  const wholeRate = Number(whole);
  const fractionalRate = Number(fraction.padEnd(8, "0"));
  const scale = 100_000_000;
  const chunk = 10_000;
  const high = Math.floor(usdMinor / chunk);
  const low = usdMinor % chunk;
  const highProduct = high * fractionalRate;
  const fractionalMinor =
    Math.floor(highProduct / scale) * chunk +
    Math.floor(
      ((highProduct % scale) * chunk + low * fractionalRate + scale / 2) /
        scale,
    );
  const converted = usdMinor * wholeRate + fractionalMinor;
  if (!Number.isSafeInteger(converted))
    throw new ApiError(
      422,
      "CONVERSION_OUT_OF_RANGE",
      "The selected rate produces an amount that cannot be represented safely.",
    );
  return converted;
}
