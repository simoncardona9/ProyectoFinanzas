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
type Publication = {
  id: string;
  sourceType: "market" | "product" | "price";
  sourceId: string;
  createdAt: string;
};
type SharedNamedItem = CatalogItem & {
  aliases: string[];
  possibleDuplicates: Array<{ id: string; name: string }>;
  adopted: boolean;
};
type SharedPrice = {
  id: string;
  market: { id: string; name: string };
  product: { id: string; name: string };
  amountMinor: number;
  currency: "UYU" | "USD";
  observedDate: string;
  adopted: boolean;
};
type SharedCatalogSearch = {
  query: string;
  normalizedQuery: string;
  markets: SharedNamedItem[];
  products: SharedNamedItem[];
  prices: SharedPrice[];
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
  const [publications, setPublications] = useState<Publication[]>([]);
  const [sharedResults, setSharedResults] =
    useState<SharedCatalogSearch | null>(null);
  const [message, setMessage] = useState("");
  const [key, setKey] = useState(0);
  const load = useCallback(async () => {
    try {
      const [
        loadedMarkets,
        loadedProducts,
        loadedObservations,
        loadedPublications,
      ] = await Promise.all([
        api<CatalogItem[]>("/api/v1/groceries/markets"),
        api<CatalogItem[]>("/api/v1/groceries/products"),
        api<Observation[]>("/api/v1/groceries/price-observations"),
        api<Publication[]>("/api/v1/groceries/publications"),
      ]);
      setMarkets(loadedMarkets);
      setProducts(loadedProducts);
      setObservations(loadedObservations);
      setPublications(loadedPublications);
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
  const publishedSources = useMemo(
    () =>
      new Set(
        publications.map(
          (publication) => `${publication.sourceType}:${publication.sourceId}`,
        ),
      ),
    [publications],
  );
  const submitNamed = async (
    event: FormEvent<HTMLFormElement>,
    endpoint: string,
    label: string,
  ) => {
    event.preventDefault();
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    try {
      await api(endpoint, {
        method: "POST",
        body: JSON.stringify({ name: form.get("name") }),
      });
      formElement.reset();
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
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
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
      formElement.reset();
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
  const publish = async (
    sourceType: Publication["sourceType"],
    sourceId: string,
  ) => {
    const detail =
      sourceType === "price"
        ? "Se compartirán el mercado, el producto, el precio, la moneda y la fecha. La nota privada no se publicará."
        : "Se compartirá únicamente el nombre de este registro.";
    if (
      !window.confirm(
        `¿Publicar este dato en el catálogo compartido? ${detail} Esta acción no se puede deshacer en esta etapa.`,
      )
    )
      return;
    try {
      await api("/api/v1/groceries/publications", {
        method: "POST",
        body: JSON.stringify({ sourceType, sourceId }),
      });
      setMessage(
        "Dato publicado sin identidad del hogar ni información de compras o planes.",
      );
      await load();
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "No se pudo publicar el dato.",
      );
    }
  };
  const searchShared = async (query: string) => {
    const results = await api<SharedCatalogSearch>(
      `/api/v1/groceries/shared-catalog?query=${encodeURIComponent(query)}`,
    );
    setSharedResults(results);
  };
  const submitSharedSearch = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const query = String(new FormData(event.currentTarget).get("query") ?? "");
    try {
      await searchShared(query);
      setMessage("");
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "No se pudo buscar en el catálogo compartido.",
      );
    }
  };
  const adopt = async (
    sourceType: Publication["sourceType"],
    publicSourceId: string,
  ) => {
    const detail =
      sourceType === "price"
        ? "Se copiarán el mercado, el producto, el precio, la moneda y la fecha a tu catálogo privado."
        : "Se copiará el nombre a tu catálogo privado.";
    if (
      !window.confirm(
        `¿Incorporar esta sugerencia compartida? ${detail} No se crearán transacciones ni se modificarán saldos.`,
      )
    )
      return;
    try {
      await api("/api/v1/groceries/shared-catalog", {
        method: "POST",
        body: JSON.stringify({ sourceType, publicSourceId }),
      });
      setMessage(
        "Sugerencia incorporada al catálogo privado sin datos del hogar que la publicó.",
      );
      await load();
      if (sharedResults) await searchShared(sharedResults.query);
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "No se pudo incorporar la sugerencia.",
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
      <section className="rounded-xl border border-sky-200 bg-sky-50/50 p-5">
        <h2 className="text-xl font-semibold">Catálogo compartido</h2>
        <p className="mt-1 text-sm text-zinc-600">
          Busca nombres normalizados y variantes publicadas. Las coincidencias
          son sugerencias: cada sucursal o producto sigue siendo un registro
          separado hasta que decidas incorporarlo.
        </p>
        <form
          onSubmit={submitSharedSearch}
          className="mt-4 flex flex-wrap gap-2"
        >
          <input
            name="query"
            required
            minLength={2}
            maxLength={160}
            placeholder="Buscar mercado o producto"
            className="min-w-64 flex-1 rounded border bg-white p-2"
          />
          <button className="rounded bg-sky-700 px-4 py-2 text-white">
            Buscar compartidos
          </button>
        </form>
        {sharedResults && (
          <SharedResults
            results={sharedResults}
            canEdit={canEdit}
            onAdopt={adopt}
          />
        )}
      </section>
      <section className="grid gap-4 md:grid-cols-2">
        <CatalogList
          title="Mercados privados"
          items={markets}
          duplicateNames={marketDuplicates}
          sourceType="market"
          canPublish={canEdit}
          publishedSources={publishedSources}
          onPublish={publish}
        />
        <CatalogList
          title="Productos privados"
          items={products}
          duplicateNames={productDuplicates}
          sourceType="product"
          canPublish={canEdit}
          publishedSources={publishedSources}
          onPublish={publish}
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
              <span className="grid justify-items-end gap-2">
                <b>{money(item.amountMinor, item.currency)}</b>
                {publishedSources.has(`price:${item.id}`) ? (
                  <small className="text-emerald-700">Publicado</small>
                ) : (
                  canEdit && (
                    <button
                      type="button"
                      onClick={() => void publish("price", item.id)}
                      className="rounded border border-emerald-700 px-3 py-1 text-sm text-emerald-800"
                    >
                      Publicar precio
                    </button>
                  )
                )}
              </span>
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

function SharedResults({
  results,
  canEdit,
  onAdopt,
}: {
  results: SharedCatalogSearch;
  canEdit: boolean;
  onAdopt: (
    sourceType: "market" | "product" | "price",
    publicSourceId: string,
  ) => Promise<void>;
}) {
  const total =
    results.markets.length + results.products.length + results.prices.length;
  return (
    <div className="mt-5 grid gap-5">
      <p className="text-sm text-zinc-600">
        {total
          ? `${total} sugerencia${total === 1 ? "" : "s"} para “${results.query}”.`
          : `No hay sugerencias para “${results.query}”.`}
      </p>
      {!!results.markets.length && (
        <SharedNamedList
          title="Mercados compartidos"
          sourceType="market"
          items={results.markets}
          canEdit={canEdit}
          onAdopt={onAdopt}
        />
      )}
      {!!results.products.length && (
        <SharedNamedList
          title="Productos compartidos"
          sourceType="product"
          items={results.products}
          canEdit={canEdit}
          onAdopt={onAdopt}
        />
      )}
      {!!results.prices.length && (
        <section>
          <h3 className="font-semibold">Precios compartidos</h3>
          <ul className="mt-2 divide-y rounded border bg-white">
            {results.prices.map((price) => (
              <li
                key={price.id}
                className="flex flex-wrap items-center justify-between gap-3 p-3"
              >
                <span>
                  <b>{price.product.name}</b> · {price.market.name}
                  <small className="block text-zinc-500">
                    {price.observedDate} ·{" "}
                    {money(price.amountMinor, price.currency)}
                  </small>
                </span>
                <AdoptionControl
                  adopted={price.adopted}
                  canEdit={canEdit}
                  onClick={() => void onAdopt("price", price.id)}
                />
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}

function SharedNamedList({
  title,
  sourceType,
  items,
  canEdit,
  onAdopt,
}: {
  title: string;
  sourceType: "market" | "product";
  items: SharedNamedItem[];
  canEdit: boolean;
  onAdopt: (
    sourceType: "market" | "product" | "price",
    publicSourceId: string,
  ) => Promise<void>;
}) {
  return (
    <section>
      <h3 className="font-semibold">{title}</h3>
      <ul className="mt-2 divide-y rounded border bg-white">
        {items.map((item) => (
          <li
            key={item.id}
            className="flex items-start justify-between gap-3 p-3"
          >
            <span>
              {item.name}
              {!!item.aliases.length && (
                <small className="block text-zinc-500">
                  También publicado como: {item.aliases.join(", ")}.
                </small>
              )}
              {!!item.possibleDuplicates.length && (
                <small className="block text-amber-700">
                  Posible duplicado; revisa cada opción antes de incorporarla.
                </small>
              )}
            </span>
            <AdoptionControl
              adopted={item.adopted}
              canEdit={canEdit}
              onClick={() => void onAdopt(sourceType, item.id)}
            />
          </li>
        ))}
      </ul>
    </section>
  );
}

function AdoptionControl({
  adopted,
  canEdit,
  onClick,
}: {
  adopted: boolean;
  canEdit: boolean;
  onClick: () => void;
}) {
  if (adopted)
    return <small className="shrink-0 text-emerald-700">Ya incorporado</small>;
  if (!canEdit) return null;
  return (
    <button
      type="button"
      onClick={onClick}
      className="shrink-0 rounded border border-sky-700 px-3 py-1 text-sm text-sky-800"
    >
      Incorporar
    </button>
  );
}

function CatalogList({
  title,
  items,
  duplicateNames,
  sourceType,
  canPublish,
  publishedSources,
  onPublish,
}: {
  title: string;
  items: CatalogItem[];
  duplicateNames: Map<string, string[]>;
  sourceType: "market" | "product";
  canPublish: boolean;
  publishedSources: Set<string>;
  onPublish: (
    sourceType: "market" | "product" | "price",
    sourceId: string,
  ) => Promise<void>;
}) {
  return (
    <section>
      <h2 className="text-xl font-semibold">{title}</h2>
      <ul className="mt-3 divide-y rounded-xl border">
        {items.map((item) => (
          <li
            key={item.id}
            className="flex items-start justify-between gap-3 p-4"
          >
            <span>
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
            </span>
            {publishedSources.has(`${sourceType}:${item.id}`) ? (
              <small className="text-emerald-700">Publicado</small>
            ) : (
              canPublish && (
                <button
                  type="button"
                  onClick={() => void onPublish(sourceType, item.id)}
                  className="shrink-0 rounded border border-emerald-700 px-3 py-1 text-sm text-emerald-800"
                >
                  Publicar
                </button>
              )
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
