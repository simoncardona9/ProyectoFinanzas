"use client";

import {
  type FormEvent,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

type Market = { id: string; name: string };
type Product = { id: string; name: string };
type Observation = {
  id: string;
  productId: string;
  productName: string;
  marketName: string;
  amountMinor: number;
  currency: "UYU" | "USD";
  observedDate: string;
};
type Plan = {
  id: string;
  periodStart: string;
  name: string;
  currency: "UYU" | "USD";
  status: "draft" | "active" | "cancelled";
  preferredMarketId: string | null;
  preferredMarketName: string | null;
};
type PlanDetail = {
  plan: Plan & { period: string };
  items: Array<{
    id: string;
    productId: string | null;
    productName: string | null;
    description: string | null;
    quantity: number | null;
    unit: string | null;
    plannedUnitPriceMinor: number;
    suggestedPriceObservationId: string | null;
    estimatedTotalMinor: number;
    actualTotalMinor: number;
  }>;
  estimatedTotalMinor: number;
  actualTotalMinor: number;
  differenceMinor: number;
  purchases: Array<{ id: string; transactionId: string; date: string; description: string; amountMinor: number; currency: string }>;
  receiptLines: Array<{ groceryPurchaseId: string; groceryPlanItemId: string | null; description: string; quantity: number | undefined; unit: string | null; unitPriceMinor: number | null; totalMinor: number }>;
};
type PaidExpense = { id: string; date: string; description: string; amountMinor: number; currency: "UYU" | "USD"; type: string };

async function api<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, {
    ...init,
    headers: { "Content-Type": "application/json", ...init?.headers },
  });
  const body = await response.json();
  if (!response.ok)
    throw new Error(
      body.error?.message ?? "No se pudo completar la operación.",
    );
  return body.data;
}

function money(amountMinor: number, currency: string) {
  return new Intl.NumberFormat("es-UY", { style: "currency", currency }).format(
    amountMinor / 100,
  );
}

function parseMoney(value: FormDataEntryValue | null) {
  const normalized = String(value ?? "")
    .trim()
    .replace(",", ".");
  if (!/^\d+(?:\.\d{1,2})?$/.test(normalized)) return undefined;
  return Math.round(Number(normalized) * 100);
}

