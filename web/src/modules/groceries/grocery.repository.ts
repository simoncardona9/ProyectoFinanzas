import { and, asc, desc, eq, inArray } from "drizzle-orm";
import { db } from "@/db";
import {
  groceryMarkets,
  groceryPlanItems,
  groceryPlans,
  groceryPurchases,
  groceryPriceObservations,
  groceryProducts,
  groceryReceiptLines,
  transactions,
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
  listPlans(householdId: string) {
    return db
      .select({
        id: groceryPlans.id,
        periodStart: groceryPlans.targetPeriodStart,
        name: groceryPlans.name,
        currency: groceryPlans.currency,
        status: groceryPlans.status,
        preferredMarketId: groceryPlans.preferredMarketId,
        preferredMarketName: groceryMarkets.name,
        createdAt: groceryPlans.createdAt,
      })
      .from(groceryPlans)
      .leftJoin(
        groceryMarkets,
        eq(groceryPlans.preferredMarketId, groceryMarkets.id),
      )
      .where(eq(groceryPlans.householdId, householdId))
      .orderBy(desc(groceryPlans.targetPeriodStart), asc(groceryPlans.name));
  },
  findPlan(householdId: string, id: string) {
    return db.query.groceryPlans.findFirst({
      where: and(
        eq(groceryPlans.id, id),
        eq(groceryPlans.householdId, householdId),
      ),
    });
  },
  findPaidExpense(householdId: string, id: string) {
    return db.query.transactions.findFirst({
      where: and(
        eq(transactions.id, id),
        eq(transactions.householdId, householdId),
        eq(transactions.status, "paid"),
        eq(transactions.type, "expense"),
      ),
    });
  },
  findPlanItem(householdId: string, id: string) {
    return db.query.groceryPlanItems.findFirst({
      where: and(eq(groceryPlanItems.id, id), eq(groceryPlanItems.householdId, householdId)),
    });
  },
  async createPurchase(
    householdId: string,
    values: { groceryPlanId: string; transactionId: string; receiptLines?: Array<{ groceryPlanItemId?: string; description: string; quantity?: number; unit?: string; unitPriceMinor?: number; totalMinor: number }> },
  ) {
    return db.transaction(async (tx) => {
      const [purchase] = await tx.insert(groceryPurchases).values({
        householdId,
        groceryPlanId: values.groceryPlanId,
        transactionId: values.transactionId,
      }).returning();
      if (values.receiptLines?.length) await tx.insert(groceryReceiptLines).values(
        values.receiptLines.map((line) => ({
          householdId,
          groceryPurchaseId: purchase.id,
          groceryPlanItemId: line.groceryPlanItemId,
          description: line.description,
          quantity: line.quantity?.toFixed(3),
          unit: line.unit,
          unitPriceMinor: line.unitPriceMinor,
          totalMinor: line.totalMinor,
        })),
      );
      return purchase;
    });
  },
  async createPlan(
    householdId: string,
    values: Omit<typeof groceryPlans.$inferInsert, "householdId">,
  ) {
    const [plan] = await db
      .insert(groceryPlans)
      .values({ ...values, householdId })
      .returning();
    return plan;
  },
  async updatePlan(
    householdId: string,
    id: string,
    values: Partial<Omit<typeof groceryPlans.$inferInsert, "householdId">>,
  ) {
    const [plan] = await db
      .update(groceryPlans)
      .set({ ...values, updatedAt: new Date() })
      .where(
        and(eq(groceryPlans.id, id), eq(groceryPlans.householdId, householdId)),
      )
      .returning();
    return plan;
  },
  async createPlanItem(
    householdId: string,
    values: Omit<typeof groceryPlanItems.$inferInsert, "householdId">,
  ) {
    const [item] = await db
      .insert(groceryPlanItems)
      .values({ ...values, householdId })
      .returning();
    return item;
  },
  findPriceObservation(householdId: string, id: string) {
    return db.query.groceryPriceObservations.findFirst({
      where: and(
        eq(groceryPriceObservations.id, id),
        eq(groceryPriceObservations.householdId, householdId),
      ),
    });
  },
  async planDetail(householdId: string, id: string) {
    const [plan] = await Promise.all([this.findPlan(householdId, id)]);
    if (!plan) return undefined;
    const [market, items, purchases] = await Promise.all([
      plan.preferredMarketId
        ? this.findMarket(householdId, plan.preferredMarketId)
        : undefined,
      db
        .select({
          id: groceryPlanItems.id,
          productId: groceryPlanItems.productId,
          productName: groceryProducts.name,
          description: groceryPlanItems.description,
          quantity: groceryPlanItems.quantity,
          unit: groceryPlanItems.unit,
          plannedUnitPriceMinor: groceryPlanItems.plannedUnitPriceMinor,
          suggestedPriceObservationId:
            groceryPlanItems.suggestedPriceObservationId,
          createdAt: groceryPlanItems.createdAt,
        })
        .from(groceryPlanItems)
        .leftJoin(
          groceryProducts,
          eq(groceryPlanItems.productId, groceryProducts.id),
        )
        .where(
          and(
            eq(groceryPlanItems.householdId, householdId),
            eq(groceryPlanItems.groceryPlanId, id),
          ),
        )
        .orderBy(asc(groceryPlanItems.createdAt)),
      db
        .select({
          id: groceryPurchases.id,
          transactionId: transactions.id,
          date: transactions.date,
          description: transactions.description,
          amountMinor: transactions.amountMinor,
          currency: transactions.currency,
        })
        .from(groceryPurchases)
        .innerJoin(transactions, eq(groceryPurchases.transactionId, transactions.id))
        .where(and(eq(groceryPurchases.householdId, householdId), eq(groceryPurchases.groceryPlanId, id)))
        .orderBy(asc(transactions.date), asc(groceryPurchases.createdAt)),
    ]);
    const receiptLines = purchases.length
      ? await db.select({
          groceryPurchaseId: groceryReceiptLines.groceryPurchaseId,
          groceryPlanItemId: groceryReceiptLines.groceryPlanItemId,
          description: groceryReceiptLines.description,
          quantity: groceryReceiptLines.quantity,
          unit: groceryReceiptLines.unit,
          unitPriceMinor: groceryReceiptLines.unitPriceMinor,
          totalMinor: groceryReceiptLines.totalMinor,
        }).from(groceryReceiptLines).where(and(eq(groceryReceiptLines.householdId, householdId), inArray(groceryReceiptLines.groceryPurchaseId, purchases.map((purchase) => purchase.id))))
      : [];
    return { plan, preferredMarketName: market?.name ?? null, items, purchases, receiptLines };
  },
};
