import { describe, expect, it } from "vitest";
import * as XLSX from "xlsx";
import {
  fileConversionPreviewData,
  parseCsvImport,
  parseExcelImport,
} from "./file-import-parser";

describe("file import parsers", () => {
  it("maps aliased CSV transaction headers into the canonical bundle", () => {
    const conversion = parseCsvImport(
      new TextEncoder().encode("Fecha,Tipo,Monto,Moneda,Cuenta,Categoría,Descripción\n08/09/2026,Ingreso,\"1.234,50\",UYU,Caja,Salario,Cobro"),
      "septiembre.csv",
      "2026-09",
    );
    expect(conversion.report.issues).toEqual([]);
    expect(conversion.bundle.source).toMatchObject({ type: "csv_upload", name: "septiembre.csv", declaredPeriod: "2026-09" });
    expect(conversion.bundle.transactions).toEqual([{
      date: "2026-09-08", type: "income", amountMinor: 123450, currency: "UYU", account: "Caja", category: "Salario", description: "Cobro", isRecurring: false, isOneOff: false,
    }]);
  });

  it("includes hidden Excel rows, ignores empty formatted tails, and blocks formula amounts", () => {
    const sheet = XLSX.utils.aoa_to_sheet([
      ["Fecha", "Tipo", "Monto", "Moneda", "Cuenta", "Categoría", "Descripción"],
      [new Date("2026-09-08T00:00:00Z"), "Gasto", 15.5, "UYU", "Banco", "Hogar", "Compra"],
      [new Date("2026-09-09T00:00:00Z"), "Gasto", 20, "UYU", "Banco", "Hogar", "Oculta"],
      [new Date("2026-09-10T00:00:00Z"), "Gasto", 0, "UYU", "Banco", "Hogar", "Fórmula"],
      [], [], [],
    ]);
    sheet["!rows"] = [{}, {}, { hidden: true }];
    sheet.C4 = { t: "n", f: "SUM(C2:C3)", v: 35.5 };
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, sheet, "Caja");
    const conversion = parseExcelImport(XLSX.write(workbook, { type: "array", bookType: "xlsx" }), "caja.xlsx");
    expect(conversion.bundle.transactions).toHaveLength(2);
    expect(conversion.bundle.transactions[1].description).toBe("Oculta");
    expect(conversion.report.sheets[0]).toMatchObject({ name: "Caja", hiddenRows: 1, populatedRows: 3 });
    expect(conversion.report.issues).toEqual(expect.arrayContaining([
      expect.objectContaining({ row: 3, severity: "warning", message: expect.stringContaining("oculta") }),
      expect.objectContaining({ row: 4, severity: "error", message: expect.stringContaining("fórmula") }),
    ]));
  });

  it("reports unrecognizable populated sheets instead of silently importing them", () => {
    const conversion = parseCsvImport(new TextEncoder().encode("Notas,Valor\ntexto,10"), "notas.csv");
    expect(conversion.bundle.transactions).toEqual([]);
    expect(conversion.report.issues).toEqual(expect.arrayContaining([
      expect.objectContaining({ severity: "warning", message: expect.stringContaining("cabecera") }),
      expect.objectContaining({ severity: "error", message: expect.stringContaining("No se encontraron") }),
    ]));
  });

  it("returns the same mapping-report shape when conversion is blocked", () => {
    const conversion = parseCsvImport(new TextEncoder().encode("Notas,Valor\ntexto,10"), "notas.csv");
    const data = fileConversionPreviewData(conversion, null);
    expect(data.preview).toBeNull();
    expect(data.conversion).toMatchObject({ format: "csv", source: { name: "notas.csv" } });
    expect(data.conversion).not.toHaveProperty("bundle");
  });
});
