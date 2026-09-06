import type { AuthContext } from "@/shared/auth/auth.types";
import { structureRepository } from "@/modules/structure/structure.repository";
import type {
  CreateExpectedIncome,
  CreatePaidTransaction,
  UpdatePaidTransaction,
} from "./transaction.schemas";
import { transactionRepository } from "./transaction.repository";
import {
  ensurePaidTransactionCanChange,
  validatePaidTransactionReferences,
} from "./transaction.rules";
import { ApiError } from "@/shared/errors/api-error";

export async function createPaidTransaction(
  context: AuthContext,
  values: CreatePaidTransaction,
) {
  const [account, category] = await Promise.all([
    structureRepository.findAccount(
      context.membership.householdId,
      values.accountId,
    ),
    structureRepository.findCategory(
      context.membership.householdId,
      values.categoryId,
    ),
  ]);
  validatePaidTransactionReferences(
    values.type,
    values.currency,
    account,
    category,
  );
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
      values.currency,
    ),
  ]);
  return { transaction, accountBalanceMinor, categoryTotalMinor };
}

export async function createExpectedIncome(
  context: AuthContext,
  values: CreateExpectedIncome,
) {
  const [account, category] = await Promise.all([
    structureRepository.findAccount(
      context.membership.householdId,
      values.accountId,
    ),
    structureRepository.findCategory(
      context.membership.householdId,
      values.categoryId,
    ),
  ]);
  validatePaidTransactionReferences(
    "income",
    values.currency,
    account,
    category,
  );
  const transaction = await transactionRepository.createPaid(
    context.membership.householdId,
    context.user.id,
    values,
  );
  return { transaction };
}

function auditSnapshot(transaction: {
  date: string;
  type: string;
  amountMinor: number;
  currency: string;
  accountId: string;
  categoryId: string | null;
  description: string;
  isRecurring: boolean;
  isOneOff: boolean;
}) {
  return {
    date: transaction.date,
    type: transaction.type,
    amountMinor: transaction.amountMinor,
    currency: transaction.currency,
    accountId: transaction.accountId,
    categoryId: transaction.categoryId,
    description: transaction.description,
    isRecurring: transaction.isRecurring,
    isOneOff: transaction.isOneOff,
  };
}

export async function updatePaidTransaction(
  context: AuthContext,
  id: string,
  values: UpdatePaidTransaction,
) {
  const existing = await transactionRepository.findDetail(
    context.membership.householdId,
    id,
  );
  if (!existing) throw new ApiError(404, "NOT_FOUND", "Transaction not found.");
  ensurePaidTransactionCanChange(existing.transaction);
  const [account, category] = await Promise.all([
    structureRepository.findAccount(
      context.membership.householdId,
      values.accountId,
    ),
    structureRepository.findCategory(
      context.membership.householdId,
      values.categoryId,
    ),
  ]);
  validatePaidTransactionReferences(
    values.type,
    values.currency,
    account,
    category,
  );
  const transaction = await transactionRepository.updatePaid(
    context.membership.householdId,
    context.user.id,
    id,
    values,
    auditSnapshot(existing.transaction),
  );
  if (!transaction)
    throw new ApiError(
      409,
      "CONCURRENT_MODIFICATION",
      "The transaction changed before the update could be applied.",
    );
  return { transaction };
}

export async function voidPaidTransaction(
  context: AuthContext,
  id: string,
  reason: string,
) {
  const existing = await transactionRepository.findDetail(
    context.membership.householdId,
    id,
  );
  if (!existing) throw new ApiError(404, "NOT_FOUND", "Transaction not found.");
  ensurePaidTransactionCanChange(existing.transaction);
  const transaction = await transactionRepository.voidPaid(
    context.membership.householdId,
    context.user.id,
    id,
    reason,
    auditSnapshot(existing.transaction),
  );
  if (!transaction)
    throw new ApiError(
      409,
      "CONCURRENT_MODIFICATION",
      "The transaction changed before it could be voided.",
    );
  return { transaction };
}
