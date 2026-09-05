import { ApiError } from "@/shared/errors/api-error";
import type { AuthContext, Role } from "./auth.types";

export function requireRole(
  context: AuthContext,
  allowed: readonly Role[],
): void {
  if (!allowed.includes(context.membership.role))
    throw new ApiError(
      403,
      "FORBIDDEN",
      "Your role does not allow this action.",
    );
}
