import { z } from "zod";

const name = z.string().trim().min(1).max(160);
const currency = z.enum(["UYU", "USD"]);

export const createGroceryMarketSchema = z.object({ name });
export const createGroceryProductSchema = z.object({ name });

export const createGroceryPriceObservationSchema = z.object({
  marketId: z.uuid(),
  productId: z.uuid(),
  amountMinor: z.coerce.number().int().positive(),
  currency,
  observedDate: z.iso.date(),
  note: z.string().trim().max(500).optional(),
});

export type CreateGroceryMarket = z.infer<typeof createGroceryMarketSchema>;
export type CreateGroceryProduct = z.infer<typeof createGroceryProductSchema>;
export type CreateGroceryPriceObservation = z.infer<
  typeof createGroceryPriceObservationSchema
>;
