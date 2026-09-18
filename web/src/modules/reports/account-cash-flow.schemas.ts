import { z } from "zod";

const calendarDate = z.iso.date();

export const accountCashFlowReportQuerySchema = z
  .object({
    from: calendarDate,
    to: calendarDate,
  })
  .refine((value) => value.from <= value.to, {
    message: "The start date must not be after the end date.",
    path: ["to"],
  });

export type AccountCashFlowReportQuery = z.infer<
  typeof accountCashFlowReportQuerySchema
>;
