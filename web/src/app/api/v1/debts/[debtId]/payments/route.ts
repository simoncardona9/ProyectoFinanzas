import { createDebtPaymentSchema } from "@/modules/debts/debt.schemas";
import { payDebt } from "@/modules/debts/debt.service";
import { requireRole } from "@/shared/auth/authorization";
import { requireAuth } from "@/shared/auth/request-auth";
import { errorResponse } from "@/shared/errors/api-error";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ debtId: string }> },
) {
  try {
    const context = await requireAuth();
    requireRole(context, ["owner", "editor"]);
    const input = createDebtPaymentSchema.safeParse(await request.json());
    if (!input.success)
      return Response.json(
        {
          error: {
            code: "VALIDATION_ERROR",
            message: "Invalid debt payment.",
            fields: input.error.flatten().fieldErrors,
          },
        },
        { status: 400 },
      );
    return Response.json(
      { data: await payDebt(context, (await params).debtId, input.data) },
      { status: 201 },
    );
  } catch (error) {
    return errorResponse(error);
  }
}
