import { getAccountCashFlowReport } from "@/modules/reports/account-cash-flow.service";
import { accountCashFlowReportQuerySchema } from "@/modules/reports/account-cash-flow.schemas";
import { requireAuth } from "@/shared/auth/request-auth";
import { errorResponse } from "@/shared/errors/api-error";

export async function GET(request: Request) {
  try {
    const context = await requireAuth();
    const input = accountCashFlowReportQuerySchema.safeParse(
      Object.fromEntries(new URL(request.url).searchParams),
    );
    if (!input.success)
      return Response.json(
        {
          error: {
            code: "VALIDATION_ERROR",
            message: "Invalid account cash-flow report range.",
            fields: input.error.flatten().fieldErrors,
          },
        },
        { status: 400 },
      );
    return Response.json({
      data: await getAccountCashFlowReport(
        context.membership.householdId,
        input.data,
      ),
    });
  } catch (error) {
    return errorResponse(error);
  }
}
