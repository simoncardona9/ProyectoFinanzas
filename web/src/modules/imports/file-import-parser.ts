import { createHash } from "node:crypto";
import * as XLSX from "xlsx";
import type { FinanceImportBundle } from "./import.schemas";

type FileKind = "csv" | "excel";
type Field =
  | "date"
  | "type"
  | "amount"
  | "currency"
  | "account"
  | "category"
  | "description"
  | "status"
  | "dueDate"
  | "classification";
type Cell = { value: unknown; formula?: string };

export type MappingIssue = {
  sheet: string;
  row?: number;
  field?: string;
  severity: "warning" | "error";
  message: string;
};
export type FileMappingReport = {
  format: FileKind;
  source: Pick<
    FinanceImportBundle["source"],
    "name" | "originalContentHash" | "declaredPeriod"
  >;
  sheets: Array<{
    name: string;
    headerRow: number;
    mappedFields: Partial<Record<Field, string>>;
    hiddenRows: number;
    populatedRows: number;
  }>;
  issues: MappingIssue[];
  hasMacros: boolean;
};
export type FileConversion = {
  bundle: FinanceImportBundle;
  report: FileMappingReport;
};

/** The UI receives the report, never the internal canonical bundle. */
export function fileConversionPreviewData<T>(
  conversion: FileConversion,
  preview: T | null,
) {
  return { conversion: conversion.report, preview };
}

const aliases: Record<Field, string[]> = {
  date: ["date", "fecha", "fecha de pago", "fecha movimiento"],
  dueDate: ["due date", "vencimiento", "fecha vencimiento"],
  type: ["type", "tipo", "tipo movimiento"],
  amount: ["amount", "monto", "importe", "valor", "pendiente"],
  currency: ["currency", "moneda"],
  account: ["account", "cuenta", "medio", "cuenta medio"],
  category: ["category", "categoria", "categoría", "rubro"],
  description: [
    "description",
    "descripcion",
    "descripción",
    "detalle",
    "concepto",
  ],
  status: ["status", "estado"],
  classification: [
    "classification",
    "clasificacion",
    "clasificación",
    "prioridad",
  ],
};

function normalize(value: unknown) {
  return String(value ?? "")
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim()
    .toLocaleLowerCase("es");
}

function headerMap(values: unknown[]) {
  const mapped: Partial<Record<Field, number>> = {};
  const labels: Partial<Record<Field, string>> = {};
  values.forEach((value, index) => {
    const header = normalize(value);
    for (const [field, names] of Object.entries(aliases) as Array<
      [Field, string[]]
    >) {
      if (
        names.some((name) => normalize(name) === header) &&
        mapped[field] === undefined
      ) {
        mapped[field] = index;
        labels[field] = String(value);
      }
    }
  });
  return { mapped, labels, score: Object.keys(mapped).length };
}

function toMinor(value: unknown) {
  if (typeof value === "number")
    return Number.isSafeInteger(Math.round(value * 100))
      ? Math.round(value * 100)
      : undefined;
  const source = String(value ?? "")
    .trim()
    .replace(/\s/g, "");
  if (!source) return undefined;
  const normalized =
    source.includes(",") && source.includes(".")
      ? source.replace(/\./g, "").replace(",", ".")
      : source.replace(",", ".");
  const amount = Number(normalized.replace(/[^0-9.-]/g, ""));
  return Number.isFinite(amount) &&
    amount > 0 &&
    Number.isSafeInteger(Math.round(amount * 100))
    ? Math.round(amount * 100)
    : undefined;
}

function isoDate(value: unknown, date1904: boolean) {
  if (value instanceof Date && !Number.isNaN(value.valueOf()))
    return value.toISOString().slice(0, 10);
  if (typeof value === "number") {
    const date = XLSX.SSF.parse_date_code(value, { date1904 });
    if (!date) return undefined;
    return `${date.y}-${String(date.m).padStart(2, "0")}-${String(date.d).padStart(2, "0")}`;
  }
  const text = String(value ?? "").trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(text)) return text;
  const match = text.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/);
  if (match)
    return `${match[3]}-${match[2].padStart(2, "0")}-${match[1].padStart(2, "0")}`;
  return undefined;
}

function currency(value: unknown) {
  const result = normalize(value).toUpperCase();
  return result === "UYU" || result === "USD" ? result : undefined;
}

