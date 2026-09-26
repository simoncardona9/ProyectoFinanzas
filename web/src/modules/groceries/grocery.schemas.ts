import { z } from "zod";

const name = z.string().trim().min(1).max(160);
const currency = z.enum(["UYU", "USD"]);
const period = z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/);
const quantity = z.coerce
  .number()
  .positive()
  .max(999_999_999.999)
  .refine((value) => Number.isSafeInteger(value * 1000), {
    message: "Quantity may contain at most three decimal places.",
  });

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

export const createGroceryPlanSchema = z.object({
  period,
  name: z.string().trim().min(1).max(160),
  currency,
  preferredMarketId: z.uuid().optional(),
});

export const updateGroceryPlanSchema = z
  .object({
    name: z.string().trim().min(1).max(160).optional(),
    status: z.enum(["draft", "active", "cancelled"]).optional(),
    preferredMarketId: z.uuid().nullable().optional(),
  })
  .refine((value) => Object.keys(value).length > 0, {
    message: "At least one field is required.",
  });

export const createGroceryPlanItemSchema = z
  .object({
    productId: z.uuid().optional(),
    description: z.string().trim().min(1).max(300).optional(),
    quantity: quantity.optional(),
    unit: z.string().trim().min(1).max(40).optional(),
    manualUnitPriceMinor: z.coerce.number().int().positive().optional(),
    suggestedPriceObservationId: z.uuid().optional(),
  })
  .superRefine((value, context) => {
    if (!value.productId && !value.description) {
      context.addIssue({
        code: "custom",
        path: ["productId"],
        message: "A product or description is required.",
      });
    }
    if (
      (value.manualUnitPriceMinor === undefined) ===
      (value.suggestedPriceObservationId === undefined)
    ) {
      context.addIssue({
        code: "custom",
        path: ["manualUnitPriceMinor"],
        message: "Choose exactly one price source.",
      });
    }
    if (value.unit && value.quantity === undefined) {
      context.addIssue({
        code: "custom",
        path: ["unit"],
        message: "A unit requires a quantity.",
      });
    }
  });

const receiptLine = z
  .object({
    groceryPlanItemId: z.uuid().optional(),
    description: z.string().trim().min(1).max(300),
    quantity: quantity.optional(),
    unit: z.string().trim().min(1).max(40).optional(),
    unitPriceMinor: z.coerce.number().int().positive().optional(),
    totalMinor: z.coerce.number().int().positive(),
  })
  .superRefine((value, context) => {
    if (value.unit && value.quantity === undefined)
      context.addIssue({ code: "custom", path: ["unit"], message: "A unit requires a quantity." });
  });

export const createGroceryPurchaseSchema = z
  .object({ transactionId: z.uuid(), receiptLines: z.array(receiptLine).max(100).optional() })
  .superRefine((value, context) => {
    if (value.receiptLines?.length === 0)
      context.addIssue({ code: "custom", path: ["receiptLines"], message: "Omit receiptLines or provide at least one line." });
  });

export type CreateGroceryMarket = z.infer<typeof createGroceryMarketSchema>;
export type CreateGroceryProduct = z.infer<typeof createGroceryProductSchema>;
export type CreateGroceryPriceObservation = z.infer<
  typeof createGroceryPriceObservationSchema
>;
export type CreateGroceryPlan = z.infer<typeof createGroceryPlanSchema>;
export type UpdateGroceryPlan = z.infer<typeof updateGroceryPlanSchema>;
export type CreateGroceryPlanItem = z.infer<typeof createGroceryPlanItemSchema>;
export type CreateGroceryPurchase = z.infer<typeof createGroceryPurchaseSchema>;
