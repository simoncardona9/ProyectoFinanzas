import { cancelInvoiceSchema } from "@/modules/invoices/invoice.schemas";
import { cancelInvoice } from "@/modules/invoices/invoice.service";
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
    const input = cancelInvoiceSchema.safeParse(await request.json());
    if (!input.success)
      return Response.json(
        {
          error: {
            code: "VALIDATION_ERROR",
            message: "Invalid cancellation.",
            fields: input.error.flatten().fieldErrors,
          },
        },
        { status: 400 },
      );
    return Response.json({
      data: await cancelInvoice(
        context,
        (await params).invoiceId,
        input.data.reason,
      ),
    });
  } catch (error) {
    return errorResponse(error);
  }
}
