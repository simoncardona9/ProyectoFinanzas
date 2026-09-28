import { groceryRepository } from "@/modules/groceries/grocery.repository";
import { createGroceryPlanSchema } from "@/modules/groceries/grocery.schemas";
import { createGroceryPlan } from "@/modules/groceries/grocery.service";
import { requireRole } from "@/shared/auth/authorization";
import { requireAuth } from "@/shared/auth/request-auth";
import { errorResponse } from "@/shared/errors/api-error";

function validation(fields: Record<string, string[] | undefined>) {
  return Response.json(
    {
      error: {
        code: "VALIDATION_ERROR",
        message: "Invalid grocery plan.",
        fields,
      },
    },
    { status: 400 },
  );
}

export async function GET() {
  try {
    const context = await requireAuth();
    return Response.json({
      data: await groceryRepository.listPlans(context.membership.householdId),
    });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function POST(request: Request) {
  try {
    const context = await requireAuth();
    requireRole(context, ["owner", "editor"]);
    const input = createGroceryPlanSchema.safeParse(await request.json());
    if (!input.success) return validation(input.error.flatten().fieldErrors);
    return Response.json(
      { data: await createGroceryPlan(context, input.data) },
      { status: 201 },
    );
  } catch (error) {
    return errorResponse(error);
  }
}
