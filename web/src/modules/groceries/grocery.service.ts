import type { AuthContext } from "@/shared/auth/auth.types";
import { ApiError } from "@/shared/errors/api-error";
import {
  normalizeGroceryName,
  withSharedDuplicateMetadata,
} from "./grocery.rules";
import {
  estimatedItemTotalMinor,
  resolvePlannedUnitPriceMinor,
} from "./grocery-plan.rules";
import { groceryRepository } from "./grocery.repository";
import type {
  CreateGroceryMarket,
  CreateGroceryPriceObservation,
  CreateGroceryProduct,
  CreateGroceryPlan,
  CreateGroceryPlanItem,
  CreateGroceryPurchase,
  AdoptSharedGroceryCatalogRecord,
  PublishGroceryCatalogRecord,
  SearchSharedGroceryCatalog,
  UpdateGroceryPlan,
} from "./grocery.schemas";
import { receiptLinesTotalMinor } from "./grocery-plan.rules";

export function createGroceryMarket(
  context: AuthContext,
  values: CreateGroceryMarket,
) {
  return groceryRepository.createMarket(
    context.membership.householdId,
    values.name,
    normalizeGroceryName(values.name),
  );
}

export function createGroceryProduct(
  context: AuthContext,
  values: CreateGroceryProduct,
) {
  return groceryRepository.createProduct(
    context.membership.householdId,
    values.name,
    normalizeGroceryName(values.name),
  );
}

export async function createGroceryPriceObservation(
  context: AuthContext,
  values: CreateGroceryPriceObservation,
) {
  const householdId = context.membership.householdId;
  const [market, product] = await Promise.all([
    groceryRepository.findMarket(householdId, values.marketId),
    groceryRepository.findProduct(householdId, values.productId),
  ]);
  if (!market || !product)
    throw new ApiError(
      404,
      "GROCERY_CATALOG_ITEM_NOT_FOUND",
      "Market or product was not found in this household.",
    );
  return groceryRepository.createPriceObservation(householdId, values);
}

function publicationStatus(publication: {
  id: string;
  sourceType: "market" | "product" | "price";
  sourceId: string;
  createdAt: Date;
}) {
  return {
    id: publication.id,
    sourceType: publication.sourceType,
    sourceId: publication.sourceId,
    createdAt: publication.createdAt,
  };
}

/** Copies only the approved catalog fields into identity-free public tables.
 * The private publication link and audit event remain household-scoped. */
export async function publishGroceryCatalogRecord(
  context: AuthContext,
  values: PublishGroceryCatalogRecord,
) {
  const householdId = context.membership.householdId;
  const existing = await groceryRepository.findPublication(
    householdId,
    values.sourceType,
    values.sourceId,
  );
  if (existing) return publicationStatus(existing);

  let snapshot:
    | {
        sourceType: "market";
        sourceId: string;
        name: string;
        normalizedName: string;
      }
    | {
        sourceType: "product";
        sourceId: string;
        name: string;
        normalizedName: string;
      }
    | {
        sourceType: "price";
        sourceId: string;
        market: { name: string; normalizedName: string };
        product: { name: string; normalizedName: string };
        amountMinor: number;
        currency: string;
        observedDate: string;
      };

  if (values.sourceType === "market") {
    const market = await groceryRepository.findMarket(
      householdId,
      values.sourceId,
    );
    if (!market)
      throw new ApiError(
        404,
        "GROCERY_PUBLICATION_SOURCE_NOT_FOUND",
        "Market was not found in this household.",
      );
    snapshot = {
      sourceType: "market",
      sourceId: market.id,
      name: market.name,
      normalizedName: market.normalizedName,
    };
  } else if (values.sourceType === "product") {
    const product = await groceryRepository.findProduct(
      householdId,
      values.sourceId,
    );
    if (!product)
      throw new ApiError(
        404,
        "GROCERY_PUBLICATION_SOURCE_NOT_FOUND",
        "Product was not found in this household.",
      );
    snapshot = {
      sourceType: "product",
      sourceId: product.id,
      name: product.name,
      normalizedName: product.normalizedName,
    };
  } else {
    const observation = await groceryRepository.findPriceObservation(
      householdId,
      values.sourceId,
    );
    if (!observation)
      throw new ApiError(
        404,
        "GROCERY_PUBLICATION_SOURCE_NOT_FOUND",
        "Price observation was not found in this household.",
      );
    const [market, product] = await Promise.all([
      groceryRepository.findMarket(householdId, observation.marketId),
      groceryRepository.findProduct(householdId, observation.productId),
    ]);
    if (!market || !product)
      throw new ApiError(
        409,
        "GROCERY_PUBLICATION_SOURCE_INVALID",
        "The price observation no longer has an eligible market and product.",
      );
    snapshot = {
      sourceType: "price",
      sourceId: observation.id,
      market: {
        name: market.name,
        normalizedName: market.normalizedName,
      },
      product: {
        name: product.name,
        normalizedName: product.normalizedName,
      },
      amountMinor: observation.amountMinor,
      currency: observation.currency,
      observedDate: observation.observedDate,
    };
  }

  try {
    return publicationStatus(
      await groceryRepository.publishCatalogRecord(
        householdId,
        context.user.id,
        snapshot,
      ),
    );
  } catch (error) {
    const databaseError =
      typeof error === "object" && error !== null && "cause" in error
        ? error.cause
        : error;
    if (
      typeof databaseError === "object" &&
      databaseError !== null &&
      "code" in databaseError &&
      databaseError.code === "23505"
    ) {
      const publication = await groceryRepository.findPublication(
        householdId,
        values.sourceType,
        values.sourceId,
      );
      if (publication) return publicationStatus(publication);
    }
    throw error;
  }
}

