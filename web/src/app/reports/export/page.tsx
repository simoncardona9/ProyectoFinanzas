import { redirect } from "next/navigation";
import { requireAuth } from "@/shared/auth/request-auth";
import { BackLink } from "@/shared/ui/navigation";

function monthRange() {
  const now = new Date();
  const year = now.getUTCFullYear();
  const month = now.getUTCMonth();
  return {
    from: `${year}-${String(month + 1).padStart(2, "0")}-01`,
    to: new Date(Date.UTC(year, month + 1, 0)).toISOString().slice(0, 10),
  };
}

export default async function ExportPage() {
  let context;
  try {
    context = await requireAuth();
  } catch {
    redirect("/login");
  }
  if (context.membership.role === "viewer") redirect("/settings");
  const range = monthRange();
  return (
    <main className="flex flex-1 justify-center bg-zinc-50 p-6">
      <section className="w-full max-w-2xl rounded-2xl bg-white p-8 shadow-sm ring-1 ring-zinc-950/5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div><p className="text-sm font-semibold text-emerald-700">Finanzas Familiares</p><h1 className="mt-2 text-2xl font-semibold">Exportar registros financieros</h1></div>
          <BackLink href="/settings">Volver a configuración</BackLink>
        </div>
        <p className="mt-3 text-zinc-600">Descarga registros fechados del hogar en CSV. La descarga se registra en auditoría y no sustituye una copia de respaldo de la base de datos.</p>
        <form action="/api/v1/reports/export" className="mt-6 flex flex-wrap items-end gap-3 rounded-xl border p-4">
          <label className="grid gap-1 text-sm">Desde<input name="from" type="date" defaultValue={range.from} required className="rounded border p-2" /></label>
          <label className="grid gap-1 text-sm">Hasta<input name="to" type="date" defaultValue={range.to} required className="rounded border p-2" /></label>
          <input name="format" type="hidden" value="csv" />
          <button className="rounded bg-emerald-700 px-4 py-2 text-white">Descargar CSV</button>
        </form>
      </section>
    </main>
  );
}
