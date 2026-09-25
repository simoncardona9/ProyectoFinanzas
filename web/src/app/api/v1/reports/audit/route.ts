import { getAuditReport } from "@/modules/reports/audit-export.service";
import { auditReportQuerySchema } from "@/modules/reports/audit-export.schemas";
import { requireAuth } from "@/shared/auth/request-auth";
import { errorResponse } from "@/shared/errors/api-error";

export async function GET(request: Request) {
  try {
    const input = auditReportQuerySchema.safeParse(Object.fromEntries(new URL(request.url).searchParams));
    if (!input.success) return Response.json({ error: { code: "VALIDATION_ERROR", message: "Invalid audit report filters.", fields: input.error.flatten().fieldErrors } }, { status: 400 });
    return Response.json({ data: await getAuditReport(await requireAuth(), input.data) });
  } catch (error) {
    return errorResponse(error);
  }
}