function adoptionStatus(adoption: {
  id: string;
  sourceType: "market" | "product" | "price";
  publicSourceId: string;
  groceryMarketId: string | null;
  groceryProductId: string | null;
  groceryPriceObservationId: string | null;
  createdAt: Date;
}) {
  const localSourceId =
    adoption.sourceType === "price"
      ? adoption.groceryPriceObservationId
      : adoption.sourceType === "product"
        ? adoption.groceryProductId
        : adoption.groceryMarketId;
  if (!localSourceId)
    throw new Error("Catalog adoption is missing its private target.");
  return {
    id: adoption.id,
    sourceType: adoption.sourceType,
    publicSourceId: adoption.publicSourceId,
    localSourceId,
    createdAt: adoption.createdAt,
  };
}

export async function searchSharedGroceryCatalog(
  context: AuthContext,
  values: SearchSharedGroceryCatalog,
) {
  const normalizedQuery = normalizeGroceryName(values.query);
  const [markets, products, prices, adoptions] = await Promise.all([
    groceryRepository.searchPublicMarkets(normalizedQuery),
    groceryRepository.searchPublicProducts(normalizedQuery),
    groceryRepository.searchPublicPrices(normalizedQuery),
    groceryRepository.listAdoptions(context.membership.householdId),
  ]);
  const adopted = new Set(
    adoptions.map(
      (adoption) => `${adoption.sourceType}:${adoption.publicSourceId}`,
    ),
  );

  return {
    query: values.query,
    normalizedQuery,
    markets: withSharedDuplicateMetadata(markets).map((market) => ({
      ...market,
      adopted: adopted.has(`market:${market.id}`),
    })),
    products: withSharedDuplicateMetadata(products).map((product) => ({
      ...product,
      adopted: adopted.has(`product:${product.id}`),
    })),
    prices: prices.map((price) => ({
      id: price.id,
      market: { id: price.marketId, name: price.marketName },
      product: { id: price.productId, name: price.productName },
      amountMinor: price.amountMinor,
      currency: price.currency,
      observedDate: price.observedDate,
      adopted: adopted.has(`price:${price.id}`),
    })),
  };
}

/** Adoption copies only the already-sanitized public snapshot. It never reads
 * the publishing household link and never creates a financial movement. */
