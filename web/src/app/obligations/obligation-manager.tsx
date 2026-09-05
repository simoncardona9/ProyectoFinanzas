"use client";
import { FormEvent, useCallback, useEffect, useState } from "react";
import {
  formatMoneyInput,
  parseMoneyToMinor,
} from "@/shared/money/parse-money";

type Category = {
  id: string;
  name: string;
  kind: string;
  defaultClassification: string | null;
};
type Account = { id: string; name: string; currency: string };
type Obligation = {
  id: string;
  description: string;
  remainingAmountMinor: number;
  originalAmountMinor: number;
  currency: string;
  dueDate: string;
  classification: string;
  status: string;
  categoryName: string;
  recurrenceRule: string | null;
};
type Forecast = {
  period: string;
  currencies: {
    currency: string;
    currentCashMinor: number;
    pendingObligationsMinor: number;
    projectedCashMinor: number;
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
const currentPeriod = new Date().toISOString().slice(0, 7);

export function ObligationManager({ canEdit }: { canEdit: boolean }) {
  const [categories, setCategories] = useState<Category[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [items, setItems] = useState<Obligation[]>([]);
  const [forecast, setForecast] = useState<Forecast | null>(null);
  const [period, setPeriod] = useState(currentPeriod);
  const [message, setMessage] = useState("");
  const [amount, setAmount] = useState("0,00");
  const [formKey, setFormKey] = useState(0);
  const load = useCallback(async () => {
    try {
      const [nextCategories, nextAccounts, nextItems, nextForecast] =
        await Promise.all([
          api<Category[]>("/api/v1/categories"),
          api<Account[]>("/api/v1/accounts"),
          api<Obligation[]>(
            `/api/v1/obligations?dueFrom=${period}-01&dueTo=${new Date(Number(period.slice(0, 4)), Number(period.slice(5)), 0).toISOString().slice(0, 10)}`,
          ),
          api<Forecast>(`/api/v1/forecast?period=${period}`),
        ]);
      setCategories(
        nextCategories.filter((category) => category.kind === "expense"),
      );
      setAccounts(nextAccounts);
      setItems(nextItems);
      setForecast(nextForecast);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Error al cargar.");
    }
  }, [period]);
  useEffect(() => {
    const task = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(task);
  }, [load]);
  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const amountMinor = parseMoneyToMinor(String(form.get("amount")));
    if (amountMinor === undefined || amountMinor <= 0) {
      setMessage("Ingresa un importe válido, por ejemplo 1.234,56.");
      return;
    }
    try {
      await api("/api/v1/obligations", {
        method: "POST",
        body: JSON.stringify({
          description: form.get("description"),
          amountMinor,
          currency: form.get("currency"),
          dueDate: form.get("dueDate"),
          categoryId: form.get("categoryId"),
          classification: form.get("classification"),
          status: form.get("status"),
          recurrenceRule: form.get("recurrenceRule") || null,
        }),
      });
      setFormKey((key) => key + 1);
      setAmount("0,00");
      setMessage("Obligación creada; no cambió el efectivo actual.");
      await load();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Error.");
    }
  };
  const pay = async (item: Obligation) => {
    const amount = window.prompt(
      "Importe a pagar en centésimos",
      String(item.remainingAmountMinor),
    );
    if (!amount) return;
    const account = accounts.find(
      (candidate) => candidate.currency === item.currency,
    );
    if (!account) {
      setMessage(
        `No hay una cuenta activa en ${item.currency} para registrar el pago.`,
      );
      return;
    }
    try {
      await api(`/api/v1/obligations/${item.id}/payments`, {
        method: "POST",
        body: JSON.stringify({
          amountMinor: Number(amount),
          accountId: account.id,
          paidDate: new Date().toISOString().slice(0, 10),
          description: `${item.description} (${account.name})`,
        }),
      });
      setMessage(
        `Pago registrado desde ${account.name}; el efectivo fue actualizado.`,
      );
      await load();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Error.");
    }
  };
  const defer = async (item: Obligation) => {
    const newDueDate = window.prompt(
      "Nueva fecha de vencimiento (AAAA-MM-DD)",
      item.dueDate,
    );
    if (!newDueDate) return;
    const reason = window.prompt("Motivo del aplazamiento");
    if (!reason) return;
    try {
      await api(`/api/v1/obligations/${item.id}/defer`, {
        method: "POST",
        body: JSON.stringify({ newDueDate, reason }),
      });
      setMessage("Obligación aplazada y visible en el nuevo período.");
      await load();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Error.");
    }
  };
  return (
    <div className="mt-8 grid gap-8">
      <div className="flex flex-wrap items-end gap-3">
        <label className="grid gap-1 text-sm">
          Mes{" "}
          <input
            type="month"
            value={period}
            onChange={(event) => setPeriod(event.target.value)}
            className="rounded border p-2"
          />
        </label>
        {forecast?.currencies.map((item) => (
          <div
            key={item.currency}
            className="rounded border border-emerald-200 bg-emerald-50 p-3 text-sm"
          >
            <b>{item.currency}</b>: efectivo{" "}
            {money(item.currentCashMinor, item.currency)} · pendientes{" "}
            {money(item.pendingObligationsMinor, item.currency)} ·{" "}
            <b>proyectado {money(item.projectedCashMinor, item.currency)}</b>
          </div>
        ))}
      </div>
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
            name="description"
            required
            placeholder="Descripción (ej. UTE)"
            className="rounded border p-2"
          />
          <input
            name="amount"
            type="text"
            inputMode="decimal"
            required
            value={amount}
            onChange={(event) => setAmount(formatMoneyInput(event.target.value))}
            onFocus={(event) => event.currentTarget.select()}
            onBlur={() => {
              const minor = parseMoneyToMinor(amount);
              if (minor !== undefined)
                setAmount(
                  new Intl.NumberFormat("es-UY", {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  }).format(minor / 100),
                );
            }}
            placeholder="Importe (ej. 1.234,56)"
            className="rounded border p-2"
          />
          <select name="currency" className="rounded border p-2">
            <option>UYU</option>
            <option>USD</option>
          </select>
          <input
            name="dueDate"
            type="date"
            required
            className="rounded border p-2"
          />
          <select name="categoryId" required className="rounded border p-2">
            <option value="">Categoría de egreso</option>
            {categories.map((item) => (
              <option key={item.id} value={item.id}>
                {item.name}
              </option>
            ))}
          </select>
          <select name="classification" className="rounded border p-2">
            <option value="fixed">Fija</option>
            <option value="variable">Variable</option>
            <option value="discretionary">Discrecional</option>
          </select>
          <select name="status" className="rounded border p-2">
            <option value="pending">Pendiente</option>
            <option value="planned">Planificada</option>
          </select>
          <select name="recurrenceRule" className="rounded border p-2">
            <option value="">Sin recurrencia</option>
            <option value="monthly">Mensual</option>
            <option value="quarterly">Trimestral</option>
            <option value="yearly">Anual</option>
          </select>
          <button className="rounded bg-emerald-700 p-2 text-white md:col-span-2">
            Crear obligación
          </button>
        </form>
      )}
      <section>
        <h2 className="text-xl font-semibold">Vencimientos del mes</h2>
        <ul className="mt-3 divide-y rounded-xl border">
          {items.map((item) => (
            <li
              key={item.id}
              className="flex flex-wrap items-center justify-between gap-3 p-4"
            >
              <span>
                <b>{item.description}</b> ·{" "}
                {money(item.remainingAmountMinor, item.currency)}{" "}
                <small className="text-zinc-500">
                  {item.dueDate} · {item.categoryName} · {item.status}
                </small>
              </span>
              {canEdit && !["paid", "cancelled"].includes(item.status) && (
                <span className="flex gap-3 text-sm">
                  <button
                    onClick={() => void pay(item)}
                    className="text-emerald-700"
                  >
                    Pagar
                  </button>
                  <button
                    onClick={() => void defer(item)}
                    className="text-amber-700"
                  >
                    Aplazar
                  </button>
                </span>
              )}
            </li>
          ))}
          {!items.length && (
            <li className="p-4 text-zinc-500">
              No hay obligaciones con vencimiento en este mes.
            </li>
          )}
        </ul>
      </section>
    </div>
  );
}
