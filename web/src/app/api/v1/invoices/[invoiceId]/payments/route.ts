import { createInvoiceCollectionSchema } from "@/modules/invoices/invoice.schemas";
import { collectInvoice } from "@/modules/invoices/invoice.service";
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
    const input = createInvoiceCollectionSchema.safeParse(await request.json());
    if (!input.success)
      return Response.json(
        {
          error: {
            code: "VALIDATION_ERROR",
            message: "Invalid collection.",
            fields: input.error.flatten().fieldErrors,
          },
        },
        { status: 400 },
      );
    return Response.json(
      {
        data: await collectInvoice(
          context,
          (await params).invoiceId,
          input.data,
        ),
      },
      { status: 201 },
    );
  } catch (error) {
    return errorResponse(error);
  }
}
