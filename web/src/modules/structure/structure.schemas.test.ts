import { describe, expect, it } from "vitest";
import { createAccountSchema, createCategorySchema } from "./structure.schemas";

describe("financial structure validation", () => {
  it("accepts integer opening balances and an ISO calendar date", () => {
    expect(
      createAccountSchema.safeParse({
        name: "Caja",
        type: "cash",
        currency: "UYU",
        openingBalanceMinor: 0,
        openingBalanceDate: "2026-09-01",
      }).success,
    ).toBe(true);
  });
  it("rejects a fractional minor-unit balance", () => {
    expect(
      createAccountSchema.safeParse({
        name: "Caja",
        type: "cash",
        currency: "UYU",
        openingBalanceMinor: 1.5,
        openingBalanceDate: "2026-09-01",
      }).success,
    ).toBe(false);
  });
  it("requires and limits classifications to expense categories", () => {
    expect(
      createCategorySchema.safeParse({ name: "Servicios", kind: "expense" })
        .success,
    ).toBe(false);
    expect(
      createCategorySchema.safeParse({
        name: "Sueldo",
        kind: "income",
        defaultClassification: "fixed",
      }).success,
    ).toBe(false);
    expect(
      createCategorySchema.safeParse({
        name: "Servicios",
        kind: "expense",
        defaultClassification: "fixed",
      }).success,
    ).toBe(true);
  });
});
