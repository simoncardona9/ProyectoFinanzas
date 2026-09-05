import { z } from "zod";

export const dashboardPeriodSchema = z.object({
  period: z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/),
});

export type DashboardPeriod = z.infer<typeof dashboardPeriodSchema>;
