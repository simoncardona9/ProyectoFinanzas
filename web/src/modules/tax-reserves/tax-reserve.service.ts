import type { AuthContext } from "@/shared/auth/auth.types";
import { ApiError } from "@/shared/errors/api-error";
import { structureRepository } from "@/modules/structure/structure.repository";
import { validateTaxReserveSettlement } from "./tax-reserve.rules";
import { taxReserveRepository } from "./tax-reserve.repository";
import type { SettleTaxReserve } from "./tax-reserve.schemas";

export async function settleTaxReserve(
  context: AuthContext,
  id: string,
  values: SettleTaxReserve,
) {
  const [reserve, account] = await Promise.all([
    taxReserveRepository.find(context.membership.householdId, id),
    structureRepository.findAccount(
      context.membership.householdId,
      values.accountId,
    ),
  ]);
  if (!reserve) throw new ApiError(404, "NOT_FOUND", "Tax reserve not found.");
  validateTaxReserveSettlement(reserve, account, values);
  try {
    return await taxReserveRepository.settle(
      context.membership.householdId,
      context.user.id,
      reserve,
      values,
    );
  } catch (error) {
    if (
      error instanceof Error &&
      error.message === "Concurrent tax reserve settlement."
    )
      throw new ApiError(
        409,
        "CONCURRENT_MODIFICATION",
        "The tax reserve changed before the settlement could be applied.",
      );
    throw error;
  }
}
