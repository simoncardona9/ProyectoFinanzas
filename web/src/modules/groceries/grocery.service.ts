import type { AuthContext } from "@/shared/auth/auth.types";
import { ApiError } from "@/shared/errors/api-error";
import { normalizeGroceryName } from "./grocery.rules";
import { groceryRepository } from "./grocery.repository";
import type {
  CreateGroceryMarket,
  CreateGroceryPriceObservation,
  CreateGroceryProduct,
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
