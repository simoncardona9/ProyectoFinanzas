import { requireRole } from "@/shared/auth/authorization";
import { requireAuth } from "@/shared/auth/request-auth";
import { errorResponse } from "@/shared/errors/api-error";
import {
  fileConversionPreviewData,
  parseCsvImport,
  parseExcelImport,
} from "@/modules/imports/file-import-parser";
import { previewJsonImport } from "@/modules/imports/import.service";

export const runtime = "nodejs";

const maxUploadBytes = 10 * 1024 * 1024;

export async function POST(request: Request) {
  try {
    const context = await requireAuth();
    requireRole(context, ["owner", "editor"]);
    const idempotencyKey = request.headers.get("Idempotency-Key")?.trim();
    if (!idempotencyKey || idempotencyKey.length > 200)
      return Response.json({ error: { code: "VALIDATION_ERROR", message: "Se requiere una clave de idempotencia de hasta 200 caracteres." } }, { status: 400 });
    const form = await request.formData();
    const file = form.get("file");
    const declaredPeriod = String(form.get("declaredPeriod") ?? "").trim() || undefined;
    if (!(file instanceof File) || !file.name)
      return Response.json({ error: { code: "VALIDATION_ERROR", message: "Selecciona un archivo CSV, XLSX o XLSM." } }, { status: 400 });
    if (file.size > maxUploadBytes)
      return Response.json({ error: { code: "VALIDATION_ERROR", message: "El archivo supera el límite de 10 MB." } }, { status: 400 });
    if (declaredPeriod && !/^\d{4}-(0[1-9]|1[0-2])$/.test(declaredPeriod))
      return Response.json({ error: { code: "VALIDATION_ERROR", message: "El período declarado debe tener formato AAAA-MM." } }, { status: 400 });
    const bytes = new Uint8Array(await file.arrayBuffer());
    const extension = file.name.toLocaleLowerCase().split(".").pop();
    const conversion = extension === "csv"
      ? parseCsvImport(bytes, file.name, declaredPeriod)
      : extension === "xlsx" || extension === "xlsm"
        ? parseExcelImport(bytes, file.name, declaredPeriod)
        : undefined;
    if (!conversion)
      return Response.json({ error: { code: "VALIDATION_ERROR", message: "Solo se admiten archivos .csv, .xlsx y .xlsm." } }, { status: 400 });
    if (conversion.report.issues.some((issue) => issue.severity === "error"))
      return Response.json(
        { data: fileConversionPreviewData(conversion, null) },
        { status: 422 },
      );
    return Response.json({
      data: {
        ...fileConversionPreviewData(
          conversion,
          await previewJsonImport(context, idempotencyKey, conversion.bundle),
        ),
      },
    });
  } catch (error) {
    return errorResponse(error);
  }
}
