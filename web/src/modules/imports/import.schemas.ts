import { z } from "zod";

const currency = z.enum(["UYU", "USD"]);
const source = z.object({
  type: z.enum(["json_paste", "json_upload"]),
  name: z.string().trim().min(1).max(255).optional(),
});

const transactionFields = z.object({
  date: z.iso.date(),
  type: z.enum(["income", "expense"]),
  amountMinor: z.number().int().positive().max(2_000_000_000),
  currency,
  account: z.string().trim().min(1).max(120),
  category: z.string().trim().min(1).max(120),
  description: z.string().trim().min(1).max(500),
  isRecurring: z.boolean().optional().default(false),
  isOneOff: z.boolean().optional().default(false),
});

const transaction = transactionFields.refine(
  (row) => !(row.isRecurring && row.isOneOff),
  {
    message: "A transaction cannot be recurring and one-off.",
    path: ["isOneOff"],
  },
);

const obligation = z.object({
  description: z.string().trim().min(1).max(500),
  amountMinor: z.number().int().positive().max(2_000_000_000),
  currency,
  dueDate: z.iso.date(),
  category: z.string().trim().min(1).max(120),
  classification: z.enum(["fixed", "variable", "discretionary"]),
  status: z.enum(["planned", "pending"]).optional().default("pending"),
  recurrenceRule: z
    .enum(["monthly", "quarterly", "yearly"])
    .nullable()
    .optional(),
});

const expectedIncome = transactionFields
  .extend({
    type: z.literal("income").optional().default("income"),
    status: z.enum(["planned", "pending"]).optional().default("pending"),
  })
  .refine((row) => !(row.isRecurring && row.isOneOff), {
    message: "Expected income cannot be recurring and one-off.",
    path: ["isOneOff"],
  });

const account = z.object({
  name: z.string().trim().min(1).max(120),
  type: z.enum(["cash", "bank", "card", "loan", "reserve_envelope"]),
  currency,
  openingBalanceMinor: z.number().int().min(-2_000_000_000).max(2_000_000_000),
  openingBalanceDate: z.iso.date(),
});

const category = z
  .object({
    name: z.string().trim().min(1).max(120),
    kind: z.enum(["income", "expense", "transfer"]),
    parent: z.string().trim().min(1).max(120).nullable().optional(),
    defaultClassification: z
      .enum(["fixed", "variable", "discretionary"])
      .nullable()
      .optional(),
  })
  .superRefine((row, ctx) => {
    if (row.kind === "expense" && !row.defaultClassification)
      ctx.addIssue({
        code: "custom",
        path: ["defaultClassification"],
        message: "Expense categories require a classification.",
      });
    if (row.kind !== "expense" && row.defaultClassification)
      ctx.addIssue({
        code: "custom",
        path: ["defaultClassification"],
        message: "Only expense categories can have a classification.",
      });
  });

/** Canonical v1 rows are staged before any financial record is created. */
export const financeImportBundleSchema = z
  .object({
    version: z.literal("finance-import/v1"),
    source,
    accounts: z.array(account).optional().default([]),
    categories: z.array(category).optional().default([]),
    transactions: z.array(transaction).optional().default([]),
    obligations: z.array(obligation).optional().default([]),
    expectedIncome: z.array(expectedIncome).optional().default([]),
  })
  .superRefine((bundle, ctx) => {
    if (
      !Object.values(bundle).some(
        (value) => Array.isArray(value) && value.length,
      )
    )
      ctx.addIssue({
        code: "custom",
        message: "The bundle must contain at least one row.",
      });
  });

export type FinanceImportBundle = z.infer<typeof financeImportBundleSchema>;
