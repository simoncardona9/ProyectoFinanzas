import { z } from "zod";

export const loginSchema = z.object({
  email: z.email().trim().toLowerCase(),
  password: z.string().min(1).max(1024),
});
export const activeHouseholdSchema = z.object({ householdId: z.uuid() });
export const inviteMemberSchema = z.object({
  email: z.email().trim().toLowerCase(),
  role: z.enum(["editor", "viewer", "accountant"]),
});
export const householdSettingsSchema = z.object({
  name: z.string().trim().min(1).max(120),
  locale: z.string().trim().min(2).max(20),
  defaultCurrency: z.enum(["UYU", "USD"]),
  lowBufferMinor: z.number().int().min(0).max(2_000_000_000).default(0),
  timeZone: z.string().trim().min(1).max(80),
});
