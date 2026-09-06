import { z } from "zod";

const currency = z.enum(["UYU", "USD"]);
const rate = z
  .union([z.string(), z.number()])
  .transform(String)
  .refine(
    (value) =>
      /^(?:0|[1-9]\d*)(?:\.\d{1,8})?$/.test(value) &&
      !/^0(?:\.0+)?$/.test(value),
    "Rate must be a positive decimal with at most 8 decimal places.",
  );

export const createExchangeRateSchema = z.object({
  baseCurrency: currency,
  quoteCurrency: currency,
  rate,
  effectiveDate: z.iso.date(),
  source: z.string().trim().min(1).max(200),
  kind: z.enum(["confirmed", "planning"]),
  movement: z.enum(["buy_usd", "sell_usd", "reference"]),
});

export type CreateExchangeRate = z.infer<typeof createExchangeRateSchema>;

export const listExchangeRatesSchema = z.object({
  baseCurrency: currency.optional(),
  quoteCurrency: currency.optional(),
  from: z.iso.date().optional(),
  to: z.iso.date().optional(),
  movement: z.enum(["buy_usd", "sell_usd", "reference"]).optional(),
});

export type ListExchangeRates = z.infer<typeof listExchangeRatesSchema>;
