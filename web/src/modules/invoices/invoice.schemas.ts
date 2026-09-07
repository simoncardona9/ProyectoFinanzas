import { z } from "zod";

const calendarDate = z.iso.date();
const currency = z.enum(["UYU", "USD"]);

export const createInvoiceSchema = z.object({
  clientName: z.string().trim().min(1).max(200),
  description: z.string().trim().min(1).max(500),
  serviceDate: calendarDate,
  dueDate: calendarDate,
  grossAmountMinor: z.number().int().positive().max(2_000_000_000),
  ivaRateBasisPoints: z.number().int().min(0).max(10_000),
  currency,
});

export type CreateInvoice = z.infer<typeof createInvoiceSchema>;

export const listInvoicesSchema = z.object({
  status: z
    .enum(["draft", "sent", "partially_collected", "collected", "cancelled"])
    .optional(),
  currency: currency.optional(),
  dueFrom: calendarDate.optional(),
  dueTo: calendarDate.optional(),
  limit: z.coerce.number().int().min(1).max(100).default(50),
  offset: z.coerce.number().int().min(0).default(0),
});

export type ListInvoices = z.infer<typeof listInvoicesSchema>;

export const sendInvoiceSchema = z.object({
  sentDate: calendarDate,
});

export const createInvoiceCollectionSchema = z.object({
  amountMinor: z.number().int().positive().max(2_000_000_000),
  accountId: z.uuid(),
  paidDate: calendarDate,
  description: z.string().trim().min(1).max(500).optional(),
});

export type CreateInvoiceCollection = z.infer<
  typeof createInvoiceCollectionSchema
>;

export const cancelInvoiceSchema = z.object({
  reason: z.string().trim().min(3).max(500),
});
