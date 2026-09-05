import { describe, expect, it } from "vitest";
import { ApiError } from "@/shared/errors/api-error";
import { createObligationSchema } from "./obligation.schemas";
import {
  validateDeferral,
  validateObligationCategory,
  validatePayment,
} from "./obligation.rules";

describe("obligation rules", () => {
  it("requires an active expense category", () => {
    expect(() =>
      validateObligationCategory({ active: true, kind: "income" }),
    ).toThrow(ApiError);
    expect(() =>
      validateObligationCategory({ active: true, kind: "expense" }),
    ).not.toThrow();
  });
  it("rejects overpayment and a currency-mismatched account", () => {
    const obligation = {
      status: "pending",
      remainingAmountMinor: 500,
      currency: "UYU",
    };
    expect(() =>
      validatePayment(obligation, { active: true, currency: "UYU" }, 501),
    ).toThrow(/exceeds/i);
    expect(() =>
      validatePayment(obligation, { active: true, currency: "USD" }, 100),
    ).toThrow(/currency/i);
  });
  it("keeps a deferral in a later period", () => {
    expect(() =>
      validateDeferral(
        { status: "pending", dueDate: "2026-08-10" },
        "2026-08-10",
      ),
    ).toThrow(/later/i);
    expect(() =>
      validateDeferral(
        { status: "pending", dueDate: "2026-08-10" },
        "2026-09-10",
      ),
    ).not.toThrow();
  });
  it("does not accept paid obligations without a payment", () => {
    expect(
      createObligationSchema.safeParse({
        description: "UTE",
        amountMinor: 100,
        currency: "UYU",
        dueDate: "2026-09-10",
        categoryId: "e6d17ee6-d91e-4955-af00-1c69e6522b34",
        classification: "fixed",
        status: "paid",
      }).success,
    ).toBe(false);
  });
});
