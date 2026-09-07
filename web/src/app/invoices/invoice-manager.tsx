"use client";

import { type FormEvent, useCallback, useEffect, useState } from "react";
import {
  formatMoneyInput,
  parseMoneyToMinor,
} from "@/shared/money/parse-money";

type Invoice = {
  id: string;
  clientName: string;
  description: string;
  serviceDate: string;
  dueDate: string;
  grossAmountMinor: number;
  netAmountMinor: number;
  ivaRateBasisPoints: number;
  ivaAmountMinor: number;
  currency: string;
  status: string;
  remainingAmountMinor: number;
};

type Account = { id: string; name: string; currency: string; active: boolean };
type InvoiceDetail = {
  invoice: Invoice;
  collections: {
    id: string;
    amountMinor: number;
    paidDate: string;
    accountName: string;
  }[];
};

const money = (amount: number, currency: string) =>
  new Intl.NumberFormat("es-UY", { style: "currency", currency }).format(
    amount / 100,
  );

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

export function InvoiceManager({ canEdit }: { canEdit: boolean }) {
  const [items, setItems] = useState<Invoice[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [detail, setDetail] = useState<InvoiceDetail | null>(null);
  const [message, setMessage] = useState("");
  const [grossAmount, setGrossAmount] = useState("0,00");
  const [formKey, setFormKey] = useState(0);
  const load = useCallback(async () => {
    try {
      setItems(await api<Invoice[]>("/api/v1/invoices"));
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "No se pudieron cargar las facturas.",
      );
    }
  }, []);
  useEffect(() => {
    const task = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(task);
  }, [load]);
  useEffect(() => {
    void api<Account[]>("/api/v1/accounts?active=true").then(setAccounts);
  }, []);
  const action = async (id: string, suffix: string, body: unknown) => {
    try {
      await api(`/api/v1/invoices/${id}/${suffix}`, {
        method: "POST",
        body: JSON.stringify(body),
      });
      setMessage("Factura actualizada.");
      await load();
      setDetail(await api<InvoiceDetail>(`/api/v1/invoices/${id}`));
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "No se pudo actualizar la factura.",
      );
    }
  };
  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const grossAmountMinor = parseMoneyToMinor(String(form.get("grossAmount")));
    const ivaRatePercent = Number(String(form.get("ivaRatePercent")));
    if (grossAmountMinor === undefined || grossAmountMinor <= 0) {
      setMessage("Ingresa un importe bruto válido, por ejemplo 1.234,56.");
      return;
    }
    if (
      !Number.isFinite(ivaRatePercent) ||
      ivaRatePercent < 0 ||
      ivaRatePercent > 100
    ) {
      setMessage("Ingresa una tasa de IVA entre 0 y 100 %.");
      return;
    }
    try {
      await api("/api/v1/invoices", {
        method: "POST",
        body: JSON.stringify({
          clientName: form.get("clientName"),
          description: form.get("description"),
          serviceDate: form.get("serviceDate"),
          dueDate: form.get("dueDate"),
          grossAmountMinor,
          ivaRateBasisPoints: Math.round(ivaRatePercent * 100),
          currency: form.get("currency"),
        }),
      });
      setFormKey((key) => key + 1);
      setGrossAmount("0,00");
      setMessage("Factura registrada con su IVA calculado.");
      await load();
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "No se pudo registrar la factura.",
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
          <input
            name="clientName"
            required
            placeholder="Cliente"
            className="rounded border p-2"
          />
          <input
            name="description"
            required
            placeholder="Descripción del servicio"
            className="rounded border p-2"
          />
          <label className="grid gap-1 text-sm">
            Fecha de servicio
            <input
              name="serviceDate"
              type="date"
              required
              className="rounded border p-2"
            />
          </label>
          <label className="grid gap-1 text-sm">
            Vencimiento
            <input
              name="dueDate"
              type="date"
              required
              className="rounded border p-2"
            />
          </label>
          <input
            name="grossAmount"
            type="text"
            inputMode="decimal"
            required
            value={grossAmount}
            onChange={(event) =>
              setGrossAmount(formatMoneyInput(event.target.value))
            }
            onFocus={(event) => event.currentTarget.select()}
            placeholder="Importe bruto"
            className="rounded border p-2"
          />
          <input
            name="ivaRatePercent"
            type="number"
            inputMode="decimal"
            min="0"
            max="100"
            step="0.01"
            defaultValue="22"
            required
            aria-label="Tasa de IVA (%)"
            className="rounded border p-2"
          />
          <select name="currency" className="rounded border p-2">
            <option>UYU</option>
            <option>USD</option>
          </select>
          <button className="rounded bg-emerald-700 p-2 text-white">
            Registrar factura
          </button>
        </form>
      )}
      <section>
        <h2 className="text-xl font-semibold">Facturas registradas</h2>
        <ul className="mt-3 divide-y rounded-xl border">
          {items.map((item) => (
            <li
              key={item.id}
              className="flex flex-wrap justify-between gap-3 p-4"
            >
              <span>
                <b>{item.clientName}</b> · {item.description}
                <small className="block text-zinc-500">
                  Servicio: {item.serviceDate} · vence: {item.dueDate} ·{" "}
                  {item.status}
                </small>
              </span>
              <span className="text-right">
                <strong>{money(item.grossAmountMinor, item.currency)}</strong>
                <small className="block text-zinc-500">
                  Neto {money(item.netAmountMinor, item.currency)} · IVA{" "}
                  {item.ivaRateBasisPoints / 100}%:{" "}
                  {money(item.ivaAmountMinor, item.currency)}
                </small>
                <small className="block text-zinc-500">
                  Pendiente: {money(item.remainingAmountMinor, item.currency)}
                </small>
              </span>
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  className="rounded border px-2 py-1 text-sm"
                  onClick={() =>
                    void api<InvoiceDetail>(`/api/v1/invoices/${item.id}`).then(
                      setDetail,
                    )
                  }
                >
                  Ver detalle
                </button>
                {canEdit && item.status === "draft" && (
                  <button
                    type="button"
                    className="rounded bg-emerald-700 px-2 py-1 text-sm text-white"
                    onClick={() =>
                      void action(item.id, "send", {
                        sentDate: new Date().toISOString().slice(0, 10),
                      })
                    }
                  >
                    Marcar enviada
                  </button>
                )}
                {canEdit && ["draft", "sent"].includes(item.status) && (
                  <button
                    type="button"
                    className="rounded border px-2 py-1 text-sm"
                    onClick={() =>
                      void action(item.id, "cancel", {
                        reason: "Cancelada por el hogar",
                      })
                    }
                  >
                    Cancelar
                  </button>
                )}
              </div>
            </li>
          ))}
          {!items.length && (
            <li className="p-4 text-zinc-500">No hay facturas registradas.</li>
          )}
        </ul>
      </section>
      {detail && (
        <section className="rounded-xl border p-5">
          <h2 className="text-xl font-semibold">Detalle de factura</h2>
          <p className="mt-2 text-sm text-zinc-600">
            {detail.invoice.clientName} · pendiente{" "}
            {money(
              detail.invoice.remainingAmountMinor,
              detail.invoice.currency,
            )}
          </p>
          <ul className="mt-3 list-disc pl-5 text-sm">
            {detail.collections.map((collection) => (
              <li key={collection.id}>
                {collection.paidDate}:{" "}
                {money(collection.amountMinor, detail.invoice.currency)} en{" "}
                {collection.accountName}
              </li>
            ))}
            {!detail.collections.length && <li>Aún no hay cobranzas.</li>}
          </ul>
          {canEdit &&
            ["sent", "partially_collected"].includes(detail.invoice.status) && (
              <form
                className="mt-4 grid gap-2 md:grid-cols-4"
                onSubmit={(event) => {
                  event.preventDefault();
                  const form = new FormData(event.currentTarget);
                  const amountMinor = parseMoneyToMinor(
                    String(form.get("amount")),
                  );
                  if (!amountMinor || amountMinor <= 0)
                    return setMessage("Ingresa una cobranza válida.");
                  void action(detail.invoice.id, "payments", {
                    amountMinor,
                    accountId: form.get("accountId"),
                    paidDate: form.get("paidDate"),
                  });
                }}
              >
                <input
                  name="amount"
                  required
                  inputMode="decimal"
                  placeholder="Importe cobrado"
                  className="rounded border p-2"
                />
                <select
                  name="accountId"
                  required
                  className="rounded border p-2"
                >
                  <option value="">Cuenta de {detail.invoice.currency}</option>
                  {accounts
                    .filter(
                      (account) => account.currency === detail.invoice.currency,
                    )
                    .map((account) => (
                      <option key={account.id} value={account.id}>
                        {account.name}
                      </option>
                    ))}
                </select>
                <input
                  name="paidDate"
                  type="date"
                  required
                  defaultValue={new Date().toISOString().slice(0, 10)}
                  className="rounded border p-2"
                />
                <button className="rounded bg-emerald-700 p-2 text-white">
                  Registrar cobranza
                </button>
              </form>
            )}
        </section>
      )}
    </div>
  );
}
