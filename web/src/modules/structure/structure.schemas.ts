import { z } from "zod";

const currency = z.enum(["UYU", "USD"]);
const accountType = z.enum([
  "cash",
  "bank",
  "card",
  "loan",
  "reserve_envelope",
]);
const categoryKind = z.enum(["income", "expense", "transfer"]);
const classification = z.enum(["fixed", "variable", "discretionary"]);
const calendarDate = z.iso.date();

export const createAccountSchema = z.object({
  name: z.string().trim().min(1).max(120),
  type: accountType,
  currency,
  openingBalanceMinor: z.number().int().min(-2_000_000_000).max(2_000_000_000),
  openingBalanceDate: calendarDate,
});

export const updateAccountSchema = createAccountSchema
  .omit({ openingBalanceMinor: true, openingBalanceDate: true })
  .partial()
  .refine(
    (value) => Object.keys(value).length > 0,
    "At least one field is required.",
  );

export const createCategorySchema = z
  .object({
    name: z.string().trim().min(1).max(120),
    kind: categoryKind,
    parentId: z.uuid().nullable().optional(),
    defaultClassification: classification.nullable().optional(),
  })
  .superRefine((value, context) => {
    if (value.kind === "expense" && !value.defaultClassification) {
      context.addIssue({
        code: "custom",
        path: ["defaultClassification"],
        message: "Expense categories require a classification.",
      });
    }
    if (value.kind !== "expense" && value.defaultClassification) {
      context.addIssue({
        code: "custom",
        path: ["defaultClassification"],
        message: "Only expense categories can have a classification.",
      });
    }
  });

export const updateCategorySchema = z
  .object({
    name: z.string().trim().min(1).max(120).optional(),
    defaultClassification: classification.nullable().optional(),
  })
  .refine(
    (value) => Object.keys(value).length > 0,
    "At least one field is required.",
  );
