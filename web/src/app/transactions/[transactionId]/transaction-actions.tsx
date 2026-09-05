"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

type Transaction = {
  id: string;
  date: string;
  type: string;
  amountMinor: number;
  currency: string;
  accountId: string;
  categoryId: string;
  description: string;
  isRecurring: boolean;
  isOneOff: boolean;
  status: string;
  voidedAt: Date | null;
};

async function request(url: string, body: Record<string, unknown>) {
  const response = await fetch(url, {
    method: url.endsWith("/void") ? "POST" : "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await response.json();
  if (!response.ok)
    throw new Error(data.error?.message ?? "No se pudo actualizar.");
}

export function TransactionActions({
  transaction,
  canEdit,
}: {
  transaction: Transaction;
  canEdit: boolean;
}) {
  const router = useRouter();
  const [message, setMessage] = useState("");
  const [isOneOff, setIsOneOff] = useState(transaction.isOneOff);
  const available =
    canEdit && transaction.status === "paid" && !transaction.voidedAt;

  if (!available)
    return canEdit ? (
      <p className="mt-6 text-sm text-zinc-500">
        Los movimientos anulados no pueden modificarse ni anularse otra vez.
      </p>
    ) : null;

  async function update(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    try {
      await request(`/api/v1/transactions/${transaction.id}`, {
        date: form.get("date"),
        type: transaction.type,
        amountMinor: Number(form.get("amountMinor")),
        currency: transaction.currency,
        accountId: transaction.accountId,
        categoryId: transaction.categoryId,
        description: form.get("description"),
        isRecurring: transaction.isRecurring && !isOneOff,
        isOneOff,
        changeReason: form.get("changeReason"),
      });
      setMessage("Movimiento actualizado y auditado.");
      router.refresh();
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "Error al actualizar.",
      );
    }
  }

  async function voidTransaction(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    try {
      await request(`/api/v1/transactions/${transaction.id}/void`, {
        reason: form.get("reason"),
      });
      setMessage("Movimiento anulado. Ya no afecta los saldos pagados.");
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Error al anular.");
    }
  }

  return (
    <section className="mt-8 border-t pt-6">
      <h2 className="text-lg font-semibold">Corregir movimiento</h2>
      <p className="mt-1 text-sm text-zinc-600">
        Toda corrección y anulación requiere una razón y queda en el historial.
      </p>
      {message && (
        <p className="mt-3 rounded bg-emerald-50 p-3 text-sm text-emerald-800">
          {message}
        </p>
      )}
      <form onSubmit={update} className="mt-4 grid gap-3">
        <input
          name="date"
          type="date"
          defaultValue={transaction.date}
          required
          className="rounded border p-2"
        />
        <input
          name="description"
          defaultValue={transaction.description}
          maxLength={500}
          required
          className="rounded border p-2"
        />
        <input
          name="amountMinor"
          type="number"
          defaultValue={transaction.amountMinor}
          min="1"
          step="1"
          required
          className="rounded border p-2"
        />
        {transaction.type === "income" && (
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={isOneOff}
              onChange={(event) => setIsOneOff(event.target.checked)}
            />
            Ingreso único
          </label>
        )}
        <input
          name="changeReason"
          placeholder="Razón de la corrección"
          minLength={3}
          maxLength={500}
          required
          className="rounded border p-2"
        />
        <button className="rounded bg-emerald-700 p-2 text-white">
          Guardar corrección
        </button>
      </form>
      <form
        onSubmit={voidTransaction}
        className="mt-6 grid gap-3 border-t pt-6"
      >
        <input
          name="reason"
          placeholder="Razón de la anulación"
          minLength={3}
          maxLength={500}
          required
          className="rounded border p-2"
        />
        <button className="rounded border border-red-700 p-2 text-red-700">
          Anular movimiento
        </button>
      </form>
    </section>
  );
}
