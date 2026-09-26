import { describe, expect, it } from "vitest";
import {
  createGroceryPlanItemSchema,
  createGroceryPlanSchema,
} from "./grocery.schemas";
import {
  estimatedItemTotalMinor,
  resolvePlannedUnitPriceMinor,
} from "./grocery-plan.rules";

describe("grocery plan rules", () => {
  it("calculates an omitted quantity as one unit and rounds a fractional estimate half up", () => {
    expect(estimatedItemTotalMinor(19950, undefined)).toBe(19950);
    expect(estimatedItemTotalMinor(101, 1.5)).toBe(152);
  });

  it("requires a period, a product or description, and exactly one price source", () => {
    expect(
      createGroceryPlanSchema.parse({
        period: "2026-10",
        name: "Compra octubre",
        currency: "UYU",
      }).period,
    ).toBe("2026-10");
    expect(() =>
      createGroceryPlanItemSchema.parse({ productId: "x" }),
    ).toThrow();
    expect(() =>
      createGroceryPlanItemSchema.parse({
        description: "Yerba",
        manualUnitPriceMinor: 100,
        suggestedPriceObservationId: "4cb8ba59-4a87-4e57-9dcd-46968c90e1e2",
      }),
    ).toThrow();
  });

  it("only accepts a suggested price for its matching product and plan currency", () => {
    const suggestion = {
      amountMinor: 19950,
      currency: "UYU",
      productId: "yerba",
    };
    expect(
      resolvePlannedUnitPriceMinor("UYU", "yerba", undefined, suggestion),
    ).toBe(19950);
    expect(
      resolvePlannedUnitPriceMinor("USD", "yerba", undefined, suggestion),
    ).toBeUndefined();
    expect(
      resolvePlannedUnitPriceMinor("UYU", "arroz", undefined, suggestion),
    ).toBeUndefined();
  });
});
