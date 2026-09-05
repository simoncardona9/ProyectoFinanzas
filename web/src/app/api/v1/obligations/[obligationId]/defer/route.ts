import { deferObligationSchema } from "@/modules/obligations/obligation.schemas";
import { deferObligation } from "@/modules/obligations/obligation.service";
import { requireRole } from "@/shared/auth/authorization";
import { requireAuth } from "@/shared/auth/request-auth";
import { errorResponse } from "@/shared/errors/api-error";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ obligationId: string }> },
) {
  try {
    const context = await requireAuth();
    requireRole(context, ["owner", "editor"]);
    const input = deferObligationSchema.safeParse(await request.json());
    if (!input.success)
      return Response.json(
        {
          error: {
            code: "VALIDATION_ERROR",
            message: "Invalid deferral.",
            fields: input.error.flatten().fieldErrors,
          },
        },
        { status: 400 },
      );
    return Response.json({
      data: await deferObligation(
        context,
        (await params).obligationId,
        input.data.newDueDate,
        input.data.reason,
      ),
    });
  } catch (error) {
    return errorResponse(error);
  }
}
