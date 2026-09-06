import { describe, expect, it } from "vitest";
import { ApiError } from "@/shared/errors/api-error";
import { validateExchangeRate } from "./exchange-rate.rules";
import { createExchangeRateSchema } from "./exchange-rate.schemas";

const validRate = {
  baseCurrency: "USD",
  quoteCurrency: "UYU",
  rate: "42.75",
  effectiveDate: "2026-09-06",
  source: "Banco Central",
  kind: "confirmed",
} as const;

describe("exchange-rate validation", () => {
  it("accepts a positive decimal rate", () => {
    expect(createExchangeRateSchema.parse(validRate).rate).toBe("42.75");
  });

  it("rejects zero and precision beyond eight decimals", () => {
    expect(() =>
      createExchangeRateSchema.parse({ ...validRate, rate: "0" }),
    ).toThrow();
    expect(() =>
      createExchangeRateSchema.parse({ ...validRate, rate: "42.123456789" }),
    ).toThrow();
  });

  it("rejects a currency pair with identical currencies", () => {
    expect(() =>
      validateExchangeRate({ ...validRate, quoteCurrency: "USD" }),
    ).toThrow(ApiError);
  });
});