export function GroceryPlanManager({ canEdit }: { canEdit: boolean }) {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [markets, setMarkets] = useState<Market[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [observations, setObservations] = useState<Observation[]>([]);
  const [selectedId, setSelectedId] = useState<string>();
  const [selectedProductId, setSelectedProductId] = useState("");
  const [detail, setDetail] = useState<PlanDetail>();
  const [paidExpenses, setPaidExpenses] = useState<PaidExpense[]>([]);
  const [message, setMessage] = useState("");
  const load = useCallback(async () => {
    try {
      const [loadedPlans, loadedMarkets, loadedProducts, loadedObservations] =
        await Promise.all([
          api<Plan[]>("/api/v1/grocery-plans"),
          api<Market[]>("/api/v1/groceries/markets"),
          api<Product[]>("/api/v1/groceries/products"),
          api<Observation[]>("/api/v1/groceries/price-observations"),
        ]);
      setPlans(loadedPlans);
      setMarkets(loadedMarkets);
      setProducts(loadedProducts);
      setObservations(loadedObservations);
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "No se pudieron cargar los planes.",
      );
    }
  }, []);
  const loadDetail = useCallback(async (id: string) => {
    try {
      setSelectedId(id);
      setDetail(await api<PlanDetail>(`/api/v1/grocery-plans/${id}`));
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "No se pudo cargar el plan.",
      );
    }
  }, []);
  useEffect(() => {
    const timer = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(timer);
  }, [load]);
  async function selectPlan(id: string) {
    setSelectedId(id);
    await loadDetail(id);
  }
  async function addPurchase(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedId || !detail) return;
    const form = new FormData(event.currentTarget);
    const totalMinor = parseMoney(form.get("receiptTotal"));
    const receiptDescription = String(form.get("receiptDescription") || "").trim();
    const planItemId = String(form.get("groceryPlanItemId") || "");
    try {
      await api(`/api/v1/grocery-plans/${selectedId}/purchases`, {
        method: "POST",
        body: JSON.stringify({
          transactionId: form.get("transactionId"),
          receiptLines: receiptDescription
            ? [{
                groceryPlanItemId: planItemId || undefined,
                description: receiptDescription,
                totalMinor,
              }]
            : undefined,
        }),
      });
      event.currentTarget.reset();
      setMessage("Compra conciliada. El movimiento pagado existente sigue siendo la única fuente del saldo.");
      await loadDetail(selectedId);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "No se pudo conciliar la compra.");
    }
  }
  const suggestions = useMemo(
    () =>
      detail
        ? observations.filter(
            (item) =>
              item.productId === selectedProductId &&
              item.currency === detail.plan.currency,
          )
        : [],
    [detail, observations, selectedProductId],
  );
  async function createPlan(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    try {
      const plan = await api<Plan>("/api/v1/grocery-plans", {
        method: "POST",
        body: JSON.stringify({
          period: form.get("period"),
          name: form.get("name"),
          currency: form.get("currency"),
          preferredMarketId: form.get("preferredMarketId") || undefined,
        }),
      });
      event.currentTarget.reset();
      setSelectedProductId("");
      setMessage(
        "Plan guardado. Sigue siendo una estimación: no modificó saldos ni transacciones.",
      );
      await load();
      await selectPlan(plan.id);
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "No se pudo guardar el plan.",
      );
    }
  }
  async function addItem(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedId || !detail) return;
    const form = new FormData(event.currentTarget);
    const suggestedPriceObservationId = String(
      form.get("suggestedPriceObservationId") || "",
    );
    const manualUnitPriceMinor = parseMoney(form.get("manualPrice"));
    if (!suggestedPriceObservationId && manualUnitPriceMinor === undefined) {
      setMessage(
        "Elige un precio sugerido o ingresa un precio manual positivo.",
      );
      return;
    }
    try {
      await api(`/api/v1/grocery-plans/${selectedId}/items`, {
        method: "POST",
        body: JSON.stringify({
          productId: form.get("productId") || undefined,
          description: form.get("description") || undefined,
          quantity: form.get("quantity") || undefined,
          unit: form.get("unit") || undefined,
          manualUnitPriceMinor: suggestedPriceObservationId
            ? undefined
            : manualUnitPriceMinor,
          suggestedPriceObservationId: suggestedPriceObservationId || undefined,
        }),
      });
      event.currentTarget.reset();
      setSelectedProductId("");
      setMessage(
        "Artículo estimado guardado. No se creó ningún movimiento de dinero.",
      );
      await loadDetail(selectedId);
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "No se pudo guardar el artículo.",
      );
    }
  }
  async function setStatus(status: "draft" | "active" | "cancelled") {
    if (!selectedId) return;
    try {
      await api(`/api/v1/grocery-plans/${selectedId}`, {
        method: "PATCH",
        body: JSON.stringify({ status }),
      });
      await load();
      await loadDetail(selectedId);
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "No se pudo actualizar el plan.",
      );
    }
  }
  return (
    <section className="mt-10 border-t pt-8">
      <h2 className="text-xl font-semibold">Planes de compra</h2>
      <p className="mt-1 text-sm text-zinc-600">
        Cada plan usa una sola moneda. Los precios elegidos se copian como
        estimaciones y nunca modifican las cuentas.
      </p>
      {message && (
        <p className="mt-4 rounded bg-emerald-50 p-3 text-sm text-emerald-800">
          {message}
        </p>
      )}
      {canEdit && (
        <form
          onSubmit={createPlan}
          className="mt-4 grid gap-2 rounded-xl border p-5 md:grid-cols-2"
        >
          <h3 className="font-semibold md:col-span-2">Nuevo plan mensual</h3>
          <input
            name="period"
            type="month"
            required
            defaultValue={new Date().toISOString().slice(0, 7)}
            className="rounded border p-2"
          />
          <input
            name="name"
            required
            maxLength={160}
            placeholder="Ej. Compra de octubre"
            className="rounded border p-2"
          />
          <select
            name="currency"
            defaultValue="UYU"
            className="rounded border p-2"
          >
            <option value="UYU">UYU</option>
            <option value="USD">USD</option>
          </select>
          <select name="preferredMarketId" className="rounded border p-2">
            <option value="">Mercado sugerido (opcional)</option>
            {markets.map((market) => (
              <option key={market.id} value={market.id}>
                {market.name}
              </option>
            ))}
          </select>
          <button className="rounded bg-emerald-700 p-2 text-white md:col-span-2">
            Guardar plan
          </button>
        </form>
      )}
      <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)]">
        <ul className="divide-y rounded-xl border">
          {plans.map((plan) => (
            <li key={plan.id}>
              <button
                type="button"
                onClick={() => void selectPlan(plan.id)}
                className="w-full p-4 text-left hover:bg-zinc-50"
              >
                <b>{plan.name}</b>
                <span className="block text-sm text-zinc-600">
                  {plan.periodStart.slice(0, 7)} · {plan.currency} ·{" "}
                  {plan.status}
                  {plan.preferredMarketName
                    ? ` · ${plan.preferredMarketName}`
                    : ""}
                </span>
              </button>
            </li>
          ))}
          {!plans.length && (
            <li className="p-4 text-zinc-500">Aún no hay planes de compra.</li>
          )}
        </ul>
        {detail && (
          <div className="rounded-xl border p-5">
            <div className="flex flex-wrap justify-between gap-3">
              <div>
                <h3 className="font-semibold">{detail.plan.name}</h3>
                <p className="text-sm text-zinc-600">
                  Estimado total:{" "}
                  <b>
                    {money(detail.estimatedTotalMinor, detail.plan.currency)}
                  </b>
                </p>
                <p className="text-sm text-zinc-600">
                  Real pagado: <b>{money(detail.actualTotalMinor, detail.plan.currency)}</b> · diferencia: <b>{money(detail.differenceMinor, detail.plan.currency)}</b>
                </p>
              </div>
              {canEdit && detail.plan.status !== "cancelled" && (
                <button
                  type="button"
                  onClick={() =>
                    void setStatus(
                      detail.plan.status === "draft" ? "active" : "draft",
                    )
                  }
                  className="rounded border px-3 py-2 text-sm"
                >
                  {detail.plan.status === "draft"
                    ? "Activar plan"
                    : "Pasar a borrador"}
                </button>
              )}
            </div>
            <ul className="mt-4 divide-y">
              {detail.items.map((item) => (
                <li key={item.id} className="flex justify-between gap-3 py-3">
                  <span>
                    {item.productName ?? item.description}
                    {item.quantity !== null
                      ? ` · ${item.quantity}${item.unit ? ` ${item.unit}` : ""}`
                      : ""}
                    <small className="block text-zinc-500">
                      {money(item.plannedUnitPriceMinor, detail.plan.currency)}{" "}
                      por unidad
                      {item.suggestedPriceObservationId
                        ? " · precio sugerido"
                        : " · precio manual"}
                    </small>
                  </span>
                  <span className="text-right">
                    <b className="block">{money(item.estimatedTotalMinor, detail.plan.currency)}</b>
                    {item.actualTotalMinor > 0 && <small className="text-zinc-500">real: {money(item.actualTotalMinor, detail.plan.currency)}</small>}
                  </span>
                </li>
              ))}
              {!detail.items.length && (
                <li className="py-3 text-zinc-500">
                  Aún no hay artículos estimados.
                </li>
              )}
            </ul>
            <div className="mt-4 border-t pt-4">
              <h4 className="font-semibold">Compras reales conciliadas</h4>
              <ul className="mt-2 divide-y text-sm">
                {detail.purchases.map((purchase) => (
                  <li key={purchase.id} className="flex justify-between py-2">
                    <span>{purchase.date} · {purchase.description}</span>
                    <b>{money(purchase.amountMinor, detail.plan.currency)}</b>
                  </li>
                ))}
                {!detail.purchases.length && <li className="py-2 text-zinc-500">Aún no hay compras vinculadas.</li>}
              </ul>
            </div>
            {canEdit && detail.plan.status !== "cancelled" && (
              <form
                onSubmit={addItem}
                className="mt-5 grid gap-2 border-t pt-5 md:grid-cols-2"
              >
                <h4 className="font-semibold md:col-span-2">
                  Agregar artículo
                </h4>
                <select
                  name="productId"
                  value={selectedProductId}
                  onChange={(event) => setSelectedProductId(event.target.value)}
                  className="rounded border p-2"
                >
                  <option value="">Producto del catálogo (opcional)</option>
                  {products.map((product) => (
                    <option key={product.id} value={product.id}>
                      {product.name}
                    </option>
                  ))}
                </select>
                <input
                  name="description"
                  maxLength={300}
                  placeholder="o descripción libre"
                  className="rounded border p-2"
                />
                <input
                  name="quantity"
                  type="number"
                  min="0.001"
                  step="0.001"
                  placeholder="Cantidad (opcional)"
                  className="rounded border p-2"
                />
                <input
                  name="unit"
                  maxLength={40}
                  placeholder="Unidad (ej. kg)"
                  className="rounded border p-2"
                />
                <select
                  name="suggestedPriceObservationId"
                  className="rounded border p-2"
                >
                  <option value="">Precio sugerido (o precio manual)</option>
                  {suggestions.map((item) => (
                    <option key={item.id} value={item.id}>
                      {money(item.amountMinor, item.currency)} ·{" "}
                      {item.marketName} · {item.observedDate}
                    </option>
                  ))}
                </select>
                <input
                  name="manualPrice"
                  inputMode="decimal"
                  placeholder="Precio manual (ej. 199,50)"
                  className="rounded border p-2"
                />
                <button className="rounded bg-emerald-700 p-2 text-white md:col-span-2">
                  Agregar estimación
                </button>
              </form>
            )}
            {canEdit && detail.plan.status !== "cancelled" && (
              <form onSubmit={addPurchase} className="mt-5 grid gap-2 border-t pt-5 md:grid-cols-2">
                <h4 className="font-semibold md:col-span-2">Conciliar compra pagada</h4>
                <select name="transactionId" required className="rounded border p-2" onFocus={() => void api<PaidExpense[]>(`/api/v1/transactions?type=expense&currency=${detail.plan.currency}&limit=100`).then(setPaidExpenses).catch((error: unknown) => setMessage(error instanceof Error ? error.message : "No se pudieron cargar gastos."))}>
                  <option value="">Elegir gasto pagado ({detail.plan.currency})</option>
                  {paidExpenses.map((expense) => <option key={expense.id} value={expense.id}>{expense.date} · {expense.description} · {money(expense.amountMinor, expense.currency)}</option>)}
                </select>
                <select name="groceryPlanItemId" className="rounded border p-2"><option value="">Artículo del plan (opcional)</option>{detail.items.map((item) => <option key={item.id} value={item.id}>{item.productName ?? item.description}</option>)}</select>
                <input name="receiptDescription" maxLength={300} placeholder="Descripción de línea de ticket (opcional)" className="rounded border p-2" />
                <input name="receiptTotal" inputMode="decimal" placeholder="Total de ticket (debe igualar gasto)" className="rounded border p-2" />
                <p className="text-xs text-zinc-500 md:col-span-2">Sin ticket se vincula solo el gasto. Con una línea, su total debe ser exactamente el gasto elegido; las líneas múltiples quedan como seguimiento.</p>
                <button className="rounded bg-emerald-700 p-2 text-white md:col-span-2">Vincular compra real</button>
              </form>
            )}
          </div>
        )}
      </div>
    </section>
  );
}
