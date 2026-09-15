import { z } from "zod";

const currency = z.enum(["UYU", "USD"]);
const source = z.object({
  type: z.enum(["json_paste", "json_upload"]),
  name: z.string().trim().min(1).max(255).optional(),
});

const transaction = z
  .object({
    date: z.iso.date(),
    type: z.enum(["income", "expense"]),
    amountMinor: z.number().int().positive().max(2_000_000_000),
    currency,
    account: z.string().trim().min(1).max(120),
    category: z.string().trim().min(1).max(120),
    description: z.string().trim().min(1).max(500),
    isRecurring: z.boolean().optional().default(false),
    isOneOff: z.boolean().optional().default(false),
  })
  .refine((row) => !(row.isRecurring && row.isOneOff), {
    message: "A transaction cannot be recurring and one-off.",
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

/** The v1 surface deliberately stages only core entities; commits arrive in later slices. */
export const financeImportBundleSchema = z
  .object({
    version: z.literal("finance-import/v1"),
    source,
    accounts: z.array(account).optional().default([]),
    categories: z.array(category).optional().default([]),
    transactions: z.array(transaction).optional().default([]),
    obligations: z
      .array(z.record(z.string(), z.unknown()))
      .optional()
      .default([]),
    expectedIncome: z
      .array(z.record(z.string(), z.unknown()))
      .optional()
      .default([]),
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
