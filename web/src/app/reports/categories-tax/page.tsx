import Link from "next/link";
import { redirect } from "next/navigation";
import { getCategoryTaxReport } from "@/modules/reports/category-tax-report.service";
import { categoryTaxReportQuerySchema } from "@/modules/reports/category-tax-report.schemas";
import { requireAuth } from "@/shared/auth/request-auth";
import { BackLink } from "@/shared/ui/navigation";

function currentMonthRange() {
  const now = new Date();
  const year = now.getUTCFullYear();
  const month = String(now.getUTCMonth() + 1).padStart(2, "0");
  const lastDay = new Date(Date.UTC(year, now.getUTCMonth() + 1, 0))
    .toISOString()
    .slice(0, 10);
  return { from: `${year}-${month}-01`, to: lastDay };
}

function money(amountMinor: number, currency: string) {
  return new Intl.NumberFormat("es-UY", { style: "currency", currency }).format(
    amountMinor / 100,
  );
}

export default async function CategoryTaxReportPage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string; to?: string; groupBy?: string }>;
}) {
  let context;
  try {
    context = await requireAuth();
  } catch {
    redirect("/login");
  }
  const fallback = currentMonthRange();
  const supplied = await searchParams;
  const parsed = categoryTaxReportQuerySchema.safeParse({
    from: supplied.from ?? fallback.from,
    to: supplied.to ?? fallback.to,
    groupBy: supplied.groupBy ?? "category",
  });
  const range = parsed.success
    ? parsed.data
    : { ...fallback, groupBy: "category" as const };
  const report = await getCategoryTaxReport(
    context.membership.householdId,
    range,
  );

  return (
    <main className="flex flex-1 justify-center bg-zinc-50 p-6">
      <section className="w-full max-w-6xl rounded-2xl bg-white p-8 shadow-sm ring-1 ring-zinc-950/5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-sm font-semibold text-emerald-700">
              Finanzas Familiares
            </p>
            <h1 className="mt-2 text-2xl font-semibold">
              Categorías, facturación e IVA
            </h1>
          </div>
          <BackLink href="/settings">Volver a configuración</BackLink>
        </div>
        <p className="mt-2 text-zinc-600">
          Los gastos por categoría incluyen únicamente egresos pagados con
          categoría. Pagos de deuda y liquidaciones de IVA se muestran abajo,
          fuera de esas categorías. UYU y USD nunca se combinan.
        </p>
        {!parsed.success && (
          <p className="mt-3 rounded bg-amber-50 p-3 text-sm text-amber-900">
            El rango o agrupación solicitado no es válido; se muestra el mes
            actual por categoría.
          </p>
        )}
        <form className="mt-5 flex flex-wrap items-end gap-3 rounded-xl border p-4">
          <label className="grid gap-1 text-sm">
            Desde
            <input
              name="from"
              type="date"
              defaultValue={range.from}
              required
              className="rounded border p-2"
            />
          </label>
          <label className="grid gap-1 text-sm">
            Hasta
            <input
              name="to"
              type="date"
              defaultValue={range.to}
              required
              className="rounded border p-2"
            />
          </label>
          <label className="grid gap-1 text-sm">
            Agrupar gastos por
            <select
              name="groupBy"
              defaultValue={range.groupBy}
              className="rounded border p-2"
            >
              <option value="category">Categoría</option>
              <option value="month">Mes</option>
              <option value="year">Año</option>
            </select>
          </label>
          <button className="rounded bg-emerald-700 px-4 py-2 text-white">
            Consultar
          </button>
        </form>

        <section className="mt-8">
          <h2 className="text-xl font-semibold">Gastos pagados</h2>
          <div className="mt-3 grid gap-3">
            {report.categoryRows.map((row) => (
              <article
                key={`${row.currency}-${row.key}`}
                className="rounded-xl border p-4"
              >
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <h3 className="font-semibold">
                    {row.label} · {row.currency}
                  </h3>
                  <strong>{money(row.totalMinor, row.currency)}</strong>
                </div>
                <details className="mt-3">
                  <summary className="cursor-pointer text-sm font-medium text-emerald-800">
                    Ver movimientos fuente ({row.transactions.length})
                  </summary>
                  <ul className="mt-2 divide-y rounded border">
                    {row.transactions.map((transaction) => (
                      <li
                        key={transaction.id}
                        className="flex items-center justify-between gap-3 p-3 text-sm"
                      >
                        <span>
                          <Link
                            className="text-emerald-800 underline"
                            href={transaction.href}
                          >
                            {transaction.description}
                          </Link>
                          <small className="block text-zinc-500">
                            {transaction.date}
                          </small>
                        </span>
                        <strong>
                          {money(transaction.amountMinor, transaction.currency)}
                        </strong>
                      </li>
                    ))}
                  </ul>
                </details>
              </article>
            ))}
            {!report.categoryRows.length && (
              <p className="rounded-xl border p-4 text-zinc-600">
                No hay egresos pagados con categoría en el rango.
              </p>
            )}
          </div>
        </section>

        <section className="mt-8">
          <h2 className="text-xl font-semibold">Facturación e IVA</h2>
          <p className="mt-1 text-sm text-zinc-600">
            Facturado usa la fecha de servicio y omite facturas canceladas.
            Cobranzas, reservas y liquidaciones usan su fecha de pago.
          </p>
          <div className="mt-3 grid gap-3 md:grid-cols-2">
            {(["UYU", "USD"] as const).map((currency) => {
              const totals = report.taxTotalsByCurrency[currency];
              return (
                <dl key={currency} className="rounded-xl border p-4 text-sm">
                  <dt className="font-semibold">{currency}</dt>
                  <dd className="mt-2">
                    Facturado bruto:{" "}
                    {money(totals.invoicedGrossMinor, currency)}
                  </dd>
                  <dd>
                    Facturado neto: {money(totals.invoicedNetMinor, currency)}
                  </dd>
                  <dd>
                    IVA facturado: {money(totals.invoicedIvaMinor, currency)}
                  </dd>
                  <dd>
                    Cobrado: {money(totals.collectedGrossMinor, currency)}
                  </dd>
                  <dd>
                    IVA reservado: {money(totals.reservedIvaMinor, currency)}
                  </dd>
                  <dd>
                    IVA liquidado: {money(totals.settledIvaMinor, currency)}
                  </dd>
                </dl>
              );
            })}
          </div>
          <details className="mt-4">
            <summary className="cursor-pointer text-sm font-medium text-emerald-800">
              Ver fuentes de facturación e IVA
            </summary>
            <ul className="mt-2 divide-y rounded border text-sm">
              {report.taxSources.map((source) => (
                <li
                  key={source.kind + "-" + source.id}
                  className="flex items-center justify-between gap-3 p-3"
                >
                  <span>
                    <Link
                      className="text-emerald-800 underline"
                      href={source.href}
                    >
                      {source.kind === "invoice"
                        ? "Factura"
                        : source.kind === "collection"
                          ? "Cobranza"
                          : source.kind === "reserve"
                            ? "Reserva de IVA"
                            : "Liquidación de IVA"}
                    </Link>
                    <small className="block text-zinc-500">
                      {source.date} · {source.currency}
                    </small>
                  </span>
                  <strong>{money(source.amountMinor, source.currency)}</strong>
                </li>
              ))}
              {!report.taxSources.length && (
                <li className="p-3 text-zinc-500">
                  No hay fuentes de facturación o IVA en el rango.
                </li>
              )}
            </ul>
          </details>
        </section>
      </section>
    </main>
  );
}
