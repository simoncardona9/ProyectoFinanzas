import { sendInvoiceSchema } from "@/modules/invoices/invoice.schemas";
import { sendInvoice } from "@/modules/invoices/invoice.service";
import { requireRole } from "@/shared/auth/authorization";
import { requireAuth } from "@/shared/auth/request-auth";
import { errorResponse } from "@/shared/errors/api-error";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ invoiceId: string }> },
) {
  try {
    const context = await requireAuth();
    requireRole(context, ["owner", "editor"]);
    const input = sendInvoiceSchema.safeParse(await request.json());
    if (!input.success)
      return Response.json(
        {
          error: {
            code: "VALIDATION_ERROR",
            message: "Invalid sent date.",
            fields: input.error.flatten().fieldErrors,
          },
        },
        { status: 400 },
      );
    return Response.json({
      data: await sendInvoice(
        context,
        (await params).invoiceId,
        input.data.sentDate,
      ),
    });
  } catch (error) {
    return errorResponse(error);
  }
}
