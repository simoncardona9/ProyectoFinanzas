import { ApiError } from "@/shared/errors/api-error";
import type { AuthContext, Membership } from "@/shared/auth/auth.types";
import {
  createSessionToken,
  hashSessionToken,
  SESSION_MAX_AGE_SECONDS,
} from "@/shared/auth/session-token";
import { verifyPassword } from "@/shared/auth/password";
import { authRepository } from "./auth.repository";

export async function login(email: string, password: string) {
  const user = await authRepository.findUserByEmail(email);
  if (
    !user ||
    !user.isActive ||
    !(await verifyPassword(user.passwordHash, password))
  )
    throw new ApiError(
      401,
      "INVALID_CREDENTIALS",
      "Email or password is incorrect.",
    );
  const memberships = await authRepository.getMemberships(user.id);
  if (!memberships.length)
    throw new ApiError(
      403,
      "NO_HOUSEHOLD_ACCESS",
      "This user has no household membership.",
    );
  const token = createSessionToken();
  await authRepository.createSession(
    user.id,
    hashSessionToken(token),
    memberships[0].householdId,
    new Date(Date.now() + SESSION_MAX_AGE_SECONDS * 1000),
  );
  return {
    token,
    user: { id: user.id, email: user.email },
    memberships,
    activeMembership: memberships[0],
  };
}

export async function getAuthContext(
  token: string | undefined,
): Promise<AuthContext> {
  if (!token)
    throw new ApiError(401, "UNAUTHENTICATED", "Authentication is required.");
  const session = await authRepository.findValidSession(
    hashSessionToken(token),
  );
  if (!session)
    throw new ApiError(401, "UNAUTHENTICATED", "Authentication is required.");
  const memberships = await authRepository.getMemberships(session.userId);
  const membership =
    memberships.find((item) => item.householdId === session.householdId) ??
    memberships[0];
  if (!membership)
    throw new ApiError(
      403,
      "NO_HOUSEHOLD_ACCESS",
      "This user has no household membership.",
    );
  return {
    user: { id: session.userId, email: session.email },
    membership,
    sessionId: session.sessionId,
  };
}

export async function changeActiveHousehold(
  context: AuthContext,
  householdId: string,
): Promise<Membership> {
  const memberships = await authRepository.getMemberships(context.user.id);
  const membership = memberships.find(
    (item) => item.householdId === householdId,
  );
  if (!membership)
    throw new ApiError(
      403,
      "HOUSEHOLD_ACCESS_DENIED",
      "You are not a member of this household.",
    );
  await authRepository.setActiveHousehold(context.sessionId, householdId);
  return membership;
}
