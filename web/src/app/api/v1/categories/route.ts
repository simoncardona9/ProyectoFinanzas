import { createCategorySchema } from "@/modules/structure/structure.schemas";
import { createCategory } from "@/modules/structure/structure.service";
import { structureRepository } from "@/modules/structure/structure.repository";
import { requireRole } from "@/shared/auth/authorization";
import { requireAuth } from "@/shared/auth/request-auth";
import { errorResponse } from "@/shared/errors/api-error";
export const runtime = "nodejs";
export async function GET(request: Request) {
  try {
    const context = await requireAuth();
    const p = new URL(request.url).searchParams;
    const active = p.get("active");
    const kind = p.get("kind");
    const rows = await structureRepository.listCategories(
      context.membership.householdId,
      active === null ? undefined : active === "true",
    );
    return Response.json({
      data: kind ? rows.filter((row) => row.kind === kind) : rows,
    });
  } catch (error) {
    return errorResponse(error);
  }
}
export async function POST(request: Request) {
  try {
    const context = await requireAuth();
    requireRole(context, ["owner", "editor"]);
    const input = createCategorySchema.safeParse(await request.json());
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
    return Response.json(
      {
        data: await createCategory(context, {
          ...input.data,
          parentCategoryId: input.data.parentId ?? null,
        }),
      },
      { status: 201 },
    );
  } catch (error) {
    return errorResponse(error);
  }
}
export async function PUT() {
  return Response.json(
    {
      error: {
        code: "METHOD_NOT_ALLOWED",
        message:
          "Use POST /categories/seed to install the controlled defaults.",
      },
    },
    { status: 405 },
  );
}
