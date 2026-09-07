import { debtRepository } from "@/modules/debts/debt.repository";
import { getDebtExposure } from "@/modules/debts/debt-exposure.service";
import { debtExposureQuerySchema } from "@/modules/debts/debt.schemas";
import { requireAuth } from "@/shared/auth/request-auth";
import { ApiError, errorResponse } from "@/shared/errors/api-error";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ debtId: string }> },
) {
  try {
    const context = await requireAuth();
    const { debtId } = await params;
    const input = debtExposureQuerySchema.safeParse(
      Object.fromEntries(new URL(request.url).searchParams),
    );
    if (!input.success)
      return Response.json(
        {
          error: {
            code: "VALIDATION_ERROR",
            message: "Invalid exchange-rate selection.",
            fields: input.error.flatten().fieldErrors,
          },
        },
        { status: 400 },
      );
    const detail = await debtRepository.findDetail(
      context.membership.householdId,
      debtId,
    );
    if (!detail) throw new ApiError(404, "NOT_FOUND", "Debt not found.");
    return Response.json({
      data: {
        ...detail,
        exposure: await getDebtExposure(
          context.membership.householdId,
          detail.debt,
          input.data.exchangeRateId,
        ),
      },
    });
  } catch (error) {
    return errorResponse(error);
  }
}
