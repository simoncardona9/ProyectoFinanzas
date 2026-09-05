"use client";

import { FormEvent, useEffect, useState } from "react";

type Account = { id: string; name: string; currency: string; active: boolean };
type Category = { id: string; name: string; kind: string; active: boolean };
type Transaction = {
  id: string;
  date: string;
  type: "income" | "expense";
  amountMinor: number;
  description: string;
  accountName: string;
  categoryName: string;
};
type CreateResult = {
  transaction: Transaction;
  accountBalanceMinor: number;
  categoryTotalMinor: number;
};

const formatter = new Intl.NumberFormat("es-UY", {
  style: "currency",
  currency: "UYU",
});

async function api<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, {
    ...init,
    headers: { "Content-Type": "application/json", ...init?.headers },
  });
  const body = await response.json();
  if (!response.ok) throw new Error(body.error?.message ?? "No se pudo completar la operación.");
  return body.data;
}

export function TransactionRegister({ canEdit }: { canEdit: boolean }) {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [type, setType] = useState<"income" | "expense">("expense");
  const [message, setMessage] = useState("");

  const load = async () => {
    try {
      const [nextAccounts, nextCategories, nextTransactions] = await Promise.all([
        api<Account[]>("/api/v1/accounts?active=true"),
        api<Category[]>("/api/v1/categories?active=true"),
        api<Transaction[]>("/api/v1/transactions"),
      ]);
      setAccounts(nextAccounts.filter((item) => item.currency === "UYU"));
      setCategories(nextCategories);
      setTransactions(nextTransactions);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Error al cargar.");
    }
  };
  useEffect(() => {
    const task = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(task);
  }, []);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    try {
      const result = await api<CreateResult>("/api/v1/transactions", {
        method: "POST",
        body: JSON.stringify({
          date: form.get("date"),
          type,
          status: "paid",
          amountMinor: Number(form.get("amountMinor")),
          currency: "UYU",
          accountId: form.get("accountId"),
          categoryId: form.get("categoryId"),
          description: form.get("description"),
        }),
      });
      event.currentTarget.reset();
      setMessage(
        `Movimiento registrado. Saldo de cuenta: ${formatter.format(result.accountBalanceMinor / 100)}. Total de categoría: ${formatter.format(result.categoryTotalMinor / 100)}.`,
      );
      await load();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Error.");
    }
  };
  const matchingCategories = categories.filter((item) => item.kind === type);

  return (
    <div className="mt-8 grid gap-8 lg:grid-cols-2">
      {message && <p className="lg:col-span-2 rounded bg-emerald-50 p-3 text-sm text-emerald-800">{message}</p>}
      <section className="rounded-xl border border-zinc-200 p-5">
        <h2 className="text-xl font-semibold">Registrar movimiento pagado</h2>
        {canEdit ? (
          <form onSubmit={submit} className="mt-4 grid gap-3">
            <select value={type} onChange={(event) => setType(event.target.value as "income" | "expense")} className="rounded border p-2">
              <option value="expense">Egreso</option>
              <option value="income">Ingreso</option>
            </select>
            <input name="date" type="date" required className="rounded border p-2" />
            <input name="description" required maxLength={500} placeholder="Descripción" className="rounded border p-2" />
            <input name="amountMinor" type="number" min="1" step="1" required placeholder="Importe en centésimos (ej. 125050)" className="rounded border p-2" />
            <select name="accountId" required className="rounded border p-2">
              <option value="">Selecciona una cuenta UYU</option>
              {accounts.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
            </select>
            <select name="categoryId" required className="rounded border p-2">
              <option value="">Selecciona una categoría</option>
              {matchingCategories.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
            </select>
            <button className="rounded bg-emerald-700 p-2 text-white">Registrar en UYU</button>
          </form>
        ) : (
          <p className="mt-4 text-zinc-600">Tu rol permite consultar, pero no registrar movimientos.</p>
        )}
      </section>
      <section className="rounded-xl border border-zinc-200 p-5">
        <h2 className="text-xl font-semibold">Movimientos pagados</h2>
        <ul className="mt-4 divide-y">
          {transactions.map((item) => (
            <li key={item.id} className="py-3">
              <div className="flex justify-between gap-3"><span>{item.description}</span><strong>{item.type === "expense" ? "−" : "+"}{formatter.format(item.amountMinor / 100)}</strong></div>
              <small className="text-zinc-500">{item.date} · {item.accountName} · {item.categoryName}</small>
            </li>
          ))}
          {!transactions.length && <li className="py-3 text-zinc-500">Aún no hay movimientos pagados.</li>}
        </ul>
      </section>
    </div>
  );
}
