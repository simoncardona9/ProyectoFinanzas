import { describe, expect, it } from "vitest";
import { createGroceryPriceObservationSchema } from "./grocery.schemas";
import { normalizeGroceryName } from "./grocery.rules";

describe("grocery catalog rules", () => {
  it("normalizes case, accents, punctuation, and repeated whitespace for duplicate suggestions", () => {
    expect(normalizeGroceryName("  Yerba   Cañarias 1-kg! ")).toBe(
      "yerba canarias 1 kg",
    );
  });

  it("requires a positive, whole-minor-unit price observation", () => {
    const valid = {
      marketId: "4cb8ba59-4a87-4e57-9dcd-46968c90e1e2",
      productId: "cb33a49c-77ca-4f76-a285-f42f3a1d5e59",
      amountMinor: 19950,
      currency: "UYU",
      observedDate: "2026-09-25",
    };
    expect(createGroceryPriceObservationSchema.parse(valid).amountMinor).toBe(
      19950,
    );
    expect(() =>
      createGroceryPriceObservationSchema.parse({ ...valid, amountMinor: 0 }),
    ).toThrow();
    expect(() =>
      createGroceryPriceObservationSchema.parse({ ...valid, amountMinor: 1.5 }),
    ).toThrow();
  });
});
