import { monthForecastSchema } from "@/modules/obligations/obligation.schemas";
import { obligationRepository } from "@/modules/obligations/obligation.repository";
import { requireAuth } from "@/shared/auth/request-auth";
import { errorResponse } from "@/shared/errors/api-error";

export async function GET(request: Request) {
  try {
    const context = await requireAuth();
    const input = monthForecastSchema.safeParse(
      Object.fromEntries(new URL(request.url).searchParams),
    );
    if (!input.success)
      return Response.json(
        {
          error: {
            code: "VALIDATION_ERROR",
            message: "Invalid forecast period.",
            fields: input.error.flatten().fieldErrors,
          },
        },
        { status: 400 },
      );
    const [year, month] = input.data.period.split("-").map(Number);
    const from = `${input.data.period}-01`;
    const to = new Date(Date.UTC(year, month, 0)).toISOString().slice(0, 10);
    return Response.json({
      data: {
        period: input.data.period,
        currencies: await obligationRepository.forecast(
          context.membership.householdId,
          from,
          to,
        ),
      },
    });
  } catch (error) {
    return errorResponse(error);
  }
}
