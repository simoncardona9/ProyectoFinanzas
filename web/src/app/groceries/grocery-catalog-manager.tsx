"use client";

import {
  type FormEvent,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

type CatalogItem = { id: string; name: string; normalizedName: string };
type Observation = {
  id: string;
  marketName: string;
  productName: string;
  amountMinor: number;
  currency: "UYU" | "USD";
  observedDate: string;
  note: string | null;
};

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

function duplicates(items: CatalogItem[]) {
  const groups = new Map<string, string[]>();
  for (const item of items)
    groups.set(item.normalizedName, [
      ...(groups.get(item.normalizedName) ?? []),
      item.name,
    ]);
  return new Map([...groups].filter(([, names]) => names.length > 1));
}

export function GroceryCatalogManager({ canEdit }: { canEdit: boolean }) {
  const [markets, setMarkets] = useState<CatalogItem[]>([]);
  const [products, setProducts] = useState<CatalogItem[]>([]);
  const [observations, setObservations] = useState<Observation[]>([]);
  const [message, setMessage] = useState("");
  const [key, setKey] = useState(0);
  const load = useCallback(async () => {
    try {
      const [loadedMarkets, loadedProducts, loadedObservations] =
        await Promise.all([
          api<CatalogItem[]>("/api/v1/groceries/markets"),
          api<CatalogItem[]>("/api/v1/groceries/products"),
          api<Observation[]>("/api/v1/groceries/price-observations"),
        ]);
      setMarkets(loadedMarkets);
      setProducts(loadedProducts);
      setObservations(loadedObservations);
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "No se pudo cargar el catálogo.",
      );
    }
  }, []);
  useEffect(() => {
    const task = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(task);
  }, [load]);
  const marketDuplicates = useMemo(() => duplicates(markets), [markets]);
  const productDuplicates = useMemo(() => duplicates(products), [products]);
  const submitNamed = async (
    event: FormEvent<HTMLFormElement>,
    endpoint: string,
    label: string,
  ) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    try {
      await api(endpoint, {
        method: "POST",
        body: JSON.stringify({ name: form.get("name") }),
      });
      event.currentTarget.reset();
      setMessage(`${label} guardado como dato privado del hogar.`);
      await load();
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "No se pudo guardar.",
      );
    }
  };
  const submitObservation = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const amount = String(form.get("amount") ?? "")
      .trim()
      .replace(",", ".");
    if (!/^\d+(?:\.\d{1,2})?$/.test(amount)) {
      setMessage("Ingresa un precio positivo con hasta dos decimales.");
      return;
    }
    const amountMinor = Math.round(Number(amount) * 100);
    try {
      await api("/api/v1/groceries/price-observations", {
        method: "POST",
        body: JSON.stringify({
          marketId: form.get("marketId"),
          productId: form.get("productId"),
          amountMinor,
          currency: form.get("currency"),
          observedDate: form.get("observedDate"),
          note: form.get("note") || undefined,
        }),
      });
      event.currentTarget.reset();
      setKey((current) => current + 1);
      setMessage(
        "Precio observado guardado. No se modificaron saldos ni transacciones.",
      );
      await load();
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "No se pudo guardar el precio.",
      );
    }
  };
  return (
    <div className="mt-8 grid gap-8">
      {message && (
        <p className="rounded bg-emerald-50 p-3 text-sm text-emerald-800">
          {message}
        </p>
      )}
      {canEdit && (
        <section className="grid gap-4 md:grid-cols-2">
          <form
            onSubmit={(event) =>
              void submitNamed(event, "/api/v1/groceries/markets", "Mercado")
            }
            className="grid gap-2 rounded-xl border p-5"
          >
            <h2 className="font-semibold">Nuevo mercado</h2>
            <input
              name="name"
              required
              maxLength={160}
              placeholder="Ej. Feria del barrio"
              className="rounded border p-2"
            />
            <button className="rounded bg-emerald-700 p-2 text-white">
              Guardar mercado
            </button>
          </form>
          <form
            onSubmit={(event) =>
              void submitNamed(event, "/api/v1/groceries/products", "Producto")
            }
            className="grid gap-2 rounded-xl border p-5"
          >
            <h2 className="font-semibold">Nuevo producto</h2>
            <input
              name="name"
              required
              maxLength={160}
              placeholder="Ej. Yerba 1 kg"
              className="rounded border p-2"
            />
            <button className="rounded bg-emerald-700 p-2 text-white">
              Guardar producto
            </button>
          </form>
          <form
            key={key}
            onSubmit={submitObservation}
            className="grid gap-2 rounded-xl border p-5 md:col-span-2 md:grid-cols-2"
          >
            <h2 className="font-semibold md:col-span-2">
              Registrar precio observado
            </h2>
            <select name="marketId" required className="rounded border p-2">
              <option value="">Selecciona un mercado</option>
              {markets.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name}
                </option>
              ))}
            </select>
            <select name="productId" required className="rounded border p-2">
              <option value="">Selecciona un producto</option>
              {products.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name}
                </option>
              ))}
            </select>
            <input
              name="amount"
              type="text"
              inputMode="decimal"
              required
              placeholder="Precio (ej. 199,50)"
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
            <input
              name="observedDate"
              type="date"
              required
              className="rounded border p-2"
            />
            <input
              name="note"
              maxLength={500}
              placeholder="Nota opcional"
              className="rounded border p-2"
            />
            <button
              disabled={!markets.length || !products.length}
              className="rounded bg-emerald-700 p-2 text-white disabled:bg-zinc-300 md:col-span-2"
            >
              Guardar precio observado
            </button>
          </form>
        </section>
      )}
      <section className="grid gap-4 md:grid-cols-2">
        <CatalogList
          title="Mercados privados"
          items={markets}
          duplicateNames={marketDuplicates}
        />
        <CatalogList
          title="Productos privados"
          items={products}
          duplicateNames={productDuplicates}
        />
      </section>
      <section>
        <h2 className="text-xl font-semibold">Precios observados</h2>
        <ul className="mt-3 divide-y rounded-xl border">
          {observations.map((item) => (
            <li
              key={item.id}
              className="flex flex-wrap justify-between gap-3 p-4"
            >
              <span>
                <b>{item.productName}</b> · {item.marketName}
                <small className="block text-zinc-500">
                  {item.observedDate}
                  {item.note ? ` · ${item.note}` : ""}
                </small>
              </span>
              <b>{money(item.amountMinor, item.currency)}</b>
            </li>
          ))}
          {!observations.length && (
            <li className="p-4 text-zinc-500">
              Aún no hay precios observados.
            </li>
          )}
        </ul>
      </section>
    </div>
  );
}

function CatalogList({
  title,
  items,
  duplicateNames,
}: {
  title: string;
  items: CatalogItem[];
  duplicateNames: Map<string, string[]>;
}) {
  return (
    <section>
      <h2 className="text-xl font-semibold">{title}</h2>
      <ul className="mt-3 divide-y rounded-xl border">
        {items.map((item) => (
          <li key={item.id} className="p-4">
            {item.name}
            {duplicateNames.has(item.normalizedName) && (
              <small className="mt-1 block text-amber-700">
                Posible duplicado: coincide con{" "}
                {duplicateNames
                  .get(item.normalizedName)
                  ?.filter((name) => name !== item.name)
                  .join(", ")}
                .
              </small>
            )}
          </li>
        ))}
        {!items.length && (
          <li className="p-4 text-zinc-500">Sin registros todavía.</li>
        )}
      </ul>
    </section>
  );
}
