import { archiveAccount } from "@/modules/structure/structure.service";
import { requireRole } from "@/shared/auth/authorization";
import { requireAuth } from "@/shared/auth/request-auth";
import { errorResponse } from "@/shared/errors/api-error";
export const runtime = "nodejs";
export async function POST(
  _request: Request,
  { params }: { params: Promise<{ accountId: string }> },
) {
  try {
    const context = await requireAuth();
    requireRole(context, ["owner", "editor"]);
    const { accountId } = await params;
    return Response.json({ data: await archiveAccount(context, accountId) });
  } catch (error) {
    return errorResponse(error);
  }
}
