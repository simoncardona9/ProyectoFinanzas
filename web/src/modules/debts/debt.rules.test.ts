import { describe, expect, it } from "vitest";
import { ApiError } from "@/shared/errors/api-error";
import { validateDebt, validateDebtPayment } from "./debt.rules";

describe("validateDebt", () => {
  it("rejects a non-positive original balance", () => {
    expect(() =>
      validateDebt({
        creditorName: "Banco de prueba",
        description: "Tarjeta",
        amountMinor: 0,
        currency: "USD",
        incurredDate: "2026-09-06",
      }),
    ).toThrow(ApiError);
  });
});

describe("validateDebtPayment", () => {
  const debt = {
    status: "active",
    remainingAmountMinor: 10_000,
    currency: "USD",
  };
  const account = { active: true, currency: "USD" };
  const payment = {
    amountMinor: 2_500,
    accountId: "00000000-0000-4000-8000-000000000001",
    paidDate: "2026-09-06",
  };

  it("accepts a same-currency partial payment", () => {
    expect(() => validateDebtPayment(debt, account, payment)).not.toThrow();
  });

  it("rejects a payment exceeding the remaining balance", () => {
    expect(() =>
      validateDebtPayment(debt, account, { ...payment, amountMinor: 10_001 }),
    ).toThrow(ApiError);
  });

  it("rejects a payment from an account in another currency", () => {
    expect(() =>
      validateDebtPayment(debt, { active: true, currency: "UYU" }, payment),
    ).toThrow(ApiError);
  });

  it("rejects payments against a closed debt", () => {
    expect(() =>
      validateDebtPayment({ ...debt, status: "paid" }, account, payment),
    ).toThrow(ApiError);
  });
});
