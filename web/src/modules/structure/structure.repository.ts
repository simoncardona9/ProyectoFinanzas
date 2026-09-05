import { and, asc, eq } from "drizzle-orm";
import { db } from "@/db";
import { accounts, auditLogs, categories } from "@/db/schema";

type NewAccount = Omit<typeof accounts.$inferInsert, "householdId">;
type NewCategory = Omit<typeof categories.$inferInsert, "householdId">;

export const structureRepository = {
  listAccounts(householdId: string, active?: boolean) {
    return db.query.accounts.findMany({
      where: and(
        eq(accounts.householdId, householdId),
        active === undefined ? undefined : eq(accounts.active, active),
      ),
      orderBy: [asc(accounts.name)],
    });
  },
  findAccount(householdId: string, id: string) {
    return db.query.accounts.findFirst({
      where: and(eq(accounts.id, id), eq(accounts.householdId, householdId)),
    });
  },
  async createAccount(householdId: string, values: NewAccount) {
    const [account] = await db
      .insert(accounts)
      .values({ ...values, householdId })
      .returning();
    return account;
  },
  async updateAccount(
    householdId: string,
    id: string,
    values: Partial<NewAccount>,
  ) {
    const [account] = await db
      .update(accounts)
      .set({ ...values, updatedAt: new Date() })
      .where(and(eq(accounts.id, id), eq(accounts.householdId, householdId)))
      .returning();
    return account;
  },
  listCategories(householdId: string, active?: boolean) {
    return db.query.categories.findMany({
      where: and(
        eq(categories.householdId, householdId),
        active === undefined ? undefined : eq(categories.active, active),
      ),
      orderBy: [asc(categories.name)],
    });
  },
  findCategory(householdId: string, id: string) {
    return db.query.categories.findFirst({
      where: and(
        eq(categories.id, id),
        eq(categories.householdId, householdId),
      ),
    });
  },
  async createCategory(householdId: string, values: NewCategory) {
    const [category] = await db
      .insert(categories)
      .values({ ...values, householdId })
      .returning();
    return category;
  },
  async updateCategory(
    householdId: string,
    id: string,
    values: Partial<NewCategory>,
  ) {
    const [category] = await db
      .update(categories)
      .set({ ...values, updatedAt: new Date() })
      .where(
        and(eq(categories.id, id), eq(categories.householdId, householdId)),
      )
      .returning();
    return category;
  },
  async hasActiveChildren(householdId: string, id: string) {
    const child = await db.query.categories.findFirst({
      where: and(
        eq(categories.householdId, householdId),
        eq(categories.parentCategoryId, id),
        eq(categories.active, true),
      ),
      columns: { id: true },
    });
    return Boolean(child);
  },
  async audit(
    householdId: string,
    actorUserId: string,
    action: string,
    entityType: string,
    entityId: string,
  ) {
    await db
      .insert(auditLogs)
      .values({ householdId, actorUserId, action, entityType, entityId });
  },
};
