type Report = {
  debts: Array<{
    id: string;
    creditorName: string;
    description: string;
    currency: "UYU" | "USD";
    originalAmountMinor: number;
    paidAmountMinor: number;
    remainingAmountMinor: number;
    status: string;
    uyuEquivalentAmountMinor: number | null;
  }>;
  totalsByOriginalCurrency: Record<
    "UYU" | "USD",
    {
      originalAmountMinor: number;
      paidAmountMinor: number;
      remainingAmountMinor: number;
    }
  >;
  selectedRate: {
    id: string;
    rate: string;
    effectiveDate: string;
    source: string;
    kind: "confirmed" | "planning";
    movement: "buy_usd" | "sell_usd" | "reference";
  } | null;
  uyuEquivalentExposureMinor: number | null;
};

type Rate = {
  id: string;
  rate: string;
  effectiveDate: string;
  source: string;
  kind: "confirmed" | "planning";
  movement: "buy_usd" | "sell_usd" | "reference";
};

function money(amount: number, currency: string) {
  return new Intl.NumberFormat("es-UY", { style: "currency", currency }).format(
    amount / 100,
  );
}

export function DebtReportView({
  report,
  rates,
  selectedRateId,
}: {
  report: Report;
  rates: Rate[];
  selectedRateId?: string;
}) {
  return (
    <div className="mt-8 grid gap-8">
      <section className="rounded-xl border border-emerald-200 bg-emerald-50 p-5">
        <h2 className="font-semibold">Exposición equivalente en UYU</h2>
        <p className="mt-1 text-sm text-zinc-700">
          La suma solo se muestra cuando eliges una cotización explícita para
          convertir los saldos USD. Los importes originales siguen siendo
          autoritativos.
        </p>
        <form className="mt-3 flex flex-wrap gap-2">
          <select
            name="exchangeRateId"
            defaultValue={selectedRateId ?? ""}
            className="min-w-0 flex-1 rounded border p-2"
          >
            <option value="">Seleccionar compra de USD (UYU → USD)</option>
            {rates.map((rate) => (
              <option key={rate.id} value={rate.id}>
                {rate.effectiveDate} · Compra USD (UYU → USD) · 1 USD ={" "}
                {rate.rate} UYU · {rate.source} ·{" "}
                {rate.kind === "confirmed" ? "confirmada" : "planificación"}
              </option>
            ))}
          </select>
          <button className="rounded bg-emerald-700 px-3 py-2 text-white">
            Aplicar
          </button>
        </form>
        {report.selectedRate ? (
          <div className="mt-4 border-t border-emerald-200 pt-3">
            <strong className="text-xl">
              {money(report.uyuEquivalentExposureMinor ?? 0, "UYU")}
            </strong>
            <p className="mt-1 text-sm text-zinc-700">
              Compra USD (UYU → USD): 1 USD = {report.selectedRate.rate} UYU ·{" "}
              {report.selectedRate.effectiveDate} · {report.selectedRate.source}{" "}
              ·{" "}
              {report.selectedRate.kind === "confirmed"
                ? "Confirmada"
                : "Planificación"}
            </p>
          </div>
        ) : (
          <p className="mt-3 text-sm text-zinc-700">
            Sin cotización seleccionada, UYU y USD no se combinan.
          </p>
        )}
      </section>
      <section>
        <h2 className="text-xl font-semibold">Totales en moneda original</h2>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          {(["UYU", "USD"] as const).map((currency) => {
            const totals = report.totalsByOriginalCurrency[currency];
            return (
              <dl key={currency} className="rounded-xl border p-4">
                <dt className="font-semibold">{currency}</dt>
                <dd className="mt-2 text-sm">
                  Original: {money(totals.originalAmountMinor, currency)}
                </dd>
                <dd className="text-sm">
                  Pagado: {money(totals.paidAmountMinor, currency)}
                </dd>
                <dd className="text-sm">
                  Pendiente: {money(totals.remainingAmountMinor, currency)}
                </dd>
              </dl>
            );
          })}
        </div>
      </section>
      <section>
        <h2 className="text-xl font-semibold">Deudas y pagos</h2>
        <ul className="mt-3 divide-y rounded-xl border">
          {report.debts.map((debt) => (
            <li
              key={debt.id}
              className="grid gap-2 p-4 sm:grid-cols-[1fr_auto]"
            >
              <span>
                <b>{debt.creditorName}</b> · {debt.description}
                <small className="block text-zinc-500">
                  Original {money(debt.originalAmountMinor, debt.currency)} ·
                  Pagado {money(debt.paidAmountMinor, debt.currency)} · Estado{" "}
                  {debt.status}
                </small>
              </span>
              <span className="text-right">
                <strong>
                  {money(debt.remainingAmountMinor, debt.currency)}
                </strong>
                {debt.uyuEquivalentAmountMinor !== null && (
                  <small className="block text-zinc-500">
                    Equiv. {money(debt.uyuEquivalentAmountMinor, "UYU")}
                  </small>
                )}
              </span>
            </li>
          ))}
          {!report.debts.length && (
            <li className="p-4 text-zinc-500">No hay deudas registradas.</li>
          )}
        </ul>
      </section>
    </div>
  );
}
