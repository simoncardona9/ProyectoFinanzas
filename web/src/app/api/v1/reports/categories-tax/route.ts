import { getCategoryTaxReport } from "@/modules/reports/category-tax-report.service";
import { categoryTaxReportQuerySchema } from "@/modules/reports/category-tax-report.schemas";
import { requireAuth } from "@/shared/auth/request-auth";
import { errorResponse } from "@/shared/errors/api-error";

export async function GET(request: Request) {
  try {
    const context = await requireAuth();
    const input = categoryTaxReportQuerySchema.safeParse(
      Object.fromEntries(new URL(request.url).searchParams),
    );
    if (!input.success)
      return Response.json(
        {
          error: {
            code: "VALIDATION_ERROR",
            message: "Invalid category and tax report range.",
            fields: input.error.flatten().fieldErrors,
          },
        },
        { status: 400 },
      );
    return Response.json({
      data: await getCategoryTaxReport(
        context.membership.householdId,
        input.data,
      ),
    });
  } catch (error) {
    return errorResponse(error);
  }
}
