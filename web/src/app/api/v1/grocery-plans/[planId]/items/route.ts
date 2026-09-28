import { createGroceryPlanItemSchema } from "@/modules/groceries/grocery.schemas";
import { addGroceryPlanItem } from "@/modules/groceries/grocery.service";
import { requireRole } from "@/shared/auth/authorization";
import { requireAuth } from "@/shared/auth/request-auth";
import { errorResponse } from "@/shared/errors/api-error";

type RouteContext = { params: Promise<{ planId: string }> };

export async function POST(request: Request, { params }: RouteContext) {
  try {
    const context = await requireAuth();
    requireRole(context, ["owner", "editor"]);
    const input = createGroceryPlanItemSchema.safeParse(await request.json());
    if (!input.success)
      return Response.json(
        {
          error: {
            code: "VALIDATION_ERROR",
            message: "Invalid grocery plan item.",
            fields: input.error.flatten().fieldErrors,
          },
        },
        { status: 400 },
      );
    const { planId } = await params;
    return Response.json(
      { data: await addGroceryPlanItem(context, planId, input.data) },
      { status: 201 },
    );
  } catch (error) {
    return errorResponse(error);
  }
}
