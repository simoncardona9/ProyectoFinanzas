import { describe, expect, it } from "vitest";
import { buildFinancialCsv, spreadsheetSafe } from "./audit-export.rules";

describe("financial CSV export", () => {
  it("quotes cells and neutralizes spreadsheet formulas", () => {
    expect(spreadsheetSafe("=SUM(A1:A2)")).toBe("'=SUM(A1:A2)");
    expect(buildFinancialCsv([{ record_type: "transaction:expense", id: "one", date: "2026-09-01", description: 'A "quoted" value', amount_minor: 25 }])).toContain('"A ""quoted"" value"');
  });
});
