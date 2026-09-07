import { redirect } from "next/navigation";
import { requireAuth } from "@/shared/auth/request-auth";
import { BackLink } from "@/shared/ui/navigation";
import { InvoiceManager } from "./invoice-manager";

export default async function InvoicesPage() {
  let context;
  try {
    context = await requireAuth();
  } catch {
    redirect("/login");
  }
  return (
    <main className="flex flex-1 justify-center bg-zinc-50 p-6">
      <section className="w-full max-w-5xl rounded-2xl bg-white p-8 shadow-sm ring-1 ring-zinc-950/5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-sm font-semibold text-emerald-700">
              Finanzas Familiares
            </p>
            <h1 className="mt-2 text-2xl font-semibold">Facturas e IVA</h1>
          </div>
          <BackLink href="/settings">Volver a configuración</BackLink>
        </div>
        <p className="mt-2 text-zinc-600">
          Registra el importe bruto y la tasa de IVA. En este primer corte, la
          factura no crea un ingreso, una reserva ni modifica el panel.
        </p>
        <InvoiceManager
          canEdit={["owner", "editor"].includes(context.membership.role)}
        />
      </section>
    </main>
  );
}
