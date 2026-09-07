import type { AuthContext } from "@/shared/auth/auth.types";
import { invoiceRepository } from "./invoice.repository";
import type { CreateInvoice } from "./invoice.schemas";
import { validateInvoice } from "./invoice.rules";

export async function createInvoice(
  context: AuthContext,
  values: CreateInvoice,
) {
  return invoiceRepository.create(
    context.membership.householdId,
    context.user.id,
    values,
    validateInvoice(values),
  );
}
