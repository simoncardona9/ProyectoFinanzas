import type { AuthContext } from "@/shared/auth/auth.types";
import { structureRepository } from "@/modules/structure/structure.repository";
import type { CreatePaidTransaction } from "./transaction.schemas";
import { transactionRepository } from "./transaction.repository";
import { validatePaidTransactionReferences } from "./transaction.rules";

export async function createPaidTransaction(
  context: AuthContext,
  values: CreatePaidTransaction,
) {
  const [account, category] = await Promise.all([
    structureRepository.findAccount(context.membership.householdId, values.accountId),
    structureRepository.findCategory(context.membership.householdId, values.categoryId),
  ]);
  validatePaidTransactionReferences(values.type, values.currency, account, category);
  const transaction = await transactionRepository.createPaid(
    context.membership.householdId,
    context.user.id,
    values,
  );
  const [accountBalanceMinor, categoryTotalMinor] = await Promise.all([
    transactionRepository.accountBalance(
      context.membership.householdId,
      values.accountId,
    ),
    transactionRepository.categoryTotal(
      context.membership.householdId,
      values.categoryId,
    ),
  ]);
  return { transaction, accountBalanceMinor, categoryTotalMinor };
}