function transactionType(value: unknown, sheetName: string) {
  const label = normalize(value || sheetName);
  if (/ingreso|income|cobro|entrada/.test(label)) return "income" as const;
  if (/egreso|expense|gasto|salida|responsabilidad/.test(label))
    return "expense" as const;
  return undefined;
}

function lifecycle(value: unknown) {
  const label = normalize(value);
  if (!label || /pendiente|pending|planificado|planned/.test(label))
    return "pending" as const;
  return undefined;
}

function classification(value: unknown) {
  const label = normalize(value);
  if (/fijo|fixed/.test(label)) return "fixed" as const;
  if (/variable/.test(label)) return "variable" as const;
  if (/discrecional|discretionary/.test(label)) return "discretionary" as const;
  return undefined;
}

function cellValue(cell: Cell | undefined) {
  return cell?.value;
}

function convertRows(
  sheets: Array<{ name: string; rows: Cell[][]; hidden: Set<number> }>,
  source: FinanceImportBundle["source"],
  format: FileKind,
  hasMacros = false,
  date1904 = false,
): FileConversion {
  const issues: MappingIssue[] = [];
  const transactions: FinanceImportBundle["transactions"] = [];
  const obligations: FinanceImportBundle["obligations"] = [];
  const reportSheets: FileMappingReport["sheets"] = [];
  for (const sheet of sheets) {
    const candidates = sheet.rows
      .slice(0, 30)
      .map((row, index) => ({ index, row, ...headerMap(row.map(cellValue)) }));
    const header = candidates.sort((a, b) => b.score - a.score)[0];
    if (!header || header.score < 4) {
      if (
        sheet.rows.some((row) =>
          row.some((cell) => String(cellValue(cell) ?? "").trim()),
        )
      )
        issues.push({
          sheet: sheet.name,
          severity: "warning",
          message:
            "No se detectó una cabecera financiera inequívoca; la hoja no se convirtió.",
        });
      continue;
    }
    const hiddenRows = [...sheet.hidden].filter(
      (row) => row > header.index,
    ).length;
    let populatedRows = 0;
    reportSheets.push({
      name: sheet.name,
      headerRow: header.index + 1,
      mappedFields: header.labels,
      hiddenRows,
      populatedRows,
    });
    for (
      let rowIndex = header.index + 1;
      rowIndex < sheet.rows.length;
      rowIndex++
    ) {
      const row = sheet.rows[rowIndex];
      if (
        !row.some(
          (cell) => String(cellValue(cell) ?? "").trim() || cell.formula,
        )
      )
        continue;
      populatedRows++;
      const field = (name: Field) => row[header.mapped[name] ?? -1];
      const formulaFields = (Object.keys(header.mapped) as Field[]).filter(
        (name) => field(name)?.formula,
      );
      if (formulaFields.length) {
        issues.push({
          sheet: sheet.name,
          row: rowIndex + 1,
          severity: "error",
          message: `La fila usa fórmula en ${formulaFields.join(", ")}; su valor debe revisarse manualmente.`,
        });
        continue;
      }
      const rawStatus = cellValue(field("status"));
      const isObligation = /responsabilidad|obligation/.test(
        normalize(sheet.name),
      );
      const date = isoDate(
        cellValue(field(isObligation ? "dueDate" : "date")),
        date1904,
      );
      const amountMinor = toMinor(cellValue(field("amount")));
      const rowCurrency = currency(cellValue(field("currency")));
      const description = String(cellValue(field("description")) ?? "").trim();
      const category = String(cellValue(field("category")) ?? "").trim();
      if (!date || !amountMinor || !rowCurrency || !description || !category) {
        issues.push({
          sheet: sheet.name,
          row: rowIndex + 1,
          severity: "error",
          message:
            "Faltan fecha, monto, moneda, categoría o descripción requeridos.",
        });
        continue;
      }
      if (sheet.hidden.has(rowIndex))
        issues.push({
          sheet: sheet.name,
          row: rowIndex + 1,
          severity: "warning",
          message: "Fila oculta incluida para revisión.",
        });
      if (isObligation) {
        const rowClassification = classification(
          cellValue(field("classification")),
        );
        if (!rowClassification || (rawStatus && !lifecycle(rawStatus))) {
          issues.push({
            sheet: sheet.name,
            row: rowIndex + 1,
            severity: "error",
            message:
              "El estado o la clasificación no se puede mapear de forma segura.",
          });
          continue;
        }
        obligations.push({
          description,
          amountMinor,
          currency: rowCurrency,
          dueDate: date,
          category,
          classification: rowClassification,
          status: lifecycle(rawStatus) ?? "pending",
        });
      } else {
        const account = String(cellValue(field("account")) ?? "").trim();
        const type = transactionType(cellValue(field("type")), sheet.name);
        if (!account || !type) {
          issues.push({
            sheet: sheet.name,
            row: rowIndex + 1,
            severity: "error",
            message: "Falta una cuenta o un tipo de movimiento inequívoco.",
          });
          continue;
        }
        transactions.push({
          date,
          type,
          amountMinor,
          currency: rowCurrency,
          account,
          category,
          description,
          isRecurring: false,
          isOneOff: false,
        });
      }
    }
    reportSheets[reportSheets.length - 1].populatedRows = populatedRows;
  }
  if (hasMacros)
    issues.push({
      sheet: "workbook",
      severity: "warning",
      message: "El archivo contiene VBA/macros; no se ejecutaron.",
    });
  if (!transactions.length && !obligations.length)
    issues.push({
      sheet: "workbook",
      severity: "error",
      message: "No se encontraron filas financieras convertibles.",
    });
  return {
    bundle: {
      version: "finance-import/v1",
      source,
      accounts: [],
      categories: [],
      transactions,
      obligations,
      expectedIncome: [],
      debts: [],
      debtPayments: [],
      invoices: [],
      invoiceCollections: [],
      ivaReserves: [],
      exchangeRates: [],
    },
    report: {
      format,
      source: {
        name: source.name,
        originalContentHash: source.originalContentHash,
        declaredPeriod: source.declaredPeriod,
      },
      sheets: reportSheets,
      issues,
      hasMacros,
    },
  };
}

