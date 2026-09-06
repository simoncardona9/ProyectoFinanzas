import { debtRepository } from "@/modules/debts/debt.repository";
import { requireAuth } from "@/shared/auth/request-auth";
import { ApiError, errorResponse } from "@/shared/errors/api-error";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ debtId: string }> },
) {
  try {
    const context = await requireAuth();
    const { debtId } = await params;
    const detail = await debtRepository.findDetail(
      context.membership.householdId,
      debtId,
    );
    if (!detail) throw new ApiError(404, "NOT_FOUND", "Debt not found.");
    return Response.json({ data: detail });
  } catch (error) {
    return errorResponse(error);
  }
}
