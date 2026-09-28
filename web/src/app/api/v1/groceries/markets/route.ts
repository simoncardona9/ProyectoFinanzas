import { groceryRepository } from "@/modules/groceries/grocery.repository";
import { createGroceryMarketSchema } from "@/modules/groceries/grocery.schemas";
import { createGroceryMarket } from "@/modules/groceries/grocery.service";
import { requireRole } from "@/shared/auth/authorization";
import { requireAuth } from "@/shared/auth/request-auth";
import { errorResponse } from "@/shared/errors/api-error";

export async function GET() {
  try {
    const context = await requireAuth();
    return Response.json({
      data: await groceryRepository.listMarkets(context.membership.householdId),
    });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function POST(request: Request) {
  try {
    const context = await requireAuth();
    requireRole(context, ["owner", "editor"]);
    const input = createGroceryMarketSchema.safeParse(await request.json());
    if (!input.success)
      return Response.json(
        {
          error: {
            code: "VALIDATION_ERROR",
            message: "Invalid market.",
            fields: input.error.flatten().fieldErrors,
          },
        },
        { status: 400 },
      );
    return Response.json(
      { data: await createGroceryMarket(context, input.data) },
      { status: 201 },
    );
  } catch (error) {
    return errorResponse(error);
  }
}
