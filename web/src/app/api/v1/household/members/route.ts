import { authRepository } from "@/modules/auth/auth.repository";
import { inviteMemberSchema } from "@/modules/auth/auth.schemas";
import { requireRole } from "@/shared/auth/authorization";
import { requireAuth } from "@/shared/auth/request-auth";
import { ApiError, errorResponse } from "@/shared/errors/api-error";
export const runtime = "nodejs";
export async function GET() {
  try {
    const context = await requireAuth();
    requireRole(context, ["owner"]);
    return Response.json({
      data: await authRepository.listMembers(context.membership.householdId),
    });
  } catch (error) {
    return errorResponse(error);
  }
}
export async function POST(request: Request) {
  try {
    const context = await requireAuth();
    requireRole(context, ["owner"]);
    const input = inviteMemberSchema.safeParse(await request.json());
    if (!input.success)
      return Response.json(
        {
          error: {
            code: "VALIDATION_ERROR",
            message: "A valid email and role are required.",
            fields: input.error.flatten().fieldErrors,
          },
        },
        { status: 400 },
      );
    const user = await authRepository.findUserIdByEmail(input.data.email);
    if (!user)
      throw new ApiError(
        422,
        "USER_NOT_PROVISIONED",
        "The user must be created through the controlled administrative process before being invited.",
      );
    const membership = await authRepository.addMembership(
      user.id,
      context.membership.householdId,
      input.data.role,
    );
    return Response.json({ data: membership }, { status: 201 });
  } catch (error) {
    return errorResponse(error);
  }
}
