import { resetFinancialData } from "@/modules/structure/structure.service";
import { requireRole } from "@/shared/auth/authorization";
import { requireAuth } from "@/shared/auth/request-auth";
import { errorResponse } from "@/shared/errors/api-error";
export async function POST(request: Request) {
  try {
    if (process.env.NODE_ENV === "production") return new Response(null, { status: 404 });
    const body = await request.json();
    if (body.confirmation !== "RESET TEST DATA") return new Response(null, { status: 400 });
    const context = await requireAuth();
    requireRole(context, ["owner"]);
    await resetFinancialData(context);
    return Response.json({ data: { reset: true } });
  } catch (error) { return errorResponse(error); }
}
