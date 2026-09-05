import { z } from "zod";

const calendarDate = z.iso.date();

export const createPaidTransactionSchema = z.object({
  date: calendarDate,
  type: z.enum(["income", "expense"]),
  status: z.literal("paid"),
  amountMinor: z.number().int().positive().max(2_000_000_000),
  currency: z.literal("UYU"),
  accountId: z.uuid(),
  categoryId: z.uuid(),
  description: z.string().trim().min(1).max(500),
  isRecurring: z.boolean().optional().default(false),
  isOneOff: z.boolean().optional().default(false),
});

export type CreatePaidTransaction = z.infer<typeof createPaidTransactionSchema>;

export const listPaidTransactionsSchema = z.object({
  from: calendarDate.optional(),
  to: calendarDate.optional(),
  accountId: z.uuid().optional(),
  categoryId: z.uuid().optional(),
});
