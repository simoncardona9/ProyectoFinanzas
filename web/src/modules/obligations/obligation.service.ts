import type { AuthContext } from "@/shared/auth/auth.types";
import { structureRepository } from "@/modules/structure/structure.repository";
import { ApiError } from "@/shared/errors/api-error";
import { obligationRepository } from "./obligation.repository";
import {
  validateDeferral,
  validateObligationCategory,
  validatePayment,
} from "./obligation.rules";
import type {
  CreateObligation,
  CreateObligationPayment,
} from "./obligation.schemas";

export async function createObligation(
  context: AuthContext,
  values: CreateObligation,
) {
  const category = await structureRepository.findCategory(
    context.membership.householdId,
    values.categoryId,
  );
  validateObligationCategory(category);
  return obligationRepository.create(
    context.membership.householdId,
    context.user.id,
    values,
  );
}

export async function payObligation(
  context: AuthContext,
  id: string,
  values: CreateObligationPayment,
) {
  const obligation = await obligationRepository.find(
    context.membership.householdId,
    id,
  );
  if (!obligation)
    throw new ApiError(404, "NOT_FOUND", "Obligation not found.");
  const account = await structureRepository.findAccount(
    context.membership.householdId,
    values.accountId,
  );
  validatePayment(obligation, account, values.amountMinor);
  try {
    return await obligationRepository.pay(
      context.membership.householdId,
      context.user.id,
      obligation,
      values,
    );
  } catch (error) {
    if (
      error instanceof Error &&
      error.message === "Concurrent obligation payment."
    )
      throw new ApiError(
        409,
        "CONCURRENT_MODIFICATION",
        "The obligation changed before the payment could be applied.",
      );
    throw error;
  }
}

export async function deferObligation(
  context: AuthContext,
  id: string,
  newDueDate: string,
  reason: string,
) {
  const obligation = await obligationRepository.find(
    context.membership.householdId,
    id,
  );
  if (!obligation)
    throw new ApiError(404, "NOT_FOUND", "Obligation not found.");
  validateDeferral(obligation, newDueDate);
  const updated = await obligationRepository.defer(
    context.membership.householdId,
    context.user.id,
    obligation,
    newDueDate,
    reason,
  );
  if (!updated)
    throw new ApiError(
      409,
      "CONCURRENT_MODIFICATION",
      "The obligation changed before it could be deferred.",
    );
  return updated;
}
