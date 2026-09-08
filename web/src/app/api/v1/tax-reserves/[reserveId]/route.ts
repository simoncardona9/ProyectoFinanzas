import { taxReserveRepository } from "@/modules/tax-reserves/tax-reserve.repository";
import { requireAuth } from "@/shared/auth/request-auth";
import { ApiError, errorResponse } from "@/shared/errors/api-error";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ reserveId: string }> },
) {
  try {
    const context = await requireAuth();
    const detail = await taxReserveRepository.findDetail(
      context.membership.householdId,
      (await params).reserveId,
    );
    if (!detail) throw new ApiError(404, "NOT_FOUND", "Tax reserve not found.");
    return Response.json({ data: detail });
  } catch (error) {
    return errorResponse(error);
  }
}
