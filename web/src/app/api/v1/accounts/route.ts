import { createAccountSchema } from "@/modules/structure/structure.schemas";
import { createAccount } from "@/modules/structure/structure.service";
import { structureRepository } from "@/modules/structure/structure.repository";
import { requireRole } from "@/shared/auth/authorization";
import { requireAuth } from "@/shared/auth/request-auth";
import { errorResponse } from "@/shared/errors/api-error";
export const runtime = "nodejs";
function validation(input: ReturnType<typeof createAccountSchema.safeParse>) {
  return Response.json(
    {
      error: {
        code: "VALIDATION_ERROR",
        message: "Invalid account.",
        fields: input.error?.flatten().fieldErrors,
      },
    },
    { status: 400 },
  );
}
export async function GET(request: Request) {
  try {
    const context = await requireAuth();
    const active = new URL(request.url).searchParams.get("active");
    return Response.json({
      data: await structureRepository.listAccounts(
        context.membership.householdId,
        active === null ? undefined : active === "true",
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
    const input = createAccountSchema.safeParse(await request.json());
    if (!input.success) return validation(input);
    return Response.json(
      { data: await createAccount(context, input.data) },
      { status: 201 },
    );
  } catch (error) {
    return errorResponse(error);
  }
}
