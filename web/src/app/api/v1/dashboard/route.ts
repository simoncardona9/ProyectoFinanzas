import { getDashboard } from "@/modules/dashboard/dashboard.service";
import { dashboardPeriodSchema } from "@/modules/dashboard/dashboard.schemas";
import { requireAuth } from "@/shared/auth/request-auth";
import { errorResponse } from "@/shared/errors/api-error";

export async function GET(request: Request) {
  try {
    const context = await requireAuth();
    const input = dashboardPeriodSchema.safeParse(
      Object.fromEntries(new URL(request.url).searchParams),
    );
    if (!input.success)
      return Response.json(
        {
          error: {
            code: "VALIDATION_ERROR",
            message: "Invalid dashboard period.",
            fields: input.error.flatten().fieldErrors,
          },
        },
        { status: 400 },
      );
    return Response.json({
      data: await getDashboard(
        context.membership.householdId,
        input.data.period,
      ),
    });
  } catch (error) {
    return errorResponse(error);
  }
}
