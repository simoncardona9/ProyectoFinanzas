import { z } from "zod";

const calendarDate = z.iso.date();

export const categoryTaxReportQuerySchema = z
  .object({
    from: calendarDate,
    to: calendarDate,
    groupBy: z.enum(["category", "month", "year"]).default("category"),
  })
  .refine((value) => value.from <= value.to, {
    message: "The start date must not be after the end date.",
    path: ["to"],
  });

export type CategoryTaxReportQuery = z.infer<
  typeof categoryTaxReportQuerySchema
>;
