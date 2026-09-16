import fs from "node:fs";
import path from "node:path";
import * as XLSX from "xlsx";

const fixtureDirectory = path.resolve(
  import.meta.dirname,
  "../../docs/fixtures/import-file-conversion",
);
fs.mkdirSync(fixtureDirectory, { recursive: true });

const headers = [
  "Fecha",
  "Tipo",
  "Monto",
  "Moneda",
  "Cuenta",
  "Categoría",
  "Descripción",
];

function writeWorkbook(filename, rows, configureSheet) {
  const sheet = XLSX.utils.aoa_to_sheet([headers, ...rows]);
  configureSheet?.(sheet);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, sheet, "Caja");
  XLSX.writeFile(workbook, path.join(fixtureDirectory, filename));
}

fs.writeFileSync(
  path.join(fixtureDirectory, "slice-8.5-valid.csv"),
  [
    headers.join(","),
    '08/09/2026,Ingreso,"1.234,50",UYU,Caja prueba CSV,Ingresos prueba CSV,Cobro sintético CSV',
    "09/09/2026,Gasto,250,UYU,Caja prueba CSV,Gastos prueba CSV,Compra sintética CSV",
    "",
  ].join("\n"),
  "utf8",
);

writeWorkbook(
  "slice-8.5-formula.xlsx",
  [["10/09/2026", "Gasto", 125, "UYU", "Caja prueba CSV", "Gastos prueba CSV", "Prueba de fórmula"]],
  (sheet) => {
    sheet.C2 = { t: "n", f: "100+25", v: 125 };
  },
);

writeWorkbook(
  "slice-8.5-hidden-row.xlsx",
  [
    ["10/09/2026", "Ingreso", 100, "UYU", "Caja prueba CSV", "Ingresos prueba CSV", "Fila visible"],
    ["11/09/2026", "Gasto", 50, "UYU", "Caja prueba CSV", "Gastos prueba CSV", "Fila oculta"],
    [],
    [],
  ],
  (sheet) => {
    sheet["!rows"] = [{}, {}, { hidden: true }];
  },
);

console.log(`Created acceptance fixtures in ${fixtureDirectory}`);
