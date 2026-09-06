type Rate = {
  id: string;
  rate: string;
  effectiveDate: string;
  source: string;
  kind: "confirmed" | "planning";
  movement: "buy_usd" | "sell_usd" | "reference";
};

type Exposure = {
  uyuEquivalentAmountMinor: number;
  selectedRate: {
    rate: string;
    effectiveDate: string;
    source: string;
    kind: "confirmed" | "planning";
    movement: "buy_usd" | "sell_usd" | "reference";
  } | null;
} | null;

function money(amount: number) {
  return new Intl.NumberFormat("es-UY", {
    style: "currency",
    currency: "UYU",
  }).format(amount / 100);
}

export function DebtExposure({
  debtId,
  currency,
  rates,
  selectedRateId,
  exposure,
}: {
  debtId: string;
  currency: string;
  rates: Rate[];
  selectedRateId?: string;
  exposure: Exposure;
}) {
  if (currency === "UYU")
    return (
      <section className="mt-6 rounded border border-emerald-200 bg-emerald-50 p-4">
        <h2 className="font-semibold">Equivalente en UYU</h2>
        <p className="mt-1 text-sm text-zinc-700">
          Esta deuda ya está expresada en UYU; no se aplicó cotización.
        </p>
        <strong className="mt-2 block text-lg">
          {exposure && money(exposure.uyuEquivalentAmountMinor)}
        </strong>
      </section>
    );
  return (
    <section className="mt-6 rounded border border-emerald-200 bg-emerald-50 p-4">
      <h2 className="font-semibold">
        Equivalente en UYU con cotización explícita
      </h2>
      <p className="mt-1 text-sm text-zinc-700">
        El saldo en USD sigue siendo el autoritativo. Selecciona una cotización
        para comprar USD (entregas UYU y recibes USD) del hogar para ver esta
        equivalencia.
      </p>
      <form action={`/debts/${debtId}`} className="mt-3 flex flex-wrap gap-2">
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
      {!rates.length && (
        <p className="mt-3 text-sm text-zinc-700">
          Aún no hay cotizaciones de compra de USD (UYU → USD) disponibles para
          este hogar.
        </p>
      )}
      {exposure && exposure.selectedRate && (
        <div className="mt-4 border-t border-emerald-200 pt-3">
          <strong className="text-lg">
            {money(exposure.uyuEquivalentAmountMinor)}
          </strong>
          <p className="mt-1 text-sm text-zinc-700">
            Compra USD (UYU → USD): 1 USD = {exposure.selectedRate.rate} UYU ·{" "}
            {exposure.selectedRate.effectiveDate} ·{" "}
            {exposure.selectedRate.source} ·{" "}
            {exposure.selectedRate.kind === "confirmed"
              ? "Confirmada"
              : "Planificación"}
          </p>
          <p className="mt-1 text-xs text-zinc-600">
            Cálculo redondeado al peso uruguayo menor más cercano, con mitades
            hacia arriba.
          </p>
        </div>
      )}
    </section>
  );
}
