"use client";
import { ChangeEvent, useState } from "react";

function formatMinor(amountMinor: number, currency: string) {
  return new Intl.NumberFormat("es-UY", {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
  }).format(amountMinor / 100);
}

const example = {
  version: "finance-import/v1",
  source: { type: "json_paste" },
  transactions: [
    {
      date: "2026-09-08",
      type: "expense",
      amountMinor: 125050,
      currency: "UYU",
      account: "Banco República",
      category: "Hogar y supermercado",
      description: "Compra semanal",
    },
  ],
};
type Preview = {
  importId?: string;
  errors: number;
  warnings: string[];
  rows: Array<{
    entity: string;
    row: number;
    status: string;
    errors: Array<{ field: string; message: string }>;
  }>;
  totals: Record<
    "UYU" | "USD",
    { transactionIncomeMinor: number; transactionExpenseMinor: number }
  >;
};

export function ImportAssistant({ canEdit }: { canEdit: boolean }) {
  const [text, setText] = useState(() => JSON.stringify(example, null, 2));
  const [preview, setPreview] = useState<Preview>();
  const [message, setMessage] = useState("");
  const previewBundle = async () => {
    if (!canEdit) return;
    setMessage("");
    setPreview(undefined);
    let body: Record<string, unknown>;
    try {
      body = JSON.parse(text);
    } catch {
      setMessage("El contenido no es JSON válido.");
      return;
    }
    try {
      const response = await fetch("/api/v1/imports/json/preview", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Idempotency-Key": crypto.randomUUID(),
        },
        body: JSON.stringify(body),
      });
      const result = await response.json();
      if (!response.ok)
        throw new Error(
          result.error?.message ?? "No se pudo previsualizar el paquete.",
        );
      setPreview(result.data);
      setMessage(
        result.data.errors
          ? "Revisa las filas marcadas antes de continuar."
          : "Previsualización creada. Aún no se modificó ningún registro.",
      );
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "Error al previsualizar.",
      );
    }
  };
  const upload = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!file.name.toLowerCase().endsWith(".json")) {
      setMessage("Selecciona un archivo .json.");
      return;
    }
    try {
      const parsed = JSON.parse(await file.text());
      parsed.source = {
        ...(parsed.source ?? {}),
        type: "json_upload",
        name: file.name,
      };
      setText(JSON.stringify(parsed, null, 2));
      setMessage(
        "Archivo cargado. Revisa el contenido y solicita la previsualización.",
      );
    } catch {
      setMessage("El archivo no contiene JSON válido.");
    }
  };
  return (
    <div className="mt-6 grid gap-5">
      {!canEdit && (
        <p className="rounded bg-amber-50 p-3 text-sm text-amber-900">
          Tu rol permite consultar, pero no crear previsualizaciones de
          importación.
        </p>
      )}
      <div className="flex flex-wrap gap-3">
        <label className="cursor-pointer rounded border border-emerald-700 px-3 py-2 text-sm font-medium text-emerald-800">
          Cargar .json
          <input
            className="sr-only"
            type="file"
            accept="application/json,.json"
            onChange={(event) => void upload(event)}
            disabled={!canEdit}
          />
        </label>
        <button
          type="button"
          className="rounded border border-zinc-300 px-3 py-2 text-sm"
          onClick={() => setText(JSON.stringify(example, null, 2))}
        >
          Restaurar ejemplo
        </button>
      </div>
      <textarea
        aria-label="Paquete JSON"
        value={text}
        onChange={(event) => setText(event.target.value)}
        spellCheck={false}
        className="min-h-80 rounded border border-zinc-300 p-3 font-mono text-sm"
        disabled={!canEdit}
      />
      <button
        type="button"
        onClick={() => void previewBundle()}
        disabled={!canEdit}
        className="w-fit rounded bg-emerald-700 px-4 py-2 font-medium text-white disabled:opacity-50"
      >
        Validar y previsualizar
      </button>
      {message && (
        <p className="rounded bg-emerald-50 p-3 text-sm text-emerald-900">
          {message}
        </p>
      )}
      {preview && (
        <section className="rounded-xl border border-zinc-200 p-5">
          <h2 className="text-lg font-semibold">
            Resultado de la previsualización
          </h2>
          <p className="mt-1 text-sm text-zinc-600">
            {preview.errors} fila(s) con errores. Las filas diferidas pertenecen
            a entregas posteriores y no se pueden confirmar todavía.
          </p>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            {(["UYU", "USD"] as const).map((currency) => (
              <div key={currency} className="rounded bg-zinc-50 p-3 text-sm">
                <strong>{currency}</strong>
                <br />
                Ingresos:{" "}
                {formatMinor(
                  preview.totals[currency].transactionIncomeMinor,
                  currency,
                )}
                <br />
                Egresos:{" "}
                {formatMinor(
                  preview.totals[currency].transactionExpenseMinor,
                  currency,
                )}
              </div>
            ))}
          </div>
          {!!preview.warnings.length && (
            <ul className="mt-4 list-disc pl-5 text-sm text-amber-800">
              {preview.warnings.map((warning) => (
                <li key={warning}>{warning}</li>
              ))}
            </ul>
          )}
          <ul className="mt-4 divide-y">
            {preview.rows.map((row) => (
              <li key={`${row.entity}-${row.row}`} className="py-3 text-sm">
                <strong>
                  {row.entity} · fila {row.row}
                </strong>{" "}
                <span
                  className={
                    row.status === "valid" ? "text-emerald-700" : "text-red-700"
                  }
                >
                  — {row.status}
                </span>
                {row.errors.map((error) => (
                  <p
                    key={`${error.field}-${error.message}`}
                    className="mt-1 text-red-700"
                  >
                    {error.field}: {error.message}
                  </p>
                ))}
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
