import { groceryRepository } from "@/modules/groceries/grocery.repository";
import { publishGroceryCatalogRecordSchema } from "@/modules/groceries/grocery.schemas";
import { publishGroceryCatalogRecord } from "@/modules/groceries/grocery.service";
import { requireRole } from "@/shared/auth/authorization";
import { requireAuth } from "@/shared/auth/request-auth";
import { errorResponse } from "@/shared/errors/api-error";

export async function GET() {
  try {
    const context = await requireAuth();
    return Response.json({
      data: await groceryRepository.listPublications(
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
    const input = publishGroceryCatalogRecordSchema.safeParse(
      await request.json(),
    );
    if (!input.success)
      return Response.json(
        {
          error: {
            code: "VALIDATION_ERROR",
            message: "Invalid grocery catalog publication.",
            fields: input.error.flatten().fieldErrors,
          },
        },
        { status: 400 },
      );
    return Response.json(
      { data: await publishGroceryCatalogRecord(context, input.data) },
      { status: 201 },
    );
  } catch (error) {
    return errorResponse(error);
  }
}
