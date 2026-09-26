import { updateGroceryPlanSchema } from "@/modules/groceries/grocery.schemas";
import {
  getGroceryPlanDetail,
  updateGroceryPlan,
} from "@/modules/groceries/grocery.service";
import { requireRole } from "@/shared/auth/authorization";
import { requireAuth } from "@/shared/auth/request-auth";
import { errorResponse } from "@/shared/errors/api-error";

type RouteContext = { params: Promise<{ planId: string }> };

export async function GET(_: Request, { params }: RouteContext) {
  try {
    const context = await requireAuth();
    const { planId } = await params;
    return Response.json({ data: await getGroceryPlanDetail(context, planId) });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function PATCH(request: Request, { params }: RouteContext) {
  try {
    const context = await requireAuth();
    requireRole(context, ["owner", "editor"]);
    const input = updateGroceryPlanSchema.safeParse(await request.json());
    if (!input.success)
      return Response.json(
        {
          error: {
            code: "VALIDATION_ERROR",
            message: "Invalid grocery plan.",
            fields: input.error.flatten().fieldErrors,
          },
        },
        { status: 400 },
      );
    const { planId } = await params;
    return Response.json({
      data: await updateGroceryPlan(context, planId, input.data),
    });
  } catch (error) {
    return errorResponse(error);
  }
}
