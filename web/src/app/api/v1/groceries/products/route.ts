import { groceryRepository } from "@/modules/groceries/grocery.repository";
import { createGroceryProductSchema } from "@/modules/groceries/grocery.schemas";
import { createGroceryProduct } from "@/modules/groceries/grocery.service";
import { requireRole } from "@/shared/auth/authorization";
import { requireAuth } from "@/shared/auth/request-auth";
import { errorResponse } from "@/shared/errors/api-error";

export async function GET() {
  try {
    const context = await requireAuth();
    return Response.json({
      data: await groceryRepository.listProducts(
        context.membership.householdId,
      ),
    });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function POST(request: Request) {
  try {
    const context = await requireAuth();
    requireRole(context, ["owner", "editor"]);
    const input = createGroceryProductSchema.safeParse(await request.json());
    if (!input.success)
      return Response.json(
        {
          error: {
            code: "VALIDATION_ERROR",
            message: "Invalid product.",
            fields: input.error.flatten().fieldErrors,
          },
        },
        { status: 400 },
      );
    return Response.json(
      { data: await createGroceryProduct(context, input.data) },
      { status: 201 },
    );
  } catch (error) {
    return errorResponse(error);
  }
}
