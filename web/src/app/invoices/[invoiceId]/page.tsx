import { notFound, redirect } from "next/navigation";
import { z } from "zod";
import { invoiceRepository } from "@/modules/invoices/invoice.repository";
import { requireAuth } from "@/shared/auth/request-auth";
import { BackLink } from "@/shared/ui/navigation";
import { InvoiceManager } from "../invoice-manager";

export default async function InvoiceDetailPage({
  params,
}: {
  params: Promise<{ invoiceId: string }>;
}) {
  let context;
  try {
    context = await requireAuth();
  } catch {
    redirect("/login");
  }
  const { invoiceId } = await params;
  if (!z.uuid().safeParse(invoiceId).success) notFound();
  const detail = await invoiceRepository.findDetail(
    context.membership.householdId,
    invoiceId,
  );
  if (!detail) notFound();
  return (
    <main className="flex flex-1 justify-center bg-zinc-50 p-6">
      <section className="w-full max-w-5xl rounded-2xl bg-white p-8 shadow-sm ring-1 ring-zinc-950/5">
        <BackLink href="/invoices">Volver a facturas</BackLink>
        <h1 className="mt-4 text-2xl font-semibold">Factura e IVA</h1>
        <InvoiceManager
          canEdit={["owner", "editor"].includes(context.membership.role)}
          initialDetail={detail}
        />
      </section>
    </main>
  );
}