export async function adoptSharedGroceryCatalogRecord(
  context: AuthContext,
  values: AdoptSharedGroceryCatalogRecord,
) {
  const householdId = context.membership.householdId;
  const existing = await groceryRepository.findAdoption(
    householdId,
    values.sourceType,
    values.publicSourceId,
  );
  if (existing) return adoptionStatus(existing);

  let snapshot:
    | {
        sourceType: "market";
        publicSourceId: string;
        name: string;
        normalizedName: string;
      }
    | {
        sourceType: "product";
        publicSourceId: string;
        name: string;
        normalizedName: string;
      }
    | {
        sourceType: "price";
        publicSourceId: string;
        market: { name: string; normalizedName: string };
        product: { name: string; normalizedName: string };
        amountMinor: number;
        currency: string;
        observedDate: string;
      };

  if (values.sourceType === "market") {
    const market = await groceryRepository.findPublicMarket(
      values.publicSourceId,
    );
    if (!market)
      throw new ApiError(
        404,
        "SHARED_GROCERY_SOURCE_NOT_FOUND",
        "Shared market was not found.",
      );
    snapshot = {
      sourceType: "market",
      publicSourceId: market.id,
      name: market.name,
      normalizedName: market.normalizedName,
    };
  } else if (values.sourceType === "product") {
    const product = await groceryRepository.findPublicProduct(
      values.publicSourceId,
    );
    if (!product)
      throw new ApiError(
        404,
        "SHARED_GROCERY_SOURCE_NOT_FOUND",
        "Shared product was not found.",
      );
    snapshot = {
      sourceType: "product",
      publicSourceId: product.id,
      name: product.name,
      normalizedName: product.normalizedName,
    };
  } else {
    const price = await groceryRepository.findPublicPriceSuggestion(
      values.publicSourceId,
    );
    if (!price)
      throw new ApiError(
        404,
        "SHARED_GROCERY_SOURCE_NOT_FOUND",
        "Shared price suggestion was not found.",
      );
    snapshot = {
      sourceType: "price",
      publicSourceId: price.id,
      market: price.market,
      product: price.product,
      amountMinor: price.amountMinor,
      currency: price.currency,
      observedDate: price.observedDate,
    };
  }

  try {
    return adoptionStatus(
      await groceryRepository.adoptPublicCatalogRecord(
        householdId,
        context.user.id,
        snapshot,
      ),
    );
  } catch (error) {
    const databaseError =
      typeof error === "object" && error !== null && "cause" in error
        ? error.cause
        : error;
    if (
      typeof databaseError === "object" &&
      databaseError !== null &&
      "code" in databaseError &&
      databaseError.code === "23505"
    ) {
      const adoption = await groceryRepository.findAdoption(
        householdId,
        values.sourceType,
        values.publicSourceId,
      );
      if (adoption) return adoptionStatus(adoption);
    }
    throw error;
  }
}

function planResult<
  T extends { quantity: string | null; plannedUnitPriceMinor: number },
>(plan: T) {
  const quantity = plan.quantity === null ? undefined : Number(plan.quantity);
  return {
    ...plan,
    quantity,
    estimatedTotalMinor: estimatedItemTotalMinor(
      plan.plannedUnitPriceMinor,
      quantity,
    ),
  };
}

export async function createGroceryPlan(
  context: AuthContext,
  values: CreateGroceryPlan,
) {
  const householdId = context.membership.householdId;
  if (
    values.preferredMarketId &&
    !(await groceryRepository.findMarket(householdId, values.preferredMarketId))
  ) {
    throw new ApiError(
      404,
      "GROCERY_MARKET_NOT_FOUND",
      "Market was not found in this household.",
    );
  }
  return groceryRepository.createPlan(householdId, {
    targetPeriodStart: `${values.period}-01`,
    name: values.name,
    currency: values.currency,
    preferredMarketId: values.preferredMarketId,
  });
}

export async function updateGroceryPlan(
  context: AuthContext,
  id: string,
  values: UpdateGroceryPlan,
) {
  const householdId = context.membership.householdId;
  if (!(await groceryRepository.findPlan(householdId, id))) {
    throw new ApiError(
      404,
      "GROCERY_PLAN_NOT_FOUND",
      "Grocery plan was not found in this household.",
    );
  }
  if (
    values.preferredMarketId &&
    !(await groceryRepository.findMarket(householdId, values.preferredMarketId))
  ) {
    throw new ApiError(
      404,
      "GROCERY_MARKET_NOT_FOUND",
      "Market was not found in this household.",
    );
  }
  return groceryRepository.updatePlan(householdId, id, values);
}

export async function addGroceryPlanItem(
  context: AuthContext,
  planId: string,
  values: CreateGroceryPlanItem,
) {
  const householdId = context.membership.householdId;
  const plan = await groceryRepository.findPlan(householdId, planId);
  if (!plan)
    throw new ApiError(
      404,
      "GROCERY_PLAN_NOT_FOUND",
      "Grocery plan was not found in this household.",
    );
  if (plan.status === "cancelled")
    throw new ApiError(
      409,
      "GROCERY_PLAN_CANCELLED",
      "Cancelled grocery plans cannot receive items.",
    );
  if (
    values.productId &&
    !(await groceryRepository.findProduct(householdId, values.productId))
  ) {
    throw new ApiError(
      404,
      "GROCERY_PRODUCT_NOT_FOUND",
      "Product was not found in this household.",
    );
  }
  let plannedUnitPriceMinor = values.manualUnitPriceMinor;
  if (values.suggestedPriceObservationId) {
    const suggestion = await groceryRepository.findPriceObservation(
      householdId,
      values.suggestedPriceObservationId,
    );
    if (!suggestion)
      throw new ApiError(
        404,
        "GROCERY_PRICE_NOT_FOUND",
        "Price suggestion was not found in this household.",
      );
    plannedUnitPriceMinor = resolvePlannedUnitPriceMinor(
      plan.currency,
      values.productId,
      plannedUnitPriceMinor,
      suggestion,
    );
    if (plannedUnitPriceMinor === undefined) {
      throw new ApiError(
        422,
        "INVALID_GROCERY_PRICE_SUGGESTION",
        "The suggested price must match this plan's product and currency.",
      );
    }
  }
  const item = await groceryRepository.createPlanItem(householdId, {
    groceryPlanId: plan.id,
    productId: values.productId,
    description: values.description,
    quantity: values.quantity?.toFixed(3),
    unit: values.unit,
    plannedUnitPriceMinor: plannedUnitPriceMinor!,
    suggestedPriceObservationId: values.suggestedPriceObservationId,
  });
  return planResult(item);
}

