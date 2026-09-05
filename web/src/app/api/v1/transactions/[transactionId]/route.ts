import { transactionRepository } from "@/modules/transactions/transaction.repository";
import { updatePaidTransactionSchema } from "@/modules/transactions/transaction.schemas";
import { updatePaidTransaction } from "@/modules/transactions/transaction.service";
import { requireRole } from "@/shared/auth/authorization";
import { requireAuth } from "@/shared/auth/request-auth";
import { ApiError, errorResponse } from "@/shared/errors/api-error";

export const runtime = "nodejs";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ transactionId: string }> },
) {
  try {
    const context = await requireAuth();
    const { transactionId } = await params;
    const detail = await transactionRepository.findDetail(
      context.membership.householdId,
      transactionId,
    );
    if (!detail) throw new ApiError(404, "NOT_FOUND", "Transaction not found.");
    return Response.json({ data: detail });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ transactionId: string }> },
) {
  try {
    const context = await requireAuth();
    requireRole(context, ["owner", "editor"]);
    const input = updatePaidTransactionSchema.safeParse(await request.json());
    if (!input.success)
      return Response.json(
        {
          error: {
            code: "VALIDATION_ERROR",
            message: "Invalid transaction update.",
            fields: input.error.flatten().fieldErrors,
          },
        },
        { status: 400 },
      );
    const { transactionId } = await params;
    return Response.json({
      data: await updatePaidTransaction(context, transactionId, input.data),
    });
  } catch (error) {
    return errorResponse(error);
  }
}
