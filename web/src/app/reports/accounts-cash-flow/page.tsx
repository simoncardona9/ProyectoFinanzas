import Link from "next/link";
import { redirect } from "next/navigation";
import { getAccountCashFlowReport } from "@/modules/reports/account-cash-flow.service";
import { accountCashFlowReportQuerySchema } from "@/modules/reports/account-cash-flow.schemas";
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

export default async function AccountCashFlowReportPage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string; to?: string }>;
}) {
  let context;
  try {
    context = await requireAuth();
  } catch {
    redirect("/login");
  }
  const fallback = currentMonthRange();
  const supplied = await searchParams;
  const parsed = accountCashFlowReportQuerySchema.safeParse({
    from: supplied.from ?? fallback.from,
    to: supplied.to ?? fallback.to,
  });
  const range = parsed.success ? parsed.data : fallback;
  const report = await getAccountCashFlowReport(
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
              Cuentas y flujo de efectivo
            </h1>
          </div>
          <BackLink href="/settings">Volver a configuración</BackLink>
        </div>
        <p className="mt-2 text-zinc-600">
          Solo movimientos pagados. UYU y USD se informan por separado; los
          pagos de deuda cuentan como egresos de efectivo.
        </p>
        {!parsed.success && (
          <p className="mt-3 rounded bg-amber-50 p-3 text-sm text-amber-900">
            El rango solicitado no es válido; se muestra el mes actual.
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
          <button className="rounded bg-emerald-700 px-4 py-2 text-white">
            Consultar
          </button>
        </form>

        <section className="mt-8">
          <h2 className="text-xl font-semibold">Resumen de flujo pagado</h2>
          <div className="mt-3 grid gap-3 md:grid-cols-2">
            {(["UYU", "USD"] as const).map((currency) => {
              const totals = report.totalsByCurrency[currency];
              return (
                <dl key={currency} className="rounded-xl border p-4">
                  <dt className="font-semibold">{currency}</dt>
                  <dd className="mt-2 text-sm">
                    Saldo inicial: {money(totals.openingMinor, currency)}
                  </dd>
                  {totals.openingEntriesMinor !== 0 && (
                    <dd className="text-sm">
                      Aperturas dentro del rango:{" "}
                      {money(totals.openingEntriesMinor, currency)}
                    </dd>
                  )}
                  <dd className="text-sm">
                    Ingresos pagados: {money(totals.paidIncomeMinor, currency)}
                  </dd>
                  <dd className="text-sm">
                    Egresos pagados: {money(totals.paidExpenseMinor, currency)}
                  </dd>
                  <dd className="mt-2 text-sm font-semibold">
                    Saldo al cierre: {money(totals.closingMinor, currency)}
                  </dd>
                </dl>
              );
            })}
          </div>
        </section>

        <section className="mt-8">
          <h2 className="text-xl font-semibold">Por cuenta</h2>
          <div className="mt-3 grid gap-4">
            {report.accounts.map((account) => (
              <article key={account.id} className="rounded-xl border p-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h3 className="font-semibold">{account.name}</h3>
                    <p className="text-sm text-zinc-600">
                      {account.type} · {account.currency} ·{" "}
                      {account.active ? "activa" : "archivada"}
                    </p>
                  </div>
                  <strong>
                    {money(account.closingMinor, account.currency)}
                  </strong>
                </div>
                <dl className="mt-4 grid gap-2 text-sm sm:grid-cols-2 lg:grid-cols-5">
                  <div>
                    <dt className="text-zinc-500">Saldo inicial</dt>
                    <dd>{money(account.openingMinor, account.currency)}</dd>
                  </div>
                  <div>
                    <dt className="text-zinc-500">Apertura en rango</dt>
                    <dd>
                      {money(account.openingEntryMinor, account.currency)}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-zinc-500">Ingresos pagados</dt>
                    <dd>{money(account.paidIncomeMinor, account.currency)}</dd>
                  </div>
                  <div>
                    <dt className="text-zinc-500">Egresos pagados</dt>
                    <dd>{money(account.paidExpenseMinor, account.currency)}</dd>
                  </div>
                  <div>
                    <dt className="text-zinc-500">Movimiento neto</dt>
                    <dd>
                      {money(account.paidMovementMinor, account.currency)}
                    </dd>
                  </div>
                </dl>
                <details className="mt-4">
                  <summary className="cursor-pointer text-sm font-medium text-emerald-800">
                    Ver movimientos fuente ({account.transactions.length})
                  </summary>
                  <ul className="mt-3 divide-y rounded border">
                    {account.transactions.map((transaction) => (
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
                            {transaction.date} · {transaction.type}
                          </small>
                        </span>
                        <strong>
                          {transaction.signedAmountMinor < 0 ? "−" : "+"}
                          {money(
                            Math.abs(transaction.signedAmountMinor),
                            account.currency,
                          )}
                        </strong>
                      </li>
                    ))}
                    {!account.transactions.length && (
                      <li className="p-3 text-sm text-zinc-500">
                        No hay movimientos pagados en el rango.
                      </li>
                    )}
                  </ul>
                </details>
              </article>
            ))}
            {!report.accounts.length && (
              <p className="rounded-xl border p-4 text-zinc-600">
                No hay cuentas abiertas antes del final del rango seleccionado.
              </p>
            )}
          </div>
        </section>
      </section>
    </main>
  );
}