export async function getGroceryPlanDetail(context: AuthContext, id: string) {
  const detail = await groceryRepository.planDetail(
    context.membership.householdId,
    id,
  );
  if (!detail)
    throw new ApiError(
      404,
      "GROCERY_PLAN_NOT_FOUND",
      "Grocery plan was not found in this household.",
    );
  const items = detail.items.map(planResult);
  const receiptActualByItem = new Map<string, number>();
  for (const line of detail.receiptLines) {
    if (line.groceryPlanItemId)
      receiptActualByItem.set(
        line.groceryPlanItemId,
        (receiptActualByItem.get(line.groceryPlanItemId) ?? 0) +
          line.totalMinor,
      );
  }
  const actualTotalMinor = detail.purchases.reduce(
    (total, purchase) => total + purchase.amountMinor,
    0,
  );
  return {
    ...detail,
    plan: { ...detail.plan, period: detail.plan.targetPeriodStart.slice(0, 7) },
    items: items.map((item) => ({
      ...item,
      actualTotalMinor: receiptActualByItem.get(item.id) ?? 0,
    })),
    estimatedTotalMinor: items.reduce(
      (sum, item) => sum + item.estimatedTotalMinor,
      0,
    ),
    actualTotalMinor,
    differenceMinor:
      actualTotalMinor -
      items.reduce((sum, item) => sum + item.estimatedTotalMinor, 0),
    purchases: detail.purchases,
    receiptLines: detail.receiptLines.map((line) => ({
      ...line,
      quantity: line.quantity === null ? undefined : Number(line.quantity),
    })),
  };
}

export async function addGroceryPurchase(
  context: AuthContext,
  planId: string,
  values: CreateGroceryPurchase,
) {
  const householdId = context.membership.householdId;
  const [plan, transaction] = await Promise.all([
    groceryRepository.findPlan(householdId, planId),
    groceryRepository.findPaidExpense(householdId, values.transactionId),
  ]);
  if (!plan)
    throw new ApiError(
      404,
      "GROCERY_PLAN_NOT_FOUND",
      "Grocery plan was not found in this household.",
    );
  if (!transaction)
    throw new ApiError(
      422,
      "INVALID_GROCERY_TRANSACTION",
      "Select an existing paid expense from this household.",
    );
  if (plan.status === "cancelled")
    throw new ApiError(
      409,
      "GROCERY_PLAN_CANCELLED",
      "Cancelled grocery plans cannot receive purchases.",
    );
  if (transaction.currency !== plan.currency)
    throw new ApiError(
      422,
      "GROCERY_PURCHASE_CURRENCY_MISMATCH",
      "The paid transaction currency must match the plan currency.",
    );
  if (values.receiptLines) {
    if (receiptLinesTotalMinor(values.receiptLines) !== transaction.amountMinor)
      throw new ApiError(
        422,
        "RECEIPT_TOTAL_MISMATCH",
        "Receipt lines must total the linked paid transaction exactly.",
      );
    for (const line of values.receiptLines) {
      if (!line.groceryPlanItemId) continue;
      const item = await groceryRepository.findPlanItem(
        householdId,
        line.groceryPlanItemId,
      );
      if (!item || item.groceryPlanId !== planId)
        throw new ApiError(
          422,
          "INVALID_GROCERY_PLAN_ITEM",
          "Receipt lines may only reference items in this plan.",
        );
    }
  }
  try {
    return await groceryRepository.createPurchase(householdId, {
      groceryPlanId: planId,
      ...values,
    });
  } catch (error) {
    const databaseError =
      typeof error === "object" && error !== null && "cause" in error
        ? error.cause
        : error;
    if (
      (typeof databaseError === "object" &&
        databaseError !== null &&
        "code" in databaseError &&
        databaseError.code === "23505") ||
      (error instanceof Error &&
        error.message.includes("grocery_purchases_transaction_unique"))
    )
      throw new ApiError(
        409,
        "GROCERY_TRANSACTION_ALREADY_LINKED",
        "This paid transaction is already linked to a grocery plan.",
      );
    throw error;
  }
}
