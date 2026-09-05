import { archiveCategory } from "@/modules/structure/structure.service";
import { requireRole } from "@/shared/auth/authorization";
import { requireAuth } from "@/shared/auth/request-auth";
import { errorResponse } from "@/shared/errors/api-error";
export const runtime = "nodejs";
export async function POST(
  _request: Request,
  { params }: { params: Promise<{ categoryId: string }> },
) {
  try {
    const context = await requireAuth();
    requireRole(context, ["owner", "editor"]);
    const { categoryId } = await params;
    return Response.json({ data: await archiveCategory(context, categoryId) });
  } catch (error) {
    return errorResponse(error);
  }
}
