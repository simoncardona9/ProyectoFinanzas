import { and, asc, desc, eq, gte, lte } from "drizzle-orm";
import { db } from "@/db";
import { auditLogs, exchangeRates } from "@/db/schema";
import type {
  CreateExchangeRate,
  ListExchangeRates,
} from "./exchange-rate.schemas";

export const exchangeRateRepository = {
  async create(
    householdId: string,
    actorUserId: string,
    values: CreateExchangeRate,
  ) {
    return db.transaction(async (tx) => {
      const [exchangeRate] = await tx
        .insert(exchangeRates)
        .values({ householdId, ...values })
        .returning();
      await tx.insert(auditLogs).values({
        householdId,
        actorUserId,
        action: "create",
        entityType: "exchange_rate",
        entityId: exchangeRate.id,
        details: {
          baseCurrency: values.baseCurrency,
          quoteCurrency: values.quoteCurrency,
          rate: values.rate,
          effectiveDate: values.effectiveDate,
          source: values.source,
          kind: values.kind,
        },
      });
      return exchangeRate;
    });
  },
  list(householdId: string, filters: ListExchangeRates) {
    return db
      .select()
      .from(exchangeRates)
      .where(
        and(
          eq(exchangeRates.householdId, householdId),
          filters.baseCurrency
            ? eq(exchangeRates.baseCurrency, filters.baseCurrency)
            : undefined,
          filters.quoteCurrency
            ? eq(exchangeRates.quoteCurrency, filters.quoteCurrency)
            : undefined,
          filters.from
            ? gte(exchangeRates.effectiveDate, filters.from)
            : undefined,
          filters.to ? lte(exchangeRates.effectiveDate, filters.to) : undefined,
        ),
      )
      .orderBy(desc(exchangeRates.effectiveDate), asc(exchangeRates.createdAt));
  },
};
