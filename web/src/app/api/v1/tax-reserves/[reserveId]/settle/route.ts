import { settleTaxReserveSchema } from "@/modules/tax-reserves/tax-reserve.schemas";
import { settleTaxReserve } from "@/modules/tax-reserves/tax-reserve.service";
import { requireRole } from "@/shared/auth/authorization";
import { requireAuth } from "@/shared/auth/request-auth";
import { errorResponse } from "@/shared/errors/api-error";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ reserveId: string }> },
) {
  try {
    const context = await requireAuth();
    requireRole(context, ["owner", "editor"]);
    const input = settleTaxReserveSchema.safeParse(await request.json());
    if (!input.success)
      return Response.json(
        {
          error: {
            code: "VALIDATION_ERROR",
            message: "Invalid tax-reserve settlement.",
            fields: input.error.flatten().fieldErrors,
          },
        },
        { status: 400 },
      );
    return Response.json(
      {
        data: await settleTaxReserve(
          context,
          (await params).reserveId,
          input.data,
        ),
      },
      { status: 201 },
    );
  } catch (error) {
    return errorResponse(error);
  }
}
