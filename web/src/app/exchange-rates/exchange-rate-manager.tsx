"use client";

import { type FormEvent, useCallback, useEffect, useState } from "react";

type ExchangeRate = {
  id: string;
  baseCurrency: string;
  quoteCurrency: string;
  rate: string;
  effectiveDate: string;
  source: string;
  kind: "confirmed" | "planning";
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

export function ExchangeRateManager({ canEdit }: { canEdit: boolean }) {
  const [items, setItems] = useState<ExchangeRate[]>([]);
  const [message, setMessage] = useState("");
  const [formKey, setFormKey] = useState(0);
  const load = useCallback(async () => {
    try {
      setItems(await api<ExchangeRate[]>("/api/v1/exchange-rates"));
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "Error al cargar cotizaciones.",
      );
    }
  }, []);
  useEffect(() => {
    const task = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(task);
  }, [load]);
  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    try {
      await api("/api/v1/exchange-rates", {
        method: "POST",
        body: JSON.stringify({
          baseCurrency: form.get("baseCurrency"),
          quoteCurrency: form.get("quoteCurrency"),
          rate: form.get("rate"),
          effectiveDate: form.get("effectiveDate"),
          source: form.get("source"),
          kind: form.get("kind"),
        }),
      });
      setFormKey((key) => key + 1);
      setMessage("Cotización registrada. Los saldos no fueron modificados.");
      await load();
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "No se pudo registrar la cotización.",
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
        <form
          key={formKey}
          onSubmit={submit}
          className="grid gap-2 rounded-xl border p-5 md:grid-cols-2"
        >
          <select
            name="baseCurrency"
            className="rounded border p-2"
            defaultValue="USD"
          >
            <option value="USD">USD (base)</option>
            <option value="UYU">UYU (base)</option>
          </select>
          <select
            name="quoteCurrency"
            className="rounded border p-2"
            defaultValue="UYU"
          >
            <option value="UYU">UYU (cotización)</option>
            <option value="USD">USD (cotización)</option>
          </select>
          <input
            name="rate"
            type="text"
            inputMode="decimal"
            required
            placeholder="Tasa (ej. 42.75000000)"
            className="rounded border p-2"
          />
          <input
            name="effectiveDate"
            type="date"
            required
            className="rounded border p-2"
          />
          <input
            name="source"
            required
            placeholder="Fuente (ej. Banco Central)"
            className="rounded border p-2"
          />
          <select
            name="kind"
            className="rounded border p-2"
            defaultValue="confirmed"
          >
            <option value="confirmed">Confirmada</option>
            <option value="planning">De planificación</option>
          </select>
          <button className="rounded bg-emerald-700 p-2 text-white md:col-span-2">
            Registrar cotización
          </button>
        </form>
      )}
      <section>
        <h2 className="text-xl font-semibold">Registro de cotizaciones</h2>
        <ul className="mt-3 divide-y rounded-xl border">
          {items.map((item) => (
            <li
              key={item.id}
              className="flex flex-wrap justify-between gap-3 p-4"
            >
              <span>
                <b>
                  1 {item.baseCurrency} = {item.rate} {item.quoteCurrency}
                </b>
                <small className="block text-zinc-500">
                  {item.effectiveDate} · {item.source}
                </small>
              </span>
              <span className="rounded bg-zinc-100 px-2 py-1 text-sm">
                {item.kind === "confirmed" ? "Confirmada" : "Planificación"}
              </span>
            </li>
          ))}
          {!items.length && (
            <li className="p-4 text-zinc-500">
              No hay cotizaciones registradas.
            </li>
          )}
        </ul>
      </section>
    </div>
  );
}
