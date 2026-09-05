import { activeHouseholdSchema } from "@/modules/auth/auth.schemas";
import { changeActiveHousehold } from "@/modules/auth/auth.service";
import { requireAuth } from "@/shared/auth/request-auth";
import { errorResponse } from "@/shared/errors/api-error";
export const runtime = "nodejs";
export async function POST(request: Request) {
  try {
    const input = activeHouseholdSchema.safeParse(await request.json());
    if (!input.success)
      return Response.json(
        {
          error: {
            code: "VALIDATION_ERROR",
            message: "A valid householdId is required.",
          },
        },
        { status: 400 },
      );
    const membership = await changeActiveHousehold(
      await requireAuth(),
      input.data.householdId,
    );
    return Response.json({ data: { activeMembership: membership } });
  } catch (error) {
    return errorResponse(error);
  }
}
