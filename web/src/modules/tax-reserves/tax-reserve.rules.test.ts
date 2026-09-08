import { describe, expect, it } from "vitest";
import { ApiError } from "@/shared/errors/api-error";
import { validateTaxReserveSettlement } from "./tax-reserve.rules";

const reserve = {
  status: "protected",
  remainingAmountMinor: 2_200,
  currency: "UYU",
};
const payment = {
  amountMinor: 1_000,
  accountId: "3d9b5d5a-3c91-42de-a596-2bc2130e276b",
  paidDate: "2026-09-07",
  reference: "DGI septiembre",
};

function expectErrorCode(action: () => void, code: string) {
  try {
    action();
  } catch (error) {
    expect(error).toBeInstanceOf(ApiError);
    expect((error as ApiError).code).toBe(code);
    return;
  }
  throw new Error("Expected validation to fail.");
}

describe("validateTaxReserveSettlement", () => {
  it("allows a partial same-currency settlement from an active account", () => {
    expect(() =>
      validateTaxReserveSettlement(
        reserve,
        { active: true, currency: "UYU" },
        payment,
      ),
    ).not.toThrow();
  });

  it("rejects a payment that exceeds the protected balance", () => {
    expectErrorCode(
      () =>
        validateTaxReserveSettlement(
          reserve,
          { active: true, currency: "UYU" },
          { ...payment, amountMinor: 2_201 },
        ),
      "SETTLEMENT_EXCEEDS_BALANCE",
    );
  });

  it("keeps currencies isolated", () => {
    expectErrorCode(
      () =>
        validateTaxReserveSettlement(
          reserve,
          { active: true, currency: "USD" },
          payment,
        ),
      "CURRENCY_MISMATCH",
    );
  });

  it("rejects settlement of a fully settled reserve", () => {
    expectErrorCode(
      () =>
        validateTaxReserveSettlement(
          { ...reserve, status: "settled", remainingAmountMinor: 0 },
          { active: true, currency: "UYU" },
          payment,
        ),
      "RESERVE_CLOSED",
    );
  });
});
