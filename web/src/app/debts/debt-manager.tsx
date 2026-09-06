"use client";

import Link from "next/link";
import { type FormEvent, useCallback, useEffect, useState } from "react";
import {
  formatMoneyInput,
  parseMoneyToMinor,
} from "@/shared/money/parse-money";

type Debt = {
  id: string;
  creditorName: string;
  description: string;
  originalAmountMinor: number;
  remainingAmountMinor: number;
  currency: string;
  incurredDate: string;
  status: string;
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

export function DebtManager({ canEdit }: { canEdit: boolean }) {
  const [items, setItems] = useState<Debt[]>([]);
  const [message, setMessage] = useState("");
  const [amount, setAmount] = useState("0,00");
  const [formKey, setFormKey] = useState(0);
  const load = useCallback(async () => {
    try {
      setItems(await api<Debt[]>("/api/v1/debts?status=active"));
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "Error al cargar las deudas.",
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
    const amountMinor = parseMoneyToMinor(String(form.get("amount")));
    if (amountMinor === undefined || amountMinor <= 0) {
      setMessage("Ingresa un importe válido, por ejemplo 1.234,56.");
      return;
    }
    try {
      await api("/api/v1/debts", {
        method: "POST",
        body: JSON.stringify({
          creditorName: form.get("creditorName"),
          description: form.get("description"),
          amountMinor,
          currency: form.get("currency"),
          incurredDate: form.get("incurredDate"),
        }),
      });
      setFormKey((key) => key + 1);
      setAmount("0,00");
      setMessage("Deuda registrada en su moneda original.");
      await load();
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "No se pudo crear la deuda.",
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
            name="creditorName"
            required
            placeholder="Acreedor (ej. Banco)"
            className="rounded border p-2"
          />
          <input
            name="description"
            required
            placeholder="Descripción (ej. Tarjeta de crédito)"
            className="rounded border p-2"
          />
          <input
            name="amount"
            type="text"
            inputMode="decimal"
            required
            value={amount}
            onChange={(event) =>
              setAmount(formatMoneyInput(event.target.value))
            }
            onFocus={(event) => event.currentTarget.select()}
            placeholder="Saldo original"
            className="rounded border p-2"
          />
          <select name="currency" className="rounded border p-2">
            <option>UYU</option>
            <option>USD</option>
          </select>
          <input
            name="incurredDate"
            type="date"
            required
            className="rounded border p-2"
          />
          <button className="rounded bg-emerald-700 p-2 text-white md:col-span-2">
            Registrar deuda
          </button>
        </form>
      )}
      <section>
        <h2 className="text-xl font-semibold">Saldos pendientes</h2>
        <ul className="mt-3 divide-y rounded-xl border">
          {items.map((item) => (
            <li
              key={item.id}
              className="flex flex-wrap items-center justify-between gap-3 p-4"
            >
              <span>
                <b>{item.creditorName}</b> · {item.description}
                <small className="block text-zinc-500">
                  Originada el {item.incurredDate} · saldo original{" "}
                  {money(item.originalAmountMinor, item.currency)}
                </small>
              </span>
              <Link
                href={`/debts/${item.id}`}
                className="rounded text-emerald-700 hover:underline"
              >
                {money(item.remainingAmountMinor, item.currency)} →
              </Link>
            </li>
          ))}
          {!items.length && (
            <li className="p-4 text-zinc-500">
              No hay deudas activas registradas.
            </li>
          )}
        </ul>
      </section>
    </div>
  );
}
