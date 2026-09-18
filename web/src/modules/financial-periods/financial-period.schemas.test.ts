import { describe, expect, it } from "vitest";
import { reopenFinancialPeriodSchema } from "./financial-period.schemas";

describe("financial period transition input", () => {
  it("requires a non-empty reopen reason", () => {
    expect(
      reopenFinancialPeriodSchema.safeParse({
        period: "2026-09",
        reason: "   ",
      }).success,
    ).toBe(false);
  });
});
