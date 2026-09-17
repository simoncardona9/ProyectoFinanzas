import { z } from "zod";

const currency = z.enum(["UYU", "USD"]);
const reconciliationTotals = z.object({
  transactionIncomeMinor: z.number().int().min(0),
  transactionExpenseMinor: z.number().int().min(0),
  obligationMinor: z.number().int().min(0),
  expectedIncomeMinor: z.number().int().min(0),
  debtOriginalMinor: z.number().int().min(0),
  debtPaymentMinor: z.number().int().min(0),
  invoiceGrossMinor: z.number().int().min(0),
  invoiceCollectionMinor: z.number().int().min(0),
  ivaReserveMinor: z.number().int().min(0),
});
const reconciliation = z.object({
  /** Immutable hash of the corrected, separately retained source report. */
  reportName: z.string().trim().min(1).max(255),
  reportContentHash: z.string().regex(/^[a-f0-9]{64}$/),
  reviewer: z.string().trim().min(2).max(200),
  signedAt: z.iso.datetime({ offset: true }),
  /** Each known workbook discrepancy must have a documented correction. */
  corrections: z
    .array(
      z.object({
        issue: z.enum([
          "dualboot_conversion",
          "tec_billing_alignment",
          "invalid_cash_dates",
          "historical_dashboard_labels",
          "fixed_formula_ranges",
        ]),
        correction: z.string().trim().min(10).max(1000),
      }),
    )
    .length(5),
  totals: z.object({ UYU: reconciliationTotals, USD: reconciliationTotals }),
});
const source = z
  .object({
    type: z.enum(["json_paste", "json_upload", "csv_upload", "excel_upload"]),
    name: z.string().trim().min(1).max(255).optional(),
    /** SHA-256 of the original uploaded bytes, never a spreadsheet formula result. */
    originalContentHash: z
      .string()
      .regex(/^[a-f0-9]{64}$/)
      .optional(),
    declaredPeriod: z
      .string()
      .regex(/^\d{4}-(0[1-9]|1[0-2])$/)
      .optional(),
    reconciliation: reconciliation.optional(),
  })
  .superRefine((value, ctx) => {
    const corrections = value.reconciliation?.corrections ?? [];
    if (
      new Set(corrections.map((correction) => correction.issue)).size !==
      corrections.length
    )
      ctx.addIssue({
        code: "custom",
        path: ["reconciliation", "corrections"],
        message:
          "Cada discrepancia conocida debe documentarse exactamente una vez.",
      });
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

const reference = z.string().trim().min(1).max(120);
const debt = z.object({
  reference,
  creditorName: z.string().trim().min(1).max(200),
  description: z.string().trim().min(1).max(500),
  amountMinor: z.number().int().positive().max(2_000_000_000),
  currency,
  incurredDate: z.iso.date(),
});

const debtPayment = z.object({
  debt: reference,
  amountMinor: z.number().int().positive().max(2_000_000_000),
  account: reference,
  paidDate: z.iso.date(),
  description: z.string().trim().min(1).max(500).optional(),
});

const invoice = z.object({
  reference,
  clientName: z.string().trim().min(1).max(200),
  description: z.string().trim().min(1).max(500),
  serviceDate: z.iso.date(),
  dueDate: z.iso.date(),
  grossAmountMinor: z.number().int().positive().max(2_000_000_000),
  ivaRateBasisPoints: z.number().int().min(0).max(10_000),
  currency,
  sentDate: z.iso.date().optional(),
});

const invoiceCollection = z.object({
  reference,
  invoice: reference,
  amountMinor: z.number().int().positive().max(2_000_000_000),
  account: reference,
  paidDate: z.iso.date(),
  description: z.string().trim().min(1).max(500).optional(),
});

const ivaReserve = z.object({
  collection: reference,
  amountMinor: z.number().int().min(0).max(2_000_000_000),
});

const exchangeRate = z
  .object({
    baseCurrency: currency,
    quoteCurrency: currency,
    rate: z
      .union([z.string(), z.number()])
      .transform(String)
      .refine(
        (value) =>
          /^(?:0|[1-9]\d*)(?:\.\d{1,8})?$/.test(value) &&
          !/^0(?:\.0+)?$/.test(value),
        "Rate must be a positive decimal with at most 8 decimal places.",
      ),
    effectiveDate: z.iso.date(),
    source: z.string().trim().min(1).max(200),
    kind: z.enum(["confirmed", "planning"]),
    movement: z.enum(["buy_usd", "sell_usd", "reference"]),
  })
  .refine((row) => row.baseCurrency !== row.quoteCurrency, {
    message: "The base and quote currencies must differ.",
    path: ["quoteCurrency"],
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
    debts: z.array(debt).optional().default([]),
    debtPayments: z.array(debtPayment).optional().default([]),
    invoices: z.array(invoice).optional().default([]),
    invoiceCollections: z.array(invoiceCollection).optional().default([]),
    ivaReserves: z.array(ivaReserve).optional().default([]),
    exchangeRates: z.array(exchangeRate).optional().default([]),
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
