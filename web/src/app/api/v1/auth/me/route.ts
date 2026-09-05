import { authRepository } from "@/modules/auth/auth.repository";
import { requireAuth } from "@/shared/auth/request-auth";
import { errorResponse } from "@/shared/errors/api-error";
export const runtime = "nodejs";
export async function GET() {
  try {
    const context = await requireAuth();
    return Response.json({
      data: {
        user: context.user,
        activeMembership: context.membership,
        memberships: await authRepository.getMemberships(context.user.id),
      },
    });
  } catch (error) {
    return errorResponse(error);
  }
}
