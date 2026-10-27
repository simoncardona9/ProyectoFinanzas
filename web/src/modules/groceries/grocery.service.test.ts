import { beforeEach, describe, expect, it, vi } from "vitest";

const { groceryRepository } = vi.hoisted(() => ({
  groceryRepository: {
    findPlan: vi.fn(),
    findPaidExpense: vi.fn(),
    createPurchase: vi.fn(),
    findPublication: vi.fn(),
    findMarket: vi.fn(),
    findProduct: vi.fn(),
    findPriceObservation: vi.fn(),
    publishCatalogRecord: vi.fn(),
    searchPublicMarkets: vi.fn(),
    searchPublicProducts: vi.fn(),
    searchPublicPrices: vi.fn(),
    listAdoptions: vi.fn(),
    findAdoption: vi.fn(),
    findPublicMarket: vi.fn(),
    findPublicProduct: vi.fn(),
    findPublicPriceSuggestion: vi.fn(),
    adoptPublicCatalogRecord: vi.fn(),
  },
}));

vi.mock("./grocery.repository", () => ({ groceryRepository }));

import {
  addGroceryPurchase,
  adoptSharedGroceryCatalogRecord,
  publishGroceryCatalogRecord,
  searchSharedGroceryCatalog,
} from "./grocery.service";

const context = {
  user: { id: "user-id" },
  membership: { householdId: "household-id", role: "owner" },
} as never;

beforeEach(() => vi.resetAllMocks());

describe("addGroceryPurchase", () => {
  it("returns a conflict instead of an internal error for an already-linked expense", async () => {
    groceryRepository.findPlan.mockResolvedValue({
      status: "draft",
      currency: "UYU",
    });
    groceryRepository.findPaidExpense.mockResolvedValue({
      currency: "UYU",
      amountMinor: 15000,
    });
    groceryRepository.createPurchase.mockRejectedValue({
      code: "23505",
      constraint: "grocery_purchases_transaction_unique",
    });

    await expect(
      addGroceryPurchase(context, "plan-id", {
        transactionId: "transaction-id",
      }),
    ).rejects.toMatchObject({
      status: 409,
      code: "GROCERY_TRANSACTION_ALREADY_LINKED",
      message: "This paid transaction is already linked to a grocery plan.",
    });
  });
});

describe("publishGroceryCatalogRecord", () => {
  it("publishes only the approved price snapshot fields", async () => {
    groceryRepository.findPublication.mockResolvedValue(undefined);
    groceryRepository.findPriceObservation.mockResolvedValue({
      id: "price-id",
      householdId: "household-id",
      marketId: "market-id",
      productId: "product-id",
      amountMinor: 19950,
      currency: "UYU",
      observedDate: "2026-09-28",
      note: "private receipt detail",
    });
    groceryRepository.findMarket.mockResolvedValue({
      id: "market-id",
      householdId: "household-id",
      name: "Mercado sintético",
      normalizedName: "mercado sintetico",
    });
    groceryRepository.findProduct.mockResolvedValue({
      id: "product-id",
      householdId: "household-id",
      name: "Producto sintético",
      normalizedName: "producto sintetico",
    });
    groceryRepository.publishCatalogRecord.mockResolvedValue({
      id: "publication-id",
    });

    await publishGroceryCatalogRecord(context, {
      sourceType: "price",
      sourceId: "price-id",
    });

    expect(groceryRepository.publishCatalogRecord).toHaveBeenCalledWith(
      "household-id",
      "user-id",
      {
        sourceType: "price",
        sourceId: "price-id",
        market: {
          name: "Mercado sintético",
          normalizedName: "mercado sintetico",
        },
        product: {
          name: "Producto sintético",
          normalizedName: "producto sintetico",
        },
        amountMinor: 19950,
        currency: "UYU",
        observedDate: "2026-09-28",
      },
    );
  });

  it("does not publish a source outside the active household", async () => {
    groceryRepository.findPublication.mockResolvedValue(undefined);
    groceryRepository.findMarket.mockResolvedValue(undefined);

    await expect(
      publishGroceryCatalogRecord(context, {
        sourceType: "market",
        sourceId: "other-household-market-id",
      }),
    ).rejects.toMatchObject({
      status: 404,
      code: "GROCERY_PUBLICATION_SOURCE_NOT_FOUND",
    });
    expect(groceryRepository.publishCatalogRecord).not.toHaveBeenCalled();
  });

  it("returns the existing publication without creating another public record", async () => {
    const existing = {
      id: "publication-id",
      householdId: "household-id",
      sourceType: "product",
      sourceId: "product-id",
      publicMarketId: null,
      publicProductId: "public-product-id",
      publicPriceSuggestionId: null,
      createdAt: new Date("2026-09-28T12:00:00Z"),
    };
    groceryRepository.findPublication.mockResolvedValue(existing);

    await expect(
      publishGroceryCatalogRecord(context, {
        sourceType: "product",
        sourceId: "product-id",
      }),
    ).resolves.toEqual({
      id: "publication-id",
      sourceType: "product",
      sourceId: "product-id",
      createdAt: new Date("2026-09-28T12:00:00Z"),
    });
    expect(groceryRepository.findProduct).not.toHaveBeenCalled();
    expect(groceryRepository.publishCatalogRecord).not.toHaveBeenCalled();
  });
});

