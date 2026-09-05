"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { ExpectedIncomeForm } from "./expected-income-form";

type CurrencySummary = {
  currency: "UYU" | "USD";
  currentCashMinor: number;
  pendingObligationsMinor: number;
  projectedCashMinor: number;
  collectedIncomeMinor: number;
  expectedIncomeMinor: number;
  oneOffIncomeMinor: number;
};
type Dashboard = {
  period: string;
  currencies: CurrencySummary[];
  capabilities: { expectedIncome: boolean; taxReserves: boolean };
  alerts: { currency: "UYU" | "USD"; projectedCashMinor: number }[];
};

const money = (amountMinor: number, currency: "UYU" | "USD") =>
  new Intl.NumberFormat("es-UY", { style: "currency", currency }).format(
    amountMinor / 100,
  );
const currentPeriod = new Date().toISOString().slice(0, 7);

export function DashboardSummary() {
  const [period, setPeriod] = useState(currentPeriod);
  const [dashboard, setDashboard] = useState<Dashboard | null>(null);
  const [message, setMessage] = useState("");
  const load = useCallback(async () => {
    try {
      setMessage("");
      const response = await fetch(`/api/v1/dashboard?period=${period}`);
      const body = await response.json();
      if (!response.ok)
        throw new Error(body.error?.message ?? "No se pudo cargar el panel.");
      setDashboard(body.data);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Error al cargar.");
    }
  }, [period]);
  useEffect(() => {
    const task = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(task);
  }, [load]);

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
        <p role="alert" className="text-sm text-red-700">
          {message}
        </p>
      )}
      {dashboard?.alerts.map((alert) => (
        <p
          key={alert.currency}
          role="alert"
          className="rounded-xl bg-amber-50 p-4 text-sm text-amber-900"
        >
          Atención: el efectivo proyectado en {alert.currency} (
          {money(alert.projectedCashMinor, alert.currency)}) está por debajo del
          colchón mínimo del hogar.
        </p>
      ))}
      <div className="grid gap-4 lg:grid-cols-2">
        {dashboard?.currencies.map((summary) => (
          <section
            key={summary.currency}
            className="rounded-xl border border-emerald-200 bg-emerald-50 p-5"
          >
            <h2 className="text-xl font-semibold">{summary.currency}</h2>
            <dl className="mt-4 grid gap-3 text-sm">
              <div className="flex justify-between gap-4">
                <dt>Efectivo disponible</dt>
                <dd className="font-semibold">
                  {money(summary.currentCashMinor, summary.currency)}
                </dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt>Ingresos cobrados del mes</dt>
                <dd>{money(summary.collectedIncomeMinor, summary.currency)}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt>Ingresos esperados</dt>
                <dd>{money(summary.expectedIncomeMinor, summary.currency)}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt>Ingresos únicos del mes</dt>
                <dd>{money(summary.oneOffIncomeMinor, summary.currency)}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt>Obligaciones pendientes</dt>
                <dd>
                  {money(summary.pendingObligationsMinor, summary.currency)}
                </dd>
              </div>
              <div className="flex justify-between gap-4 border-t border-emerald-200 pt-3">
                <dt className="font-semibold">Efectivo proyectado</dt>
                <dd className="font-semibold">
                  {money(summary.projectedCashMinor, summary.currency)}
                </dd>
              </div>
            </dl>
          </section>
        ))}
      </div>
      {dashboard && !dashboard.currencies.length && (
        <p className="rounded-xl border p-5 text-zinc-600">
          No hay cuentas ni movimientos para mostrar en este hogar.
        </p>
      )}
      <ExpectedIncomeForm period={period} onCreated={load} />
      <section className="rounded-xl border border-zinc-200 p-5 text-sm text-zinc-700">
        <h2 className="font-semibold">Cómo se calculan estos importes</h2>
        <p className="mt-2">
          El efectivo disponible se obtiene de las cuentas de efectivo y banco,
          sus saldos iniciales y sus movimientos pagados. La proyección resta
          las obligaciones abiertas que vencen en el mes elegido. Cada moneda se
          mantiene separada.
        </p>
        <div className="mt-4 flex flex-wrap gap-3">
          <Link className="text-emerald-700 underline" href="/transactions">
            Ver movimientos pagados
          </Link>
          <Link className="text-emerald-700 underline" href="/obligations">
            Ver obligaciones
          </Link>
        </div>
        <p className="mt-4 text-zinc-500">
          Las reservas fiscales se incorporarán en un corte posterior; no se
          muestran como cero para evitar confundir información aún no registrada
          con un importe real.
        </p>
      </section>
    </div>
  );
}
