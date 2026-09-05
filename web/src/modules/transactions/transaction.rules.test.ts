import { describe, expect, it } from "vitest";
import { ApiError } from "@/shared/errors/api-error";
import {
  applyPaidTransactionToBalance,
  validatePaidTransactionReferences,
} from "./transaction.rules";

describe("paid UYU transaction rules", () => {
  const account = { active: true, currency: "UYU" };
  const income = { active: true, kind: "income" };

  it("adds income and subtracts expense from the account balance", () => {
    expect(applyPaidTransactionToBalance(1_000, "income", 250)).toBe(1_250);
    expect(applyPaidTransactionToBalance(1_000, "expense", 250)).toBe(750);
  });
  it("rejects an inactive account, a mismatched currency, and a mismatched category", () => {
    expect(() =>
      validatePaidTransactionReferences("income", "UYU", { ...account, active: false }, income),
    ).toThrow(ApiError);
    expect(() =>
      validatePaidTransactionReferences("income", "USD", account, income),
    ).toThrow(/currency/i);
    expect(() =>
      validatePaidTransactionReferences("expense", "UYU", account, income),
    ).toThrow(/category/i);
  });
});
