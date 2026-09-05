import { householdSettingsSchema } from "@/modules/auth/auth.schemas";
import { authRepository } from "@/modules/auth/auth.repository";
import { requireRole } from "@/shared/auth/authorization";
import { requireAuth } from "@/shared/auth/request-auth";
import { ApiError, errorResponse } from "@/shared/errors/api-error";
export const runtime = "nodejs";
export async function GET() {
  try {
    const context = await requireAuth();
    const household = await authRepository.getHousehold(
      context.membership.householdId,
    );
    if (!household)
      throw new ApiError(404, "NOT_FOUND", "Household not found.");
    return Response.json({ data: household });
  } catch (error) {
    return errorResponse(error);
  }
}
export async function PATCH(request: Request) {
  try {
    const context = await requireAuth();
    requireRole(context, ["owner"]);
    const input = householdSettingsSchema.safeParse(await request.json());
    if (!input.success)
      return Response.json(
        {
          error: {
            code: "VALIDATION_ERROR",
            message: "Invalid household settings.",
            fields: input.error.flatten().fieldErrors,
          },
        },
        { status: 400 },
      );
    return Response.json({
      data: await authRepository.updateHousehold(
        context.membership.householdId,
        input.data,
      ),
    });
  } catch (error) {
    return errorResponse(error);
  }
}
