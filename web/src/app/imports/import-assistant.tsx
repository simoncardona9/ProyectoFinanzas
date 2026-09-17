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
  categories: [
    {
      name: "Ingresos importados",
      kind: "income",
    },
  ],
  accounts: [
    {
      name: "Efectivo importado",
      type: "cash",
      currency: "UYU",
      openingBalanceMinor: 0,
      openingBalanceDate: "2026-09-01",
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
    {
      transactionIncomeMinor: number;
      transactionExpenseMinor: number;
      obligationMinor: number;
      expectedIncomeMinor: number;
      debtOriginalMinor: number;
      debtPaymentMinor: number;
      invoiceGrossMinor: number;
      invoiceCollectionMinor: number;
      ivaReserveMinor: number;
    }
  >;
  reconciliation: {
    status: "not_required" | "required" | "matched" | "mismatched";
    reportName?: string;
    reviewer?: string;
    signedAt?: string;
    differences: Array<{
      currency: "UYU" | "USD";
      field: string;
      expectedMinor: number;
      actualMinor: number;
    }>;
  };
};
type ConversionReport = {
  format: string;
  hasMacros: boolean;
  source: {
    name?: string;
    originalContentHash?: string;
    declaredPeriod?: string;
  };
  sheets: Array<{
    name: string;
    headerRow: number;
    hiddenRows: number;
    populatedRows: number;
  }>;
  issues: Array<{
    sheet: string;
    row?: number;
    severity: "warning" | "error";
    message: string;
  }>;
};

export function ImportAssistant({ canEdit }: { canEdit: boolean }) {
  const [text, setText] = useState(() => JSON.stringify(example, null, 2));
  const [preview, setPreview] = useState<Preview>();
  const [message, setMessage] = useState("");
  const [idempotencyKey, setIdempotencyKey] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [declaredPeriod, setDeclaredPeriod] = useState("");
  const [conversion, setConversion] = useState<ConversionReport>();
  const previewBundle = async () => {
    if (!canEdit) return;
    setMessage("");
    setPreview(undefined);
    setConversion(undefined);
    let body: Record<string, unknown>;
    try {
      body = JSON.parse(text);
    } catch {
      setMessage("El contenido no es JSON válido.");
      return;
    }
    try {
      const key = crypto.randomUUID();
      const response = await fetch("/api/v1/imports/json/preview", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Idempotency-Key": key,
        },
        body: JSON.stringify(body),
      });
      const result = await response.json();
      if (!response.ok)
        throw new Error(
          result.error?.message ?? "No se pudo previsualizar el paquete.",
        );
      setPreview(result.data);
      setIdempotencyKey(key);
      setConfirmation("");
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
  const commit = async () => {
    if (!preview?.importId || !idempotencyKey || confirmation !== "IMPORT")
      return;
    try {
      const response = await fetch(
        `/api/v1/imports/${preview.importId}/commit`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Idempotency-Key": idempotencyKey,
          },
          body: JSON.stringify({ confirmation }),
        },
      );
      const result = await response.json();
      if (!response.ok)
        throw new Error(result.error?.message ?? "No se pudo confirmar.");
      setMessage(
        result.data.alreadyCommitted
          ? "Esta importación ya estaba confirmada; no se duplicó ningún registro."
          : `Importación confirmada: ${result.data.categoriesCreated} categoría(s), ${result.data.accountsCreated} cuenta(s), ${result.data.transactionsCreated} movimiento(s), ${result.data.obligationsCreated} obligación(es), ${result.data.expectedIncomeCreated} ingreso(s) esperado(s), ${result.data.debtsCreated} deuda(s), ${result.data.invoicesCreated} factura(s) y ${result.data.exchangeRatesCreated} tasa(s).`,
      );
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "Error al confirmar.",
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
  const uploadFile = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !canEdit) return;
    setMessage("");
    setPreview(undefined);
    setConversion(undefined);
    const extension = file.name.toLocaleLowerCase().split(".").pop();
    if (!extension || !["csv", "xlsx", "xlsm"].includes(extension)) {
      setMessage("Selecciona un archivo .csv, .xlsx o .xlsm.");
      return;
    }
    try {
      const key = crypto.randomUUID();
      const form = new FormData();
      form.set("file", file);
      if (declaredPeriod) form.set("declaredPeriod", declaredPeriod);
      const response = await fetch("/api/v1/imports/file/preview", {
        method: "POST",
        headers: { "Idempotency-Key": key },
        body: form,
      });
      const result = await response.json();
      if (!result.data)
        throw new Error(
          result.error?.message ?? "No se pudo convertir el archivo.",
        );
      setConversion(result.data.conversion);
      if (!response.ok) {
        setMessage(
          "La conversión requiere correcciones. No se creó ninguna previsualización ni se modificó ningún registro.",
        );
        return;
      }
      setPreview(result.data.preview);
      setIdempotencyKey(key);
      setConfirmation("");
      setMessage(
        "Archivo convertido y previsualizado. Revisa el mapeo antes de confirmar.",
      );
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "Error al convertir el archivo.",
      );
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
        <label className="cursor-pointer rounded border border-emerald-700 px-3 py-2 text-sm font-medium text-emerald-800">
          Convertir CSV/Excel
          <input
            className="sr-only"
            type="file"
            accept=".csv,text/csv,.xlsx,.xlsm,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel.sheet.macroEnabled.12"
            onChange={(event) => void uploadFile(event)}
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
      <label className="grid max-w-xs gap-1 text-sm text-zinc-700">
        Período declarado del archivo (opcional)
        <input
          type="month"
          value={declaredPeriod}
          onChange={(event) => setDeclaredPeriod(event.target.value)}
          className="rounded border border-zinc-300 p-2"
          disabled={!canEdit}
        />
      </label>
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
      {conversion && (
        <section className="rounded-xl border border-zinc-200 p-5 text-sm">
          <h2 className="font-semibold">
            Informe de conversión {conversion.format.toUpperCase()}
          </h2>
          <p className="mt-1 text-zinc-600">
            {conversion.hasMacros
              ? "Se detectaron macros; no se ejecutaron. "
              : "No se detectaron macros ejecutables. "}
            Las filas ocultas se incluyen para revisión y las filas solo
            formateadas se ignoran.
          </p>
          <p className="mt-1 break-all text-zinc-600">
            Archivo: {conversion.source.name ?? "sin nombre"} · SHA-256
            original: {conversion.source.originalContentHash ?? "no disponible"}
            {conversion.source.declaredPeriod
              ? ` · período declarado: ${conversion.source.declaredPeriod}`
              : ""}
          </p>
          <ul className="mt-3 list-disc pl-5">
            {conversion.sheets.map((sheet) => (
              <li key={sheet.name}>
                {sheet.name}: cabecera en fila {sheet.headerRow},{" "}
                {sheet.populatedRows} fila(s) poblada(s), {sheet.hiddenRows}{" "}
                oculta(s).
              </li>
            ))}
          </ul>
          {!!conversion.issues.length && (
            <ul className="mt-3 divide-y rounded border border-amber-200">
              {conversion.issues.map((issue, index) => (
                <li
                  key={`${issue.sheet}-${issue.row}-${index}`}
                  className={
                    issue.severity === "error"
                      ? "p-2 text-red-700"
                      : "p-2 text-amber-800"
                  }
                >
                  {issue.sheet}
                  {issue.row ? ` · fila ${issue.row}` : ""}: {issue.message}
                </li>
              ))}
            </ul>
          )}
        </section>
      )}
      {preview && (
        <section className="rounded-xl border border-zinc-200 p-5">
          <h2 className="text-lg font-semibold">
            Resultado de la previsualización
          </h2>
          <p className="mt-1 text-sm text-zinc-600">
            {preview.errors} fila(s) con errores. Nada se incorpora a los
            registros financieros antes de la confirmación explícita.
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
                <br />
                Obligaciones:{" "}
                {formatMinor(
                  preview.totals[currency].obligationMinor,
                  currency,
                )}
                <br />
                Ingresos esperados:{" "}
                {formatMinor(
                  preview.totals[currency].expectedIncomeMinor,
                  currency,
                )}
                <br />
                Deuda original:{" "}
                {formatMinor(
                  preview.totals[currency].debtOriginalMinor,
                  currency,
                )}
                <br />
                Cobranzas de facturas:{" "}
                {formatMinor(
                  preview.totals[currency].invoiceCollectionMinor,
                  currency,
                )}
                <br />
                IVA protegido:{" "}
                {formatMinor(
                  preview.totals[currency].ivaReserveMinor,
                  currency,
                )}
              </div>
            ))}
          </div>
          {preview.reconciliation.status !== "not_required" && (
            <section
              className={`mt-4 rounded p-3 text-sm ${preview.reconciliation.status === "matched" ? "bg-emerald-50 text-emerald-900" : "bg-red-50 text-red-900"}`}
            >
              <strong>
                Conciliación de agosto de 2026:{" "}
                {preview.reconciliation.status === "matched"
                  ? "coincide"
                  : "pendiente o con diferencias"}
                .
              </strong>
              {preview.reconciliation.reportName && (
                <p className="mt-1">
                  Informe: {preview.reconciliation.reportName} · revisor:{" "}
                  {preview.reconciliation.reviewer} · firmado:{" "}
                  {preview.reconciliation.signedAt}
                </p>
              )}
              {preview.reconciliation.status === "required" && (
                <p className="mt-1">
                  Se necesita un informe corregido, con hash y firma responsable
                  antes de confirmar.
                </p>
              )}
              {!!preview.reconciliation.differences.length && (
                <ul className="mt-2 list-disc pl-5">
                  {preview.reconciliation.differences.map((difference) => (
                    <li key={`${difference.currency}-${difference.field}`}>
                      {difference.currency} · {difference.field}: informe{" "}
                      {formatMinor(
                        difference.expectedMinor,
                        difference.currency,
                      )}
                      , importación{" "}
                      {formatMinor(difference.actualMinor, difference.currency)}
                    </li>
                  ))}
                </ul>
              )}
            </section>
          )}
          {!!preview.warnings.length && (
            <ul className="mt-4 list-disc pl-5 text-sm text-amber-800">
              {preview.warnings.map((warning) => (
                <li key={warning}>{warning}</li>
              ))}
            </ul>
          )}
          {!preview.errors &&
            !preview.warnings.length &&
            preview.reconciliation.status !== "required" &&
            preview.reconciliation.status !== "mismatched" &&
            canEdit && (
              <div className="mt-5 grid gap-2 rounded bg-amber-50 p-4 text-sm text-amber-900">
                <label htmlFor="import-confirmation">
                  Escribe <strong>IMPORT</strong> para confirmar las filas
                  revisadas. Cuentas y categorías se crean antes que los
                  movimientos, obligaciones e ingresos esperados dependientes.
                </label>
                <div className="flex flex-wrap gap-2">
                  <input
                    id="import-confirmation"
                    value={confirmation}
                    onChange={(event) => setConfirmation(event.target.value)}
                    className="rounded border border-amber-300 bg-white p-2"
                    placeholder="IMPORT"
                  />
                  <button
                    type="button"
                    disabled={confirmation !== "IMPORT"}
                    onClick={() => void commit()}
                    className="rounded bg-emerald-700 px-3 py-2 font-medium text-white disabled:opacity-50"
                  >
                    Confirmar importación
                  </button>
                </div>
              </div>
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