export function parseCsvImport(
  input: Uint8Array | ArrayBuffer,
  name: string,
  declaredPeriod?: string,
) {
  const bytes = input instanceof Uint8Array ? input : new Uint8Array(input);
  const text = new TextDecoder("utf-8", { fatal: false }).decode(bytes);
  const rows = XLSX.utils
    .sheet_to_json<Cell[]>(
      XLSX.read(text, { type: "string", raw: true }).Sheets.Sheet1,
      { header: 1, raw: true, defval: "" },
    )
    .map((row) => row.map((value) => ({ value })));
  return convertRows(
    [{ name: "CSV", rows, hidden: new Set() }],
    {
      type: "csv_upload",
      name,
      originalContentHash: createHash("sha256").update(bytes).digest("hex"),
      declaredPeriod,
    },
    "csv",
  );
}

export function parseExcelImport(
  input: Uint8Array | ArrayBuffer,
  name: string,
  declaredPeriod?: string,
) {
  const bytes = input instanceof Uint8Array ? input : new Uint8Array(input);
  const workbook = XLSX.read(bytes, {
    type: "array",
    cellFormula: true,
    cellDates: true,
    cellStyles: true,
  });
  const date1904 = workbook.Workbook?.WBProps?.date1904 === true;
  const sheets = workbook.SheetNames.map((name) => {
    const sheet = workbook.Sheets[name];
    const range = XLSX.utils.decode_range(sheet["!ref"] ?? "A1:A1");
    const rows: Cell[][] = [];
    for (let row = range.s.r; row <= range.e.r; row++) {
      const values: Cell[] = [];
      for (let column = range.s.c; column <= range.e.c; column++) {
        const cell = sheet[XLSX.utils.encode_cell({ r: row, c: column })];
        values.push({ value: cell?.v, formula: cell?.f });
      }
      rows.push(
        values.map((cell) =>
          typeof cell.value === "number" && !cell.formula
            ? { ...cell, value: cell.value }
            : cell,
        ),
      );
    }
    // Convert serial dates only in mapped date fields later; keep values raw here.
    void date1904;
    return {
      name,
      rows,
      hidden: new Set(
        (sheet["!rows"] ?? []).flatMap((row, index) =>
          row?.hidden ? [index] : [],
        ),
      ),
    };
  });
  return convertRows(
    sheets,
    {
      type: "excel_upload",
      name,
      originalContentHash: createHash("sha256").update(bytes).digest("hex"),
      declaredPeriod,
    },
    "excel",
    Boolean(workbook.vbaraw),
    date1904,
  );
}
