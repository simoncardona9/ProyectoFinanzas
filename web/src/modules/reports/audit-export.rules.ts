type ExportValue = string | number | boolean | null | undefined;

export type FinancialExportRow = Record<string, ExportValue>;

const headers = [
  "record_type",
  "id",
  "date",
  "status",
  "currency",
  "amount_minor",
  "account_id",
  "account_name",
  "category_id",
  "category_name",
  "counterparty",
  "description",
  "related_record_id",
];

/** Prevent formula interpretation when a CSV is opened by a spreadsheet. */
export function spreadsheetSafe(value: ExportValue): string {
  const text = value === null || value === undefined ? "" : String(value);
  return /^[=+\-@]/.test(text) ? `'${text}` : text;
}

function csvCell(value: ExportValue) {
  return `"${spreadsheetSafe(value).replaceAll('"', '""')}"`;
}

export function buildFinancialCsv(rows: FinancialExportRow[]): string {
  return [
    headers.map(csvCell).join(","),
    ...rows.map((row) => headers.map((header) => csvCell(row[header])).join(",")),
  ].join("\r\n");
}
