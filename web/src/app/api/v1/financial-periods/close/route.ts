import { financialPeriodRepository } from "@/modules/financial-periods/financial-period.repository";
import { closeFinancialPeriodSchema } from "@/modules/financial-periods/financial-period.schemas";
import { closeFinancialPeriod } from "@/modules/financial-periods/financial-period.service";
import { requireRole } from "@/shared/auth/authorization";
import { requireAuth } from "@/shared/auth/request-auth";
import { errorResponse } from "@/shared/errors/api-error";

export async function POST(request: Request) {
  try {
    const context = await requireAuth();
    requireRole(context, ["owner"]);
    const input = closeFinancialPeriodSchema.safeParse(await request.json());
    if (!input.success)
      return Response.json(
        {
          error: {
            code: "VALIDATION_ERROR",
            message: "Invalid financial period close request.",
            fields: input.error.flatten().fieldErrors,
          },
        },
        { status: 400 },
      );
    return Response.json({
      data: await closeFinancialPeriod(
        financialPeriodRepository,
        context,
        input.data.period,
      ),
    });
  } catch (error) {
    return errorResponse(error);
  }
}
