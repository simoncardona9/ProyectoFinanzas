import { and, asc, eq, gte, lte, ne } from "drizzle-orm";
import { db } from "@/db";
import {
  categories,
  invoiceCollections,
  invoices,
  taxReserveSettlements,
  taxReserves,
  transactions,
} from "@/db/schema";
import type { CategoryTaxReportQuery } from "./category-tax-report.schemas";

export const categoryTaxReportRepository = {
  async reportRows(householdId: string, range: CategoryTaxReportQuery) {
    const [expenses, invoiceRows, collectionRows, reserveRows, settlementRows] =
      await Promise.all([
        db
          .select({
            id: transactions.id,
            date: transactions.date,
            amountMinor: transactions.amountMinor,
            currency: transactions.currency,
            description: transactions.description,
            categoryId: categories.id,
            categoryName: categories.name,
          })
          .from(transactions)
          .innerJoin(categories, eq(transactions.categoryId, categories.id))
          .where(
            and(
              eq(transactions.householdId, householdId),
              eq(transactions.status, "paid"),
              eq(transactions.type, "expense"),
              gte(transactions.date, range.from),
              lte(transactions.date, range.to),
            ),
          )
          .orderBy(asc(transactions.date), asc(transactions.createdAt)),
        db
          .select({
            id: invoices.id,
            serviceDate: invoices.serviceDate,
            currency: invoices.currency,
            grossAmountMinor: invoices.grossAmountMinor,
            netAmountMinor: invoices.netAmountMinor,
            ivaAmountMinor: invoices.ivaAmountMinor,
          })
          .from(invoices)
          .where(
            and(
              eq(invoices.householdId, householdId),
              ne(invoices.status, "cancelled"),
              gte(invoices.serviceDate, range.from),
              lte(invoices.serviceDate, range.to),
            ),
          ),
        db
          .select({
            id: invoiceCollections.id,
            invoiceId: invoices.id,
            date: transactions.date,
            currency: invoices.currency,
            amountMinor: invoiceCollections.amountMinor,
          })
          .from(invoiceCollections)
          .innerJoin(invoices, eq(invoiceCollections.invoiceId, invoices.id))
          .innerJoin(
            transactions,
            eq(invoiceCollections.transactionId, transactions.id),
          )
          .where(
            and(
              eq(invoices.householdId, householdId),
              eq(transactions.status, "paid"),
              gte(transactions.date, range.from),
              lte(transactions.date, range.to),
            ),
          ),
        db
          .select({
            id: taxReserves.id,
            invoiceId: invoices.id,
            date: transactions.date,
            currency: taxReserves.currency,
            amountMinor: taxReserves.originalAmountMinor,
          })
          .from(taxReserves)
          .innerJoin(invoices, eq(taxReserves.invoiceId, invoices.id))
          .innerJoin(
            invoiceCollections,
            eq(taxReserves.invoiceCollectionId, invoiceCollections.id),
          )
          .innerJoin(
            transactions,
            eq(invoiceCollections.transactionId, transactions.id),
          )
          .where(
            and(
              eq(taxReserves.householdId, householdId),
              eq(transactions.status, "paid"),
              gte(transactions.date, range.from),
              lte(transactions.date, range.to),
            ),
          ),
        db
          .select({
            id: taxReserveSettlements.id,
            invoiceId: invoices.id,
            date: transactions.date,
            currency: taxReserves.currency,
            amountMinor: taxReserveSettlements.amountMinor,
          })
          .from(taxReserveSettlements)
          .innerJoin(
            taxReserves,
            eq(taxReserveSettlements.taxReserveId, taxReserves.id),
          )
          .innerJoin(invoices, eq(taxReserves.invoiceId, invoices.id))
          .innerJoin(
            transactions,
            eq(taxReserveSettlements.transactionId, transactions.id),
          )
          .where(
            and(
              eq(taxReserves.householdId, householdId),
              eq(transactions.status, "paid"),
              gte(transactions.date, range.from),
              lte(transactions.date, range.to),
            ),
          ),
      ]);
    return {
      expenses,
      invoiceRows,
      collectionRows,
      reserveRows,
      settlementRows,
    };
  },
};
