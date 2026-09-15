import { requireRole } from "@/shared/auth/authorization";
import { requireAuth } from "@/shared/auth/request-auth";
import { errorResponse } from "@/shared/errors/api-error";
import { commitStructureImport } from "@/modules/imports/import.service";

export const runtime = "nodejs";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ importId: string }> },
) {
  try {
    const auth = await requireAuth();
    requireRole(auth, ["owner", "editor"]);
    const { importId } = await params;
    const idempotencyKey = request.headers.get("Idempotency-Key")?.trim();
    const body = await request.json();
    if (
      !idempotencyKey ||
      idempotencyKey.length > 200 ||
      body?.confirmation !== "IMPORT"
    )
      return Response.json(
        {
          error: {
            code: "VALIDATION_ERROR",
            message:
              "Confirma con IMPORT y usa la clave de idempotencia de la previsualización.",
          },
        },
        { status: 400 },
      );
    return Response.json(
      { data: await commitStructureImport(auth, importId, idempotencyKey) },
      { status: 201 },
    );
  } catch (error) {
    return errorResponse(error);
  }
}
