"use client";

import { type FormEvent, useState } from "react";
import {
  formatMoneyInput,
  parseMoneyToMinor,
} from "@/shared/money/parse-money";

type Account = { id: string; name: string; currency: string; active: boolean };

export function DebtPaymentForm({
  debtId,
  currency,
  remainingAmountMinor,
  accounts,
}: {
  debtId: string;
  currency: string;
  remainingAmountMinor: number;
  accounts: Account[];
}) {
  const eligibleAccounts = accounts.filter(
    (account) => account.active && account.currency === currency,
  );
  const [amount, setAmount] = useState("");
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const amountMinor = parseMoneyToMinor(amount);
    if (
      amountMinor === undefined ||
      amountMinor <= 0 ||
      amountMinor > remainingAmountMinor
    ) {
      setMessage(
        "Ingresa un importe positivo que no supere el saldo pendiente.",
      );
      return;
    }
    const form = new FormData(event.currentTarget);
    setSubmitting(true);
    setMessage("");
    try {
      const response = await fetch(`/api/v1/debts/${debtId}/payments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amountMinor,
          accountId: form.get("accountId"),
          paidDate: form.get("paidDate"),
          description: form.get("description") || undefined,
        }),
      });
      const body = await response.json();
      if (!response.ok)
        throw new Error(body.error?.message ?? "No se pudo registrar el pago.");
      window.location.reload();
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "Error al registrar el pago.",
      );
    } finally {
      setSubmitting(false);
    }
  };

  if (!eligibleAccounts.length)
    return (
      <p className="mt-6 rounded bg-amber-50 p-3 text-sm text-amber-900">
        No hay una cuenta activa en {currency} desde la cual registrar un pago.
      </p>
    );

  return (
    <form
      onSubmit={submit}
      className="mt-6 grid gap-3 rounded-xl border p-4 sm:grid-cols-2"
    >
      <h2 className="text-lg font-semibold sm:col-span-2">Registrar pago</h2>
      <label className="grid gap-1 text-sm">
        Importe ({currency})
        <input
          type="text"
          inputMode="decimal"
          required
          value={amount}
          onChange={(event) => setAmount(formatMoneyInput(event.target.value))}
          placeholder="0,00"
          className="rounded border p-2"
        />
      </label>
      <label className="grid gap-1 text-sm">
        Cuenta de pago
        <select name="accountId" className="rounded border p-2" required>
          {eligibleAccounts.map((account) => (
            <option key={account.id} value={account.id}>
              {account.name}
            </option>
          ))}
        </select>
      </label>
      <label className="grid gap-1 text-sm">
        Fecha de pago
        <input
          name="paidDate"
          type="date"
          required
          defaultValue={new Date().toISOString().slice(0, 10)}
          className="rounded border p-2"
        />
      </label>
      <label className="grid gap-1 text-sm">
        Descripción (opcional)
        <input
          name="description"
          maxLength={500}
          className="rounded border p-2"
        />
      </label>
      {message && (
        <p className="text-sm text-rose-700 sm:col-span-2">{message}</p>
      )}
      <button
        disabled={submitting}
        className="rounded bg-emerald-700 p-2 text-white disabled:opacity-60 sm:col-span-2"
      >
        {submitting ? "Registrando…" : "Registrar pago"}
      </button>
    </form>
  );
}
