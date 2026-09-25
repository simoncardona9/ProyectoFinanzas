import { financialPeriodRepository } from "@/modules/financial-periods/financial-period.repository";
import { financialPeriodQuerySchema } from "@/modules/financial-periods/financial-period.schemas";
import { getFinancialPeriodStatus } from "@/modules/financial-periods/financial-period.service";
import { requireAuth } from "@/shared/auth/request-auth";
import { errorResponse } from "@/shared/errors/api-error";

export async function GET(request: Request) {
  try {
    const context = await requireAuth();
    const input = financialPeriodQuerySchema.safeParse(
      Object.fromEntries(new URL(request.url).searchParams),
    );
    if (!input.success) {
      return Response.json(
        {
          error: {
            code: "VALIDATION_ERROR",
            message: "Invalid financial period.",
            fields: input.error.flatten().fieldErrors,
          },
        },
        { status: 400 },
      );
    }
    const periodRecord = await financialPeriodRepository.find(
      context.membership.householdId,
      `${input.data.period}-01`,
    );
    return Response.json({
      data: {
        ...(await getFinancialPeriodStatus(
          financialPeriodRepository,
          context.membership.householdId,
          input.data.period,
        )),
        audit: periodRecord
          ? await financialPeriodRepository.history(
              context.membership.householdId,
              periodRecord.id,
            )
          : [],
      },
    });
  } catch (error) {
    return errorResponse(error);
  }
}
