import { and, asc, desc, eq } from "drizzle-orm";
import { db } from "@/db";
import {
  groceryMarkets,
  groceryPriceObservations,
  groceryProducts,
} from "@/db/schema";

export const groceryRepository = {
  listMarkets(householdId: string) {
    return db.query.groceryMarkets.findMany({
      where: eq(groceryMarkets.householdId, householdId),
      orderBy: [asc(groceryMarkets.name), asc(groceryMarkets.createdAt)],
    });
  },
  listProducts(householdId: string) {
    return db.query.groceryProducts.findMany({
      where: eq(groceryProducts.householdId, householdId),
      orderBy: [asc(groceryProducts.name), asc(groceryProducts.createdAt)],
    });
  },
  async createMarket(
    householdId: string,
    name: string,
    normalizedName: string,
  ) {
    const [market] = await db
      .insert(groceryMarkets)
      .values({ householdId, name, normalizedName })
      .returning();
    return market;
  },
  async createProduct(
    householdId: string,
    name: string,
    normalizedName: string,
  ) {
    const [product] = await db
      .insert(groceryProducts)
      .values({ householdId, name, normalizedName })
      .returning();
    return product;
  },
  findMarket(householdId: string, id: string) {
    return db.query.groceryMarkets.findFirst({
      where: and(
        eq(groceryMarkets.id, id),
        eq(groceryMarkets.householdId, householdId),
      ),
    });
  },
  findProduct(householdId: string, id: string) {
    return db.query.groceryProducts.findFirst({
      where: and(
        eq(groceryProducts.id, id),
        eq(groceryProducts.householdId, householdId),
      ),
    });
  },
  async createPriceObservation(
    householdId: string,
    values: Omit<typeof groceryPriceObservations.$inferInsert, "householdId">,
  ) {
    const [observation] = await db
      .insert(groceryPriceObservations)
      .values({ ...values, householdId })
      .returning();
    return observation;
  },
  listPriceObservations(householdId: string) {
    return db
      .select({
        id: groceryPriceObservations.id,
        marketId: groceryPriceObservations.marketId,
        marketName: groceryMarkets.name,
        productId: groceryPriceObservations.productId,
        productName: groceryProducts.name,
        amountMinor: groceryPriceObservations.amountMinor,
        currency: groceryPriceObservations.currency,
        observedDate: groceryPriceObservations.observedDate,
        note: groceryPriceObservations.note,
        createdAt: groceryPriceObservations.createdAt,
      })
      .from(groceryPriceObservations)
      .innerJoin(
        groceryMarkets,
        eq(groceryPriceObservations.marketId, groceryMarkets.id),
      )
      .innerJoin(
        groceryProducts,
        eq(groceryPriceObservations.productId, groceryProducts.id),
      )
      .where(eq(groceryPriceObservations.householdId, householdId))
      .orderBy(
        desc(groceryPriceObservations.observedDate),
        desc(groceryPriceObservations.createdAt),
      );
  },
};
