import {
  createExpectedIncomeSchema,
  createPaidTransactionSchema,
  listPaidTransactionsSchema,
} from "@/modules/transactions/transaction.schemas";
import { transactionRepository } from "@/modules/transactions/transaction.repository";
import {
  createExpectedIncome,
  createPaidTransaction,
} from "@/modules/transactions/transaction.service";
import { requireRole } from "@/shared/auth/authorization";
import { requireAuth } from "@/shared/auth/request-auth";
import { errorResponse } from "@/shared/errors/api-error";

export const runtime = "nodejs";

function validation(fields: Record<string, string[] | undefined>) {
  return Response.json(
    {
      error: {
        code: "VALIDATION_ERROR",
        message: "Invalid transaction.",
        fields,
      },
    },
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
    const body = await request.json();
    const paidInput = createPaidTransactionSchema.safeParse(body);
    if (paidInput.success)
      return Response.json(
        { data: await createPaidTransaction(context, paidInput.data) },
        { status: 201 },
      );
    const expectedInput = createExpectedIncomeSchema.safeParse(body);
    if (!expectedInput.success)
      return validation(expectedInput.error.flatten().fieldErrors);
    return Response.json(
      { data: await createExpectedIncome(context, expectedInput.data) },
      { status: 201 },
    );
  } catch (error) {
    return errorResponse(error);
  }
}
