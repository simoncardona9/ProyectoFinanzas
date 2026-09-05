"use client";
import { FormEvent, useState } from "react";
import {
  formatMoneyInput,
  parseMoneyToMinor,
} from "@/shared/money/parse-money";
type Household = {
  name: string;
  locale: string;
  defaultCurrency: string;
  timeZone: string;
  lowBufferMinor: number;
};
export function LowBufferSettings({ household }: { household: Household }) {
  const [value, setValue] = useState(() =>
    new Intl.NumberFormat("es-UY", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(household.lowBufferMinor / 100),
  );
  const [message, setMessage] = useState("");
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const lowBufferMinor = parseMoneyToMinor(value);
    if (lowBufferMinor === undefined || lowBufferMinor < 0) {
      setMessage("Ingresa un importe válido, por ejemplo 1.234,56.");
      return;
    }
    const response = await fetch("/api/v1/household", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...household, lowBufferMinor }),
    });
    setMessage(
      response.ok
        ? "Colchón mínimo actualizado."
        : "No se pudo actualizar el colchón mínimo.",
    );
  }
  return (
    <form onSubmit={submit} className="mt-8 rounded-xl border p-5">
      <h2 className="font-semibold">Alerta de colchón mínimo</h2>
      <p className="mt-1 text-sm text-zinc-600">
        Alerta en {household.defaultCurrency} cuando el efectivo proyectado sea
        menor a este importe.
      </p>
      <div className="mt-3 flex gap-2">
        <input
          type="text"
          inputMode="decimal"
          value={value}
          onChange={(event) => setValue(formatMoneyInput(event.target.value))}
          onFocus={(event) => event.currentTarget.select()}
          onBlur={() => {
            const minor = parseMoneyToMinor(value);
            if (minor !== undefined)
              setValue(
                new Intl.NumberFormat("es-UY", {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                }).format(minor / 100),
              );
          }}
          placeholder="Importe (ej. 1.234,56)"
          className="rounded border p-2"
        />
        <button className="rounded bg-emerald-700 px-3 py-2 text-white">
          Guardar
        </button>
      </div>
      {message && <p className="mt-2 text-sm text-emerald-800">{message}</p>}
    </form>
  );
}
