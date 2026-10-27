import { beforeEach, describe, expect, it, vi } from "vitest";
import type { AuthContext } from "@/shared/auth/auth.types";
import { exchangeRateRepository } from "./exchange-rate.repository";
import { createExchangeRate } from "./exchange-rate.service";

vi.mock("./exchange-rate.repository", () => ({
  exchangeRateRepository: { create: vi.fn() },
}));
const context = {
  user: { id: "actor" },
  membership: { householdId: "household" },
} as AuthContext;
const values = {
  baseCurrency: "USD",
  quoteCurrency: "UYU",
  rate: "42.75",
  effectiveDate: "2026-10-15",
  source: "Synthetic quote",
  kind: "confirmed",
  movement: "buy_usd",
} as const;

describe("createExchangeRate", () => {
  beforeEach(() => vi.clearAllMocks());
  it.each([
    { code: "23505" },
    new Error("Database query failed", { cause: { code: "23505" } }),
  ])(
    "returns a conflict for raw or Drizzle-wrapped duplicate errors",
    async (error) => {
      vi.mocked(exchangeRateRepository.create).mockRejectedValue(error);
      await expect(createExchangeRate(context, values)).rejects.toMatchObject({
        status: 409,
        code: "DUPLICATE_EXCHANGE_RATE",
      });
    },
  );
  it("preserves unexpected errors", async () => {
    const error = new Error("Unexpected failure");
    vi.mocked(exchangeRateRepository.create).mockRejectedValue(error);
    await expect(createExchangeRate(context, values)).rejects.toBe(error);
  });
});
