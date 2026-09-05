"use client";

import { FormEvent, useEffect, useState } from "react";
import {
  formatMoneyInput,
  parseMoneyToMinor,
} from "@/shared/money/parse-money";

type Account = { id: string; name: string; currency: "UYU" | "USD" };
type Category = { id: string; name: string; kind: string };

export function ExpectedIncomeForm({
  period,
  onCreated,
}: {
  period: string;
  onCreated: () => Promise<void>;
}) {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [message, setMessage] = useState("");
  const [amount, setAmount] = useState("0,00");
  const [formKey, setFormKey] = useState(0);
  useEffect(() => {
    void Promise.all([
      fetch("/api/v1/accounts?active=true").then((response) => response.json()),
      fetch("/api/v1/categories?active=true").then((response) =>
        response.json(),
      ),
    ]).then(([accountsBody, categoriesBody]) => {
      setAccounts(accountsBody.data ?? []);
      setCategories(categoriesBody.data ?? []);
    });
  }, []);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const amountMinor = parseMoneyToMinor(String(form.get("amount")));
    if (amountMinor === undefined || amountMinor <= 0) {
      setMessage("Ingresa un importe válido, por ejemplo 1.234,56.");
      return;
    }
    const response = await fetch("/api/v1/transactions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        date: form.get("date"),
        type: "income",
        status: form.get("status"),
        amountMinor,
        currency: form.get("currency"),
        accountId: form.get("accountId"),
        categoryId: form.get("categoryId"),
        description: form.get("description"),
      }),
    });
    const body = await response.json();
    if (!response.ok) {
      setMessage(
        body.error?.message ?? "No se pudo registrar el ingreso esperado.",
      );
      return;
    }
    setFormKey((key) => key + 1);
    setAmount("0,00");
    setMessage(
      "Ingreso esperado registrado; aún no modifica el efectivo disponible.",
    );
    await onCreated();
  }
  const incomeCategories = categories.filter(
    (category) => category.kind === "income",
  );
  return (
    <section className="rounded-xl border border-zinc-200 p-5">
      <h2 className="text-lg font-semibold">Registrar ingreso esperado</h2>
      <p className="mt-1 text-sm text-zinc-600">
        Se muestra en la proyección del mes, pero no aumenta el efectivo hasta
        cobrarlo.
      </p>
      <form
        key={formKey}
        onSubmit={submit}
        className="mt-4 grid gap-2 md:grid-cols-2"
      >
        <input
          name="description"
          required
          maxLength={500}
          placeholder="Descripción"
          className="rounded border p-2"
        />
        <input
          name="amount"
          type="text"
          inputMode="decimal"
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
          required
          placeholder="Importe (ej. 1.234,56)"
          className="rounded border p-2"
        />
        <input
          name="date"
          type="date"
          required
          defaultValue={`${period}-01`}
          className="rounded border p-2"
        />
        <select name="status" className="rounded border p-2">
          <option value="planned">Planificado</option>
          <option value="pending">Pendiente</option>
        </select>
        <select name="currency" className="rounded border p-2">
          <option value="UYU">UYU</option>
          <option value="USD">USD</option>
        </select>
        <select name="accountId" required className="rounded border p-2">
          <option value="">Cuenta de destino</option>
          {accounts.map((account) => (
            <option key={account.id} value={account.id}>
              {account.name} ({account.currency})
            </option>
          ))}
        </select>
        <select name="categoryId" required className="rounded border p-2">
          <option value="">Categoría de ingreso</option>
          {incomeCategories.map((category) => (
            <option key={category.id} value={category.id}>
              {category.name}
            </option>
          ))}
        </select>
        <button className="rounded bg-emerald-700 p-2 text-white md:col-span-2">
          Agregar a la proyección
        </button>
      </form>
      {message && <p className="mt-3 text-sm text-emerald-800">{message}</p>}
    </section>
  );
}
