import type { AuthContext } from "@/shared/auth/auth.types";
import { debtRepository } from "./debt.repository";
import { structureRepository } from "@/modules/structure/structure.repository";
import { ApiError } from "@/shared/errors/api-error";
import { validateDebt, validateDebtPayment } from "./debt.rules";
import type { CreateDebt, CreateDebtPayment } from "./debt.schemas";

export async function createDebt(context: AuthContext, values: CreateDebt) {
  validateDebt(values);
  return debtRepository.create(
    context.membership.householdId,
    context.user.id,
    values,
  );
}

export async function payDebt(
  context: AuthContext,
  id: string,
  values: CreateDebtPayment,
) {
  const debt = await debtRepository.find(context.membership.householdId, id);
  if (!debt) throw new ApiError(404, "NOT_FOUND", "Debt not found.");
  const account = await structureRepository.findAccount(
    context.membership.householdId,
    values.accountId,
  );
  validateDebtPayment(debt, account, values);
  try {
    return await debtRepository.pay(
      context.membership.householdId,
      context.user.id,
      debt,
      values,
    );
  } catch (error) {
    if (error instanceof Error && error.message === "Concurrent debt payment.")
      throw new ApiError(
        409,
        "CONCURRENT_MODIFICATION",
        "The debt changed before the payment could be applied.",
      );
    throw error;
  }
}
