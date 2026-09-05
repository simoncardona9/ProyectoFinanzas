import { updateAccountSchema } from "@/modules/structure/structure.schemas";
import { updateAccount } from "@/modules/structure/structure.service";
import { structureRepository } from "@/modules/structure/structure.repository";
import { requireRole } from "@/shared/auth/authorization";
import { requireAuth } from "@/shared/auth/request-auth";
import { ApiError, errorResponse } from "@/shared/errors/api-error";
export const runtime = "nodejs";
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ accountId: string }> },
) {
  try {
    const context = await requireAuth();
    const { accountId } = await params;
    const account = await structureRepository.findAccount(
      context.membership.householdId,
      accountId,
    );
    if (!account) throw new ApiError(404, "NOT_FOUND", "Account not found.");
    return Response.json({ data: account });
  } catch (error) {
    return errorResponse(error);
  }
}
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ accountId: string }> },
) {
  try {
    const context = await requireAuth();
    requireRole(context, ["owner", "editor"]);
    const input = updateAccountSchema.safeParse(await request.json());
    if (!input.success)
      return Response.json(
        {
          error: {
            code: "VALIDATION_ERROR",
            message: "Invalid account.",
            fields: input.error.flatten().fieldErrors,
          },
        },
        { status: 400 },
      );
    const { accountId } = await params;
    return Response.json({
      data: await updateAccount(context, accountId, input.data),
    });
  } catch (error) {
    return errorResponse(error);
  }
}
