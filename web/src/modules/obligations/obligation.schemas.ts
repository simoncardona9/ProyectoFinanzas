import { z } from "zod";

const calendarDate = z.iso.date();
const currency = z.enum(["UYU", "USD"]);
const classification = z.enum(["fixed", "variable", "discretionary"]);
const openStatus = z.enum(["planned", "pending"]);

export const createObligationSchema = z.object({
  description: z.string().trim().min(1).max(500),
  amountMinor: z.number().int().positive().max(2_000_000_000),
  currency,
  dueDate: calendarDate,
  categoryId: z.uuid(),
  classification,
  status: openStatus.default("pending"),
  recurrenceRule: z
    .enum(["monthly", "quarterly", "yearly"])
    .nullable()
    .optional(),
});

export type CreateObligation = z.infer<typeof createObligationSchema>;

export const listObligationsSchema = z.object({
  dueFrom: calendarDate.optional(),
  dueTo: calendarDate.optional(),
  status: z
    .enum(["planned", "pending", "paid", "deferred", "cancelled"])
    .optional(),
  currency: currency.optional(),
  limit: z.coerce.number().int().min(1).max(100).default(50),
  offset: z.coerce.number().int().min(0).default(0),
});

export type ListObligations = z.infer<typeof listObligationsSchema>;

export const createObligationPaymentSchema = z.object({
  amountMinor: z.number().int().positive().max(2_000_000_000),
  accountId: z.uuid(),
  paidDate: calendarDate,
  description: z.string().trim().min(1).max(500).optional(),
});

export type CreateObligationPayment = z.infer<
  typeof createObligationPaymentSchema
>;

export const deferObligationSchema = z.object({
  newDueDate: calendarDate,
  reason: z.string().trim().min(3).max(500),
});

export const monthForecastSchema = z.object({
  period: z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/),
});
