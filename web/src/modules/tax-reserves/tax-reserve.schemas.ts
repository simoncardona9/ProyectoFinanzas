import { z } from "zod";

const calendarDate = z.iso.date();

export const settleTaxReserveSchema = z.object({
  amountMinor: z.number().int().positive().max(2_000_000_000),
  accountId: z.uuid(),
  paidDate: calendarDate,
  reference: z.string().trim().min(1).max(500),
});

export type SettleTaxReserve = z.infer<typeof settleTaxReserveSchema>;
