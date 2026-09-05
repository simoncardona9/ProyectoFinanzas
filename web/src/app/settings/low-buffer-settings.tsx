"use client";
import { FormEvent, useState } from "react";
type Household = {
  name: string;
  locale: string;
  defaultCurrency: string;
  timeZone: string;
  lowBufferMinor: number;
};
export function LowBufferSettings({ household }: { household: Household }) {
  const [value, setValue] = useState(String(household.lowBufferMinor));
  const [message, setMessage] = useState("");
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const response = await fetch("/api/v1/household", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...household, lowBufferMinor: Number(value) }),
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
        menor a este importe (centésimos).
      </p>
      <div className="mt-3 flex gap-2">
        <input
          type="number"
          min="0"
          value={value}
          onChange={(event) => setValue(event.target.value)}
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
