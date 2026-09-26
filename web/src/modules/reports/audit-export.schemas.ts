import { z } from "zod";

const calendarDate = z.iso.date();
const optionalDate = z.preprocess(
  (value) => (value === "" ? undefined : value),
  calendarDate.optional(),
);
const optionalFilter = z.preprocess(
  (value) => (value === "" ? undefined : value),
  z.string().trim().min(1).max(80).optional(),
);

export const auditReportQuerySchema = z
  .object({
    from: optionalDate,
    to: optionalDate,
    action: optionalFilter,
    entityType: optionalFilter,
    page: z.coerce.number().int().min(1).default(1),
    pageSize: z.coerce.number().int().min(1).max(100).default(25),
  })
  .refine((value) => !value.from || !value.to || value.from <= value.to, {
    message: "The start date must not be after the end date.",
    path: ["to"],
  });

export const financialExportQuerySchema = z
  .object({
    from: calendarDate,
    to: calendarDate,
    format: z.literal("csv").default("csv"),
  })
  .refine((value) => value.from <= value.to, {
    message: "The start date must not be after the end date.",
    path: ["to"],
  });

export type AuditReportQuery = z.infer<typeof auditReportQuerySchema>;
export type FinancialExportQuery = z.infer<typeof financialExportQuerySchema>;
