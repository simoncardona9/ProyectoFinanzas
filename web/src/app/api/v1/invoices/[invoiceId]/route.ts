import { invoiceRepository } from "@/modules/invoices/invoice.repository";
import { requireAuth } from "@/shared/auth/request-auth";
import { ApiError, errorResponse } from "@/shared/errors/api-error";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ invoiceId: string }> },
) {
  try {
    const context = await requireAuth();
    const detail = await invoiceRepository.findDetail(
      context.membership.householdId,
      (await params).invoiceId,
    );
    if (!detail) throw new ApiError(404, "NOT_FOUND", "Invoice not found.");
    return Response.json({ data: detail });
  } catch (error) {
    return errorResponse(error);
  }
}
