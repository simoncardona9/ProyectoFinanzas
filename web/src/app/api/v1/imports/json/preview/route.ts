import { requireRole } from "@/shared/auth/authorization";
import { requireAuth } from "@/shared/auth/request-auth";
import { errorResponse } from "@/shared/errors/api-error";
import { financeImportBundleSchema } from "@/modules/imports/import.schemas";
import { previewJsonImport } from "@/modules/imports/import.service";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const context = await requireAuth();
    requireRole(context, ["owner", "editor"]);
    const idempotencyKey = request.headers.get("Idempotency-Key")?.trim();
    if (!idempotencyKey || idempotencyKey.length > 200)
      return Response.json(
        {
          error: {
            code: "VALIDATION_ERROR",
            message:
              "Se requiere una clave de idempotencia de hasta 200 caracteres.",
          },
        },
        { status: 400 },
      );
    const input = financeImportBundleSchema.safeParse(await request.json());
    if (!input.success)
      return Response.json(
        {
          error: {
            code: "VALIDATION_ERROR",
            message: "El paquete de importación no es válido.",
            fields: input.error.flatten().fieldErrors,
          },
        },
        { status: 400 },
      );
    return Response.json({
      data: await previewJsonImport(context, idempotencyKey, input.data),
    });
  } catch (error) {
    return errorResponse(error);
  }
}
