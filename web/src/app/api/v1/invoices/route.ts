import { invoiceRepository } from "@/modules/invoices/invoice.repository";
import {
  createInvoiceSchema,
  listInvoicesSchema,
} from "@/modules/invoices/invoice.schemas";
import { createInvoice } from "@/modules/invoices/invoice.service";
import { requireRole } from "@/shared/auth/authorization";
import { requireAuth } from "@/shared/auth/request-auth";
import { errorResponse } from "@/shared/errors/api-error";

function validation(fields: Record<string, string[] | undefined>) {
  return Response.json(
    {
      error: { code: "VALIDATION_ERROR", message: "Invalid invoice.", fields },
    },
    { status: 400 },
  );
}

export async function GET(request: Request) {
  try {
    const context = await requireAuth();
    const input = listInvoicesSchema.safeParse(
      Object.fromEntries(new URL(request.url).searchParams),
    );
    if (!input.success) return validation(input.error.flatten().fieldErrors);
    return Response.json({
      data: await invoiceRepository.list(
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
    const input = createInvoiceSchema.safeParse(await request.json());
    if (!input.success) return validation(input.error.flatten().fieldErrors);
    return Response.json(
      { data: await createInvoice(context, input.data) },
      { status: 201 },
    );
  } catch (error) {
    return errorResponse(error);
  }
}
