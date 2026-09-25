import { redirect } from "next/navigation";
import { getAuditReport } from "@/modules/reports/audit-export.service";
import { auditReportQuerySchema } from "@/modules/reports/audit-export.schemas";
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

export default async function AuditExportPage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string; to?: string; action?: string; entityType?: string; page?: string }>;
}) {
  let context;
  try {
    context = await requireAuth();
  } catch {
    redirect("/login");
  }
  if (!["owner", "accountant"].includes(context.membership.role)) redirect("/settings");
  const supplied = await searchParams;
  const range = monthRange();
  const parsed = auditReportQuerySchema.safeParse({
    from: supplied.from,
    to: supplied.to,
    action: supplied.action,
    entityType: supplied.entityType,
    page: supplied.page,
  });
  const query = parsed.success ? parsed.data : { page: 1, pageSize: 25 };
  const report = await getAuditReport(context, query);
  const exportFrom = supplied.from ?? range.from;
  const exportTo = supplied.to ?? range.to;

  return (
    <main className="flex flex-1 justify-center bg-zinc-50 p-6">
      <section className="w-full max-w-6xl rounded-2xl bg-white p-8 shadow-sm ring-1 ring-zinc-950/5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-sm font-semibold text-emerald-700">Finanzas Familiares</p>
            <h1 className="mt-2 text-2xl font-semibold">Auditoría y exportación</h1>
          </div>
          <BackLink href="/settings">Volver a configuración</BackLink>
        </div>
        <p className="mt-2 text-zinc-600">
          La exportación incluye registros financieros fechados, no lotes de importación ni archivos originales. Cada descarga queda registrada en la auditoría.
        </p>
        {!parsed.success && <p className="mt-3 rounded bg-amber-50 p-3 text-sm text-amber-900">Los filtros de auditoría no son válidos; se muestra el historial reciente.</p>}

        <section className="mt-6 rounded-xl border p-4">
          <h2 className="text-lg font-semibold">Exportar CSV</h2>
          <p className="mt-1 text-sm text-zinc-600">Incluye movimientos, obligaciones, facturas, deudas y cotizaciones por su fecha financiera dentro del rango. No sustituye una copia de respaldo de la base de datos.</p>
          <form action="/api/v1/reports/export" className="mt-3 flex flex-wrap items-end gap-3">
            <label className="grid gap-1 text-sm">Desde<input name="from" type="date" defaultValue={exportFrom} required className="rounded border p-2" /></label>
            <label className="grid gap-1 text-sm">Hasta<input name="to" type="date" defaultValue={exportTo} required className="rounded border p-2" /></label>
            <input name="format" type="hidden" value="csv" />
            <button className="rounded bg-emerald-700 px-4 py-2 text-white">Descargar CSV</button>
          </form>
        </section>

        <section className="mt-8">
          <h2 className="text-xl font-semibold">Historial de auditoría</h2>
          <form className="mt-3 flex flex-wrap items-end gap-3 rounded-xl border p-4">
            <label className="grid gap-1 text-sm">Desde<input name="from" type="date" defaultValue={supplied.from} className="rounded border p-2" /></label>
            <label className="grid gap-1 text-sm">Hasta<input name="to" type="date" defaultValue={supplied.to} className="rounded border p-2" /></label>
            <label className="grid gap-1 text-sm">Acción<input name="action" defaultValue={supplied.action} placeholder="create, export..." className="rounded border p-2" /></label>
            <label className="grid gap-1 text-sm">Tipo<input name="entityType" defaultValue={supplied.entityType} placeholder="transaction..." className="rounded border p-2" /></label>
            <button className="rounded bg-emerald-700 px-4 py-2 text-white">Filtrar</button>
          </form>
          <p className="mt-3 text-sm text-zinc-600">{report.meta.total} evento(s) encontrados.</p>
          <div className="mt-3 overflow-x-auto rounded-xl border">
            <table className="w-full text-left text-sm"><thead className="bg-zinc-50 text-zinc-700"><tr><th className="p-3">Fecha</th><th className="p-3">Actor</th><th className="p-3">Acción</th><th className="p-3">Registro</th><th className="p-3">Evidencia</th></tr></thead>
              <tbody>{report.events.map((event) => <tr key={event.id} className="border-t align-top"><td className="whitespace-nowrap p-3">{event.createdAt.toISOString()}</td><td className="p-3">{event.actorEmail ?? "Usuario eliminado"}</td><td className="p-3">{event.action}</td><td className="p-3">{event.entityType}</td><td className="max-w-md p-3 break-words">{event.details ? JSON.stringify(event.details) : "—"}</td></tr>)}
              {!report.events.length && <tr><td colSpan={5} className="p-5 text-center text-zinc-500">No hay eventos para estos filtros.</td></tr>}</tbody>
            </table>
          </div>
        </section>
      </section>
    </main>
  );
}
