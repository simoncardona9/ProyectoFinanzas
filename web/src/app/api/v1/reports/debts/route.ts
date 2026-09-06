import { debtReportQuerySchema } from "@/modules/debts/debt.schemas";
import { getDebtReport } from "@/modules/debts/debt-report.service";
import { requireAuth } from "@/shared/auth/request-auth";
import { errorResponse } from "@/shared/errors/api-error";

export async function GET(request: Request) {
  try {
    const context = await requireAuth();
    const input = debtReportQuerySchema.safeParse(
      Object.fromEntries(new URL(request.url).searchParams),
    );
    if (!input.success)
      return Response.json(
        {
          error: {
            code: "VALIDATION_ERROR",
            message: "Invalid debt-report rate selection.",
            fields: input.error.flatten().fieldErrors,
          },
        },
        { status: 400 },
      );
    return Response.json({
      data: await getDebtReport(
        context.membership.householdId,
        input.data.exchangeRateId,
      ),
    });
  } catch (error) {
    return errorResponse(error);
  }
}
