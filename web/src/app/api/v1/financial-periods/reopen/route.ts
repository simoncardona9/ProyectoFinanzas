import { financialPeriodRepository } from "@/modules/financial-periods/financial-period.repository";
import { reopenFinancialPeriodSchema } from "@/modules/financial-periods/financial-period.schemas";
import { reopenFinancialPeriod } from "@/modules/financial-periods/financial-period.service";
import { requireRole } from "@/shared/auth/authorization";
import { requireAuth } from "@/shared/auth/request-auth";
import { errorResponse } from "@/shared/errors/api-error";

export async function POST(request: Request) {
  try {
    const context = await requireAuth();
    requireRole(context, ["owner"]);
    const input = reopenFinancialPeriodSchema.safeParse(await request.json());
    if (!input.success)
      return Response.json(
        {
          error: {
            code: "VALIDATION_ERROR",
            message: "Invalid financial period reopen request.",
            fields: input.error.flatten().fieldErrors,
          },
        },
        { status: 400 },
      );
    return Response.json({
      data: await reopenFinancialPeriod(
        financialPeriodRepository,
        context,
        input.data.period,
        input.data.reason,
      ),
    });
  } catch (error) {
    return errorResponse(error);
  }
}
