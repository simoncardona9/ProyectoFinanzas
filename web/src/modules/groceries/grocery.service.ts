import type { AuthContext } from "@/shared/auth/auth.types";
import { ApiError } from "@/shared/errors/api-error";
import { normalizeGroceryName } from "./grocery.rules";
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
  UpdateGroceryPlan,
} from "./grocery.schemas";

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
  return {
    ...detail,
    plan: { ...detail.plan, period: detail.plan.targetPeriodStart.slice(0, 7) },
    items,
    estimatedTotalMinor: items.reduce(
      (sum, item) => sum + item.estimatedTotalMinor,
      0,
    ),
  };
}
