import { and, eq, gt, isNull } from "drizzle-orm";
import { db } from "@/db";
import { households, memberships, sessions, users } from "@/db/schema";
import type { Membership, Role } from "@/shared/auth/auth.types";

export type UserLogin = {
  id: string;
  email: string;
  passwordHash: string;
  isActive: boolean;
};
export type SessionLookup = {
  sessionId: string;
  userId: string;
  email: string;
  householdId: string | null;
};

export const authRepository = {
  async findUserByEmail(email: string): Promise<UserLogin | undefined> {
    return db.query.users.findFirst({
      where: eq(users.email, email),
      columns: { id: true, email: true, passwordHash: true, isActive: true },
    });
  },
  async createSession(
    userId: string,
    tokenHash: string,
    activeHouseholdId: string | null,
    expiresAt: Date,
  ) {
    const [session] = await db
      .insert(sessions)
      .values({ userId, tokenHash, activeHouseholdId, expiresAt })
      .returning({ id: sessions.id });
    return session;
  },
  async findValidSession(
    tokenHash: string,
  ): Promise<SessionLookup | undefined> {
    const [row] = await db
      .select({
        sessionId: sessions.id,
        userId: users.id,
        email: users.email,
        householdId: sessions.activeHouseholdId,
      })
      .from(sessions)
      .innerJoin(users, eq(users.id, sessions.userId))
      .where(
        and(
          eq(sessions.tokenHash, tokenHash),
          isNull(sessions.revokedAt),
          gt(sessions.expiresAt, new Date()),
          eq(users.isActive, true),
        ),
      );
    return row;
  },
  async revokeSession(tokenHash: string) {
    await db
      .update(sessions)
      .set({ revokedAt: new Date() })
      .where(eq(sessions.tokenHash, tokenHash));
  },
  async getMemberships(userId: string): Promise<Membership[]> {
    return db
      .select({
        id: memberships.id,
        householdId: households.id,
        householdName: households.name,
        role: memberships.role,
      })
      .from(memberships)
      .innerJoin(households, eq(households.id, memberships.householdId))
      .where(eq(memberships.userId, userId));
  },
  async setActiveHousehold(sessionId: string, householdId: string) {
    await db
      .update(sessions)
      .set({ activeHouseholdId: householdId })
      .where(eq(sessions.id, sessionId));
  },
  async getHousehold(householdId: string) {
    return db.query.households.findFirst({
      where: eq(households.id, householdId),
    });
  },
  async updateHousehold(
    householdId: string,
    values: {
      name: string;
      locale: string;
      defaultCurrency: "UYU" | "USD";
      lowBufferMinor: number;
      timeZone: string;
    },
  ) {
    const [household] = await db
      .update(households)
      .set({ ...values, updatedAt: new Date() })
      .where(eq(households.id, householdId))
      .returning();
    return household;
  },
  async findUserIdByEmail(email: string) {
    return db.query.users.findFirst({
      where: eq(users.email, email),
      columns: { id: true },
    });
  },
  async addMembership(userId: string, householdId: string, role: Role) {
    const [membership] = await db
      .insert(memberships)
      .values({ userId, householdId, role })
      .onConflictDoUpdate({
        target: [memberships.userId, memberships.householdId],
        set: { role },
      })
      .returning();
    return membership;
  },
  async listMembers(householdId: string) {
    return db
      .select({
        id: memberships.id,
        email: users.email,
        role: memberships.role,
        isActive: users.isActive,
      })
      .from(memberships)
      .innerJoin(users, eq(users.id, memberships.userId))
      .where(eq(memberships.householdId, householdId));
  },
};
