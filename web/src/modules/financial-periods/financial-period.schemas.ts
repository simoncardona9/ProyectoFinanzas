import { z } from "zod";

export const financialPeriodQuerySchema = z.object({
  period: z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/),
});

export type FinancialPeriodQuery = z.infer<typeof financialPeriodQuerySchema>;

export const closeFinancialPeriodSchema = z.object({
  period: z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/),
});

export const reopenFinancialPeriodSchema = closeFinancialPeriodSchema.extend({
  reason: z.string().trim().min(1).max(500),
});

export type CloseFinancialPeriod = z.infer<typeof closeFinancialPeriodSchema>;
export type ReopenFinancialPeriod = z.infer<typeof reopenFinancialPeriodSchema>;