describe("searchSharedGroceryCatalog", () => {
  it("normalizes search, exposes duplicate hints, and returns only this household's adoption status", async () => {
    groceryRepository.searchPublicMarkets.mockResolvedValue([
      {
        id: "public-market-a",
        name: "Mercado Centro",
        normalizedName: "mercado centro",
      },
      {
        id: "public-market-b",
        name: "MERCADO-CENTRO",
        normalizedName: "mercado centro",
      },
    ]);
    groceryRepository.searchPublicProducts.mockResolvedValue([]);
    groceryRepository.searchPublicPrices.mockResolvedValue([]);
    groceryRepository.listAdoptions.mockResolvedValue([
      {
        sourceType: "market",
        publicSourceId: "public-market-a",
      },
    ]);

    const result = await searchSharedGroceryCatalog(context, {
      query: "  Mércado-Centro ",
    });

    expect(groceryRepository.searchPublicMarkets).toHaveBeenCalledWith(
      "mercado centro",
    );
    expect(groceryRepository.listAdoptions).toHaveBeenCalledWith(
      "household-id",
    );
    expect(result.markets).toEqual([
      expect.objectContaining({
        id: "public-market-a",
        adopted: true,
        aliases: ["MERCADO-CENTRO"],
        possibleDuplicates: [{ id: "public-market-b", name: "MERCADO-CENTRO" }],
      }),
      expect.objectContaining({
        id: "public-market-b",
        adopted: false,
      }),
    ]);
  });
});

describe("adoptSharedGroceryCatalogRecord", () => {
  it("copies only the sanitized public price snapshot into the active household", async () => {
    groceryRepository.findAdoption.mockResolvedValue(undefined);
    groceryRepository.findPublicPriceSuggestion.mockResolvedValue({
      id: "public-price-id",
      market: {
        name: "Mercado compartido",
        normalizedName: "mercado compartido",
      },
      product: {
        name: "Producto compartido",
        normalizedName: "producto compartido",
      },
      amountMinor: 24550,
      currency: "UYU",
      observedDate: "2026-09-28",
    });
    groceryRepository.adoptPublicCatalogRecord.mockResolvedValue({
      id: "adoption-id",
      sourceType: "price",
      publicSourceId: "public-price-id",
      groceryMarketId: "local-market-id",
      groceryProductId: "local-product-id",
      groceryPriceObservationId: "local-price-id",
      createdAt: new Date("2026-09-28T18:00:00Z"),
    });

    await expect(
      adoptSharedGroceryCatalogRecord(context, {
        sourceType: "price",
        publicSourceId: "public-price-id",
      }),
    ).resolves.toMatchObject({
      id: "adoption-id",
      localSourceId: "local-price-id",
    });
    expect(groceryRepository.adoptPublicCatalogRecord).toHaveBeenCalledWith(
      "household-id",
      "user-id",
      {
        sourceType: "price",
        publicSourceId: "public-price-id",
        market: {
          name: "Mercado compartido",
          normalizedName: "mercado compartido",
        },
        product: {
          name: "Producto compartido",
          normalizedName: "producto compartido",
        },
        amountMinor: 24550,
        currency: "UYU",
        observedDate: "2026-09-28",
      },
    );
  });

  it("returns an existing household adoption without copying again", async () => {
    groceryRepository.findAdoption.mockResolvedValue({
      id: "adoption-id",
      sourceType: "product",
      publicSourceId: "public-product-id",
      groceryMarketId: null,
      groceryProductId: "local-product-id",
      groceryPriceObservationId: null,
      createdAt: new Date("2026-09-28T18:00:00Z"),
    });

    await expect(
      adoptSharedGroceryCatalogRecord(context, {
        sourceType: "product",
        publicSourceId: "public-product-id",
      }),
    ).resolves.toMatchObject({ localSourceId: "local-product-id" });
    expect(groceryRepository.findPublicProduct).not.toHaveBeenCalled();
    expect(groceryRepository.adoptPublicCatalogRecord).not.toHaveBeenCalled();
  });
});
