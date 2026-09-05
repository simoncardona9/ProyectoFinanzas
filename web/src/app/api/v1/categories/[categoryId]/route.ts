import { updateCategorySchema } from "@/modules/structure/structure.schemas";
import { updateCategory } from "@/modules/structure/structure.service";
import { structureRepository } from "@/modules/structure/structure.repository";
import { requireRole } from "@/shared/auth/authorization";
import { requireAuth } from "@/shared/auth/request-auth";
import { ApiError, errorResponse } from "@/shared/errors/api-error";
export const runtime = "nodejs";
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ categoryId: string }> },
) {
  try {
    const context = await requireAuth();
    const { categoryId } = await params;
    const category = await structureRepository.findCategory(
      context.membership.householdId,
      categoryId,
    );
    if (!category) throw new ApiError(404, "NOT_FOUND", "Category not found.");
    return Response.json({ data: category });
  } catch (error) {
    return errorResponse(error);
  }
}
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ categoryId: string }> },
) {
  try {
    const context = await requireAuth();
    requireRole(context, ["owner", "editor"]);
    const input = updateCategorySchema.safeParse(await request.json());
    if (!input.success)
      return Response.json(
        {
          error: {
            code: "VALIDATION_ERROR",
            message: "Invalid category.",
            fields: input.error.flatten().fieldErrors,
          },
        },
        { status: 400 },
      );
    const { categoryId } = await params;
    return Response.json({
      data: await updateCategory(context, categoryId, input.data),
    });
  } catch (error) {
    return errorResponse(error);
  }
}
