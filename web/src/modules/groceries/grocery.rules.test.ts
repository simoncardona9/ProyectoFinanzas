import { describe, expect, it } from "vitest";
import {
  adoptSharedGroceryCatalogRecordSchema,
  createGroceryPriceObservationSchema,
  publishGroceryCatalogRecordSchema,
  searchSharedGroceryCatalogSchema,
} from "./grocery.schemas";
import {
  normalizeGroceryName,
  withSharedDuplicateMetadata,
} from "./grocery.rules";

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

  it("accepts only an explicit catalog source kind and UUID", () => {
    const sourceId = "4cb8ba59-4a87-4e57-9dcd-46968c90e1e2";
    expect(
      publishGroceryCatalogRecordSchema.parse({
        sourceType: "market",
        sourceId,
      }),
    ).toEqual({ sourceType: "market", sourceId });
    expect(() =>
      publishGroceryCatalogRecordSchema.parse({
        sourceType: "plan",
        sourceId,
      }),
    ).toThrow();
  });

  it("requires a useful shared search query and explicit adoption source", () => {
    expect(
      searchSharedGroceryCatalogSchema.parse({ query: "  Cañarias " }),
    ).toEqual({ query: "Cañarias" });
    expect(() =>
      searchSharedGroceryCatalogSchema.parse({ query: "x" }),
    ).toThrow();
    expect(() =>
      searchSharedGroceryCatalogSchema.parse({ query: "--" }),
    ).toThrow();
    expect(
      adoptSharedGroceryCatalogRecordSchema.parse({
        sourceType: "product",
        publicSourceId: "4cb8ba59-4a87-4e57-9dcd-46968c90e1e2",
      }),
    ).toEqual({
      sourceType: "product",
      publicSourceId: "4cb8ba59-4a87-4e57-9dcd-46968c90e1e2",
    });
  });

  it("shows normalized aliases as duplicate hints without merging records", () => {
    const results = withSharedDuplicateMetadata([
      {
        id: "branch-a",
        name: "Mercado Centro",
        normalizedName: "mercado centro",
      },
      {
        id: "branch-b",
        name: "MERCADO-CENTRO",
        normalizedName: "mercado centro",
      },
      {
        id: "branch-c",
        name: "Mercado Norte",
        normalizedName: "mercado norte",
      },
    ]);

    expect(results).toHaveLength(3);
    expect(results[0]).toMatchObject({
      aliases: ["MERCADO-CENTRO"],
      possibleDuplicates: [{ id: "branch-b", name: "MERCADO-CENTRO" }],
    });
    expect(results[2]).toMatchObject({ aliases: [], possibleDuplicates: [] });
  });
});
