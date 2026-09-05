import { z } from "zod";

const calendarDate = z.iso.date();

const paidTransactionFields = z.object({
  date: calendarDate,
  type: z.enum(["income", "expense"]),
  amountMinor: z.number().int().positive().max(2_000_000_000),
  currency: z.enum(["UYU", "USD"]),
  accountId: z.uuid(),
  categoryId: z.uuid(),
  description: z.string().trim().min(1).max(500),
  isRecurring: z.boolean().optional().default(false),
  isOneOff: z.boolean().optional().default(false),
});

const noConflictingFlags = {
  message: "A transaction cannot be recurring and one-off.",
  path: ["isOneOff"],
};

export const createPaidTransactionSchema = paidTransactionFields
  .extend({ status: z.literal("paid") })
  .refine((value) => !(value.isRecurring && value.isOneOff), {
    ...noConflictingFlags,
  });

export type CreatePaidTransaction = z.infer<typeof createPaidTransactionSchema>;

export const createExpectedIncomeSchema = paidTransactionFields.extend({
  type: z.literal("income"),
  status: z.enum(["planned", "pending"]),
});

export type CreateExpectedIncome = z.infer<typeof createExpectedIncomeSchema>;

export const updatePaidTransactionSchema = paidTransactionFields
  .extend({ changeReason: z.string().trim().min(3).max(500) })
  .refine(
    (value) => !(value.isRecurring && value.isOneOff),
    noConflictingFlags,
  );

export type UpdatePaidTransaction = z.infer<typeof updatePaidTransactionSchema>;

export const voidTransactionSchema = z.object({
  reason: z.string().trim().min(3).max(500),
});

export const listPaidTransactionsSchema = z.object({
  from: calendarDate.optional(),
  to: calendarDate.optional(),
  accountId: z.uuid().optional(),
  categoryId: z.uuid().optional(),
  type: z.enum(["income", "expense"]).optional(),
  currency: z.enum(["UYU", "USD"]).optional(),
  isRecurring: z
    .enum(["true", "false"])
    .transform((value) => value === "true")
    .optional(),
  isOneOff: z
    .enum(["true", "false"])
    .transform((value) => value === "true")
    .optional(),
  limit: z.coerce.number().int().min(1).max(100).default(50),
  offset: z.coerce.number().int().min(0).default(0),
});

export type ListPaidTransactions = z.infer<typeof listPaidTransactionsSchema>;
