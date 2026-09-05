import { voidTransactionSchema } from "@/modules/transactions/transaction.schemas";
import { voidPaidTransaction } from "@/modules/transactions/transaction.service";
import { requireRole } from "@/shared/auth/authorization";
import { requireAuth } from "@/shared/auth/request-auth";
import { errorResponse } from "@/shared/errors/api-error";

export const runtime = "nodejs";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ transactionId: string }> },
) {
  try {
    const context = await requireAuth();
    requireRole(context, ["owner", "editor"]);
    const input = voidTransactionSchema.safeParse(await request.json());
    if (!input.success)
      return Response.json(
        {
          error: {
            code: "VALIDATION_ERROR",
            message: "Invalid void request.",
            fields: input.error.flatten().fieldErrors,
          },
        },
        { status: 400 },
      );
    const { transactionId } = await params;
    return Response.json({
      data: await voidPaidTransaction(
        context,
        transactionId,
        input.data.reason,
      ),
    });
  } catch (error) {
    return errorResponse(error);
  }
}
