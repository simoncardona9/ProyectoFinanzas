"use client";
import { useState } from "react";
export function ResetTestData() {
  const [confirmation, setConfirmation] = useState("");
  const [message, setMessage] = useState("");
  async function reset() {
    const response = await fetch("/api/v1/household/reset-test-data", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ confirmation }),
    });
    setMessage(
      response.ok
        ? "Datos de prueba eliminados."
        : "Confirmación incorrecta o no fue posible eliminar los datos.",
    );
    if (response.ok) setConfirmation("");
  }
  return (
    <section className="mt-8 rounded-xl border border-red-200 bg-red-50 p-5">
      <h2 className="font-semibold text-red-950">Reiniciar datos de prueba</h2>
      <p className="mt-1 text-sm text-red-900">
        Elimina cuentas, categorías, movimientos, obligaciones y auditoría del
        hogar activo. Conserva acceso y configuración. Solo disponible en
        desarrollo local.
      </p>
      <input
        value={confirmation}
        onChange={(event) => setConfirmation(event.target.value)}
        placeholder="Escribe RESET TEST DATA"
        className="mt-3 w-full rounded border p-2"
      />
      <button
        type="button"
        disabled={confirmation !== "RESET TEST DATA"}
        onClick={() => void reset()}
        className="mt-2 rounded bg-red-700 px-3 py-2 text-white disabled:opacity-50"
      >
        Eliminar datos de prueba
      </button>
      {message && <p className="mt-2 text-sm text-red-900">{message}</p>}
    </section>
  );
}
