import { createFinancialCsvExport } from "@/modules/reports/audit-export.service";
import { financialExportQuerySchema } from "@/modules/reports/audit-export.schemas";
import { requireAuth } from "@/shared/auth/request-auth";
import { errorResponse } from "@/shared/errors/api-error";

export async function GET(request: Request) {
  try {
    const input = financialExportQuerySchema.safeParse(
      Object.fromEntries(new URL(request.url).searchParams),
    );
    if (!input.success)
      return Response.json(
        {
          error: {
            code: "VALIDATION_ERROR",
            message: "Invalid financial export range.",
            fields: input.error.flatten().fieldErrors,
          },
        },
        { status: 400 },
      );
    const result = await createFinancialCsvExport(
      await requireAuth(),
      input.data,
    );
    return new Response(`\uFEFF${result.csv}`, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="financial-records-${input.data.from}-to-${input.data.to}.csv"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    return errorResponse(error);
  }
}
