import { ApiError } from "@/shared/errors/api-error";
import type { AuthContext } from "@/shared/auth/auth.types";
import { structureRepository } from "./structure.repository";

const seededCategories = [
  ["Ingresos", "income", null, null],
  ["Sueldo TEC", "income", "Ingresos", null],
  ["Clases", "income", "Ingresos", null],
  ["Egresos fijos", "expense", null, "fixed"],
  ["Servicios", "expense", "Egresos fijos", "fixed"],
  ["Impuestos", "expense", "Egresos fijos", "fixed"],
  ["Gastos bancarios", "expense", "Egresos fijos", "fixed"],
  ["Egresos variables", "expense", null, "variable"],
  ["Hogar y supermercado", "expense", "Egresos variables", "variable"],
  ["Salud", "expense", "Egresos variables", "variable"],
  ["Discrecionales", "expense", null, "discretionary"],
  ["Suscripciones y regalos", "expense", "Discrecionales", "discretionary"],
] as const;

export async function seedCategories(context: AuthContext) {
  const existing = await structureRepository.listCategories(
    context.membership.householdId,
  );
  if (existing.length) return existing;
  const created = new Map<string, string>();
  for (const [
    name,
    kind,
    parentName,
    defaultClassification,
  ] of seededCategories) {
    const category = await structureRepository.createCategory(
      context.membership.householdId,
      {
        name,
        kind,
        parentCategoryId: parentName ? created.get(parentName) : null,
        defaultClassification,
      },
    );
    created.set(name, category.id);
  }
  await structureRepository.audit(
    context.membership.householdId,
    context.user.id,
    "seed",
    "category",
    "00000000-0000-0000-0000-000000000000",
  );
  return structureRepository.listCategories(context.membership.householdId);
}

export async function createAccount(
  context: AuthContext,
  values: Parameters<typeof structureRepository.createAccount>[1],
) {
  const account = await structureRepository.createAccount(
    context.membership.householdId,
    values,
  );
  await structureRepository.audit(
    context.membership.householdId,
    context.user.id,
    "create",
    "account",
    account.id,
  );
  return account;
}
export async function updateAccount(
  context: AuthContext,
  id: string,
  values: Parameters<typeof structureRepository.updateAccount>[2],
) {
  const account = await structureRepository.updateAccount(
    context.membership.householdId,
    id,
    values,
  );
  if (!account) throw new ApiError(404, "NOT_FOUND", "Account not found.");
  await structureRepository.audit(
    context.membership.householdId,
    context.user.id,
    "update",
    "account",
    id,
  );
  return account;
}
export async function archiveAccount(context: AuthContext, id: string) {
  return updateAccount(context, id, { active: false, archivedAt: new Date() });
}
export async function createCategory(
  context: AuthContext,
  values: Parameters<typeof structureRepository.createCategory>[1],
) {
  if (values.parentCategoryId) {
    const parent = await structureRepository.findCategory(
      context.membership.householdId,
      values.parentCategoryId,
    );
    if (!parent || !parent.active || parent.kind !== values.kind)
      throw new ApiError(
        422,
        "INVALID_PARENT_CATEGORY",
        "The parent category must be active and have the same kind.",
      );
  }
  const category = await structureRepository.createCategory(
    context.membership.householdId,
    values,
  );
  await structureRepository.audit(
    context.membership.householdId,
    context.user.id,
    "create",
    "category",
    category.id,
  );
  return category;
}
export async function updateCategory(
  context: AuthContext,
  id: string,
  values: Parameters<typeof structureRepository.updateCategory>[2],
) {
  const existing = await structureRepository.findCategory(
    context.membership.householdId,
    id,
  );
  if (!existing) throw new ApiError(404, "NOT_FOUND", "Category not found.");
  if (existing.kind !== "expense" && values.defaultClassification) {
    throw new ApiError(
      422,
      "INVALID_CLASSIFICATION",
      "Only expense categories can have a classification.",
    );
  }
  const category = await structureRepository.updateCategory(
    context.membership.householdId,
    id,
    values,
  );
  if (!category) throw new ApiError(404, "NOT_FOUND", "Category not found.");
  await structureRepository.audit(
    context.membership.householdId,
    context.user.id,
    "update",
    "category",
    id,
  );
  return category;
}
export async function archiveCategory(context: AuthContext, id: string) {
  const category = await structureRepository.findCategory(
    context.membership.householdId,
    id,
  );
  if (!category) throw new ApiError(404, "NOT_FOUND", "Category not found.");
  if (
    await structureRepository.hasActiveChildren(
      context.membership.householdId,
      id,
    )
  )
    throw new ApiError(
      409,
      "CATEGORY_HAS_ACTIVE_CHILDREN",
      "Archive or re-parent active child categories first.",
    );
  return updateCategory(context, id, { active: false, archivedAt: new Date() });
}
