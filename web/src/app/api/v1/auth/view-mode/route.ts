import { z } from "zod";
import { authRepository } from "@/modules/auth/auth.repository";
import { requireAuth } from "@/shared/auth/request-auth";
import { errorResponse } from "@/shared/errors/api-error";

export const runtime = "nodejs";

export async function PATCH(request: Request) {
  try {
    const context = await requireAuth();
    const input = z
      .strictObject({ viewMode: z.enum(["basic", "advanced"]) })
      .safeParse(await request.json().catch(() => null));
    if (!input.success) {
      return Response.json(
        {
          error: { code: "VALIDATION_ERROR", message: "Choose a valid view." },
        },
        { status: 400 },
      );
    }
    return Response.json({
      data: await authRepository.updateViewMode(
        context.user.id,
        input.data.viewMode,
      ),
    });
  } catch (error) {
    return errorResponse(error);
  }
}
