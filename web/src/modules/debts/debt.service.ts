import type { AuthContext } from "@/shared/auth/auth.types";
import { debtRepository } from "./debt.repository";
import { validateDebt } from "./debt.rules";
import type { CreateDebt } from "./debt.schemas";

export async function createDebt(context: AuthContext, values: CreateDebt) {
  validateDebt(values);
  return debtRepository.create(
    context.membership.householdId,
    context.user.id,
    values,
  );
}
