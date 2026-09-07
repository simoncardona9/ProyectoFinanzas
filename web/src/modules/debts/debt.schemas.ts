import { z } from "zod";

const currency = z.enum(["UYU", "USD"]);
const calendarDate = z.iso.date();

export const createDebtSchema = z.object({
  creditorName: z.string().trim().min(1).max(200),
  description: z.string().trim().min(1).max(500),
  amountMinor: z.number().int().positive().max(2_000_000_000),
  currency,
  incurredDate: calendarDate,
});

export type CreateDebt = z.infer<typeof createDebtSchema>;

export const listDebtsSchema = z.object({
  status: z.enum(["active", "paid", "cancelled"]).optional(),
  currency: currency.optional(),
  limit: z.coerce.number().int().min(1).max(100).default(50),
  offset: z.coerce.number().int().min(0).default(0),
});

export type ListDebts = z.infer<typeof listDebtsSchema>;

export const createDebtPaymentSchema = z.object({
  amountMinor: z.number().int().positive().max(2_000_000_000),
  accountId: z.uuid(),
  paidDate: calendarDate,
  description: z.string().trim().min(1).max(500).optional(),
});

export type CreateDebtPayment = z.infer<typeof createDebtPaymentSchema>;

export const debtExposureQuerySchema = z.object({
  exchangeRateId: z.uuid().optional(),
});

export type DebtExposureQuery = z.infer<typeof debtExposureQuerySchema>;

export const debtReportQuerySchema = z.object({
  exchangeRateId: z.uuid().optional(),
});

export type DebtReportQuery = z.infer<typeof debtReportQuerySchema>;
