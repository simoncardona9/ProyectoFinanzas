"use client";

import { useCallback, useEffect, useState } from "react";

type AuditEntry = {
  id: string;
  action: "close" | "reopen";
  details: { reason?: string } | null;
  createdAt: string;
};
type PeriodStatus = {
  period: string;
  status: "open" | "closed";
  audit: AuditEntry[];
};

const currentPeriod = new Date().toISOString().slice(0, 7);

export function FinancialPeriodManager({ isOwner }: { isOwner: boolean }) {
  const [period, setPeriod] = useState(currentPeriod);
  const [status, setStatus] = useState<PeriodStatus | null>(null);
  const [reason, setReason] = useState("");
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    try {
      setMessage("");
      const response = await fetch(
        `/api/v1/financial-periods?period=${period}`,
      );
      const body = await response.json();
      if (!response.ok)
        throw new Error(
          body.error?.message ?? "No se pudo consultar el período.",
        );
      setStatus(body.data);
    } catch (error) {
      setStatus(null);
      setMessage(error instanceof Error ? error.message : "Error al cargar.");
    }
  }, [period]);

  useEffect(() => {
    const task = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(task);
  }, [load]);

  async function transition(action: "close" | "reopen") {
    try {
      setSaving(true);
      setMessage("");
      const response = await fetch(`/api/v1/financial-periods/${action}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          action === "reopen" ? { period, reason } : { period },
        ),
      });
      const body = await response.json();
      if (!response.ok)
        throw new Error(
          body.error?.message ?? "No se pudo cambiar el período.",
        );
      setReason("");
      setMessage(action === "close" ? "Mes cerrado." : "Mes reabierto.");
      await load();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Error al guardar.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="mt-8 grid gap-6">
      <label className="grid max-w-48 gap-1 text-sm font-medium">
        Mes
        <input
          type="month"
          value={period}
          onChange={(event) => setPeriod(event.target.value)}
          className="rounded border border-zinc-300 p-2"
        />
      </label>
      {message && (
        <p role="alert" className="text-sm text-zinc-700">
          {message}
        </p>
      )}
      {status && (
        <section className="rounded-xl border border-zinc-200 p-5">
          <h2 className="font-semibold">
            Estado: {status.status === "closed" ? "cerrado" : "abierto"}
          </h2>
          {isOwner && status.status === "open" && (
            <button
              type="button"
              disabled={saving}
              onClick={() => void transition("close")}
              className="mt-4 rounded bg-emerald-700 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
            >
              Cerrar mes
            </button>
          )}
          {isOwner && status.status === "closed" && (
            <div className="mt-4 grid max-w-lg gap-3">
              <label className="grid gap-1 text-sm font-medium">
                Motivo de reapertura
                <textarea
                  value={reason}
                  onChange={(event) => setReason(event.target.value)}
                  maxLength={500}
                  required
                  className="rounded border border-zinc-300 p-2"
                />
              </label>
              <button
                type="button"
                disabled={saving || !reason.trim()}
                onClick={() => void transition("reopen")}
                className="w-fit rounded border border-amber-700 px-4 py-2 text-sm font-semibold text-amber-800 disabled:opacity-50"
              >
                Reabrir mes
              </button>
            </div>
          )}
          {!isOwner && (
            <p className="mt-3 text-sm text-zinc-600">
              Tu rol puede consultar el estado y el historial, pero no
              cambiarlo.
            </p>
          )}
          <div className="mt-6 border-t pt-4">
            <h3 className="font-medium">Historial de cierre</h3>
            {status.audit.length ? (
              <ol className="mt-3 grid gap-2 text-sm text-zinc-700">
                {status.audit.map((entry) => (
                  <li key={entry.id}>
                    {entry.action === "close" ? "Mes cerrado" : "Mes reabierto"}{" "}
                    ·{" "}
                    {new Intl.DateTimeFormat("es-UY", {
                      dateStyle: "medium",
                      timeStyle: "short",
                    }).format(new Date(entry.createdAt))}
                    {entry.action === "reopen" && entry.details?.reason
                      ? ` · Motivo: ${entry.details.reason}`
                      : ""}
                  </li>
                ))}
              </ol>
            ) : (
              <p className="mt-2 text-sm text-zinc-600">
                No hay transiciones registradas.
              </p>
            )}
          </div>
        </section>
      )}
    </div>
  );
}
