import { seedCategories } from "@/modules/structure/structure.service";
import { requireRole } from "@/shared/auth/authorization";
import { requireAuth } from "@/shared/auth/request-auth";
import { errorResponse } from "@/shared/errors/api-error";
export const runtime = "nodejs";
export async function POST() {
  try {
    const context = await requireAuth();
    requireRole(context, ["owner", "editor"]);
    return Response.json(
      { data: await seedCategories(context) },
      { status: 201 },
    );
  } catch (error) {
    return errorResponse(error);
  }
}
