import {
  createPaidTransactionSchema,
  listPaidTransactionsSchema,
} from "@/modules/transactions/transaction.schemas";
import { transactionRepository } from "@/modules/transactions/transaction.repository";
import { createPaidTransaction } from "@/modules/transactions/transaction.service";
import { requireRole } from "@/shared/auth/authorization";
import { requireAuth } from "@/shared/auth/request-auth";
import { errorResponse } from "@/shared/errors/api-error";

export const runtime = "nodejs";

function validation(fields: Record<string, string[] | undefined>) {
  return Response.json(
    { error: { code: "VALIDATION_ERROR", message: "Invalid transaction.", fields } },
    { status: 400 },
  );
}

export async function GET(request: Request) {
  try {
    const context = await requireAuth();
    const input = listPaidTransactionsSchema.safeParse(
      Object.fromEntries(new URL(request.url).searchParams),
    );
    if (!input.success) return validation(input.error.flatten().fieldErrors);
    return Response.json({
      data: await transactionRepository.listPaid(
        context.membership.householdId,
        input.data,
      ),
    });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function POST(request: Request) {
  try {
    const context = await requireAuth();
    requireRole(context, ["owner", "editor"]);
    const input = createPaidTransactionSchema.safeParse(await request.json());
    if (!input.success) return validation(input.error.flatten().fieldErrors);
    return Response.json(
      { data: await createPaidTransaction(context, input.data) },
      { status: 201 },
    );
  } catch (error) {
    return errorResponse(error);
  }
}
