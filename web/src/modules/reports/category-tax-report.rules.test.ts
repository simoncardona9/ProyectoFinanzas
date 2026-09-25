import { describe, expect, it } from "vitest";
import { buildCategoryTaxReport } from "./category-tax-report.rules";

describe("buildCategoryTaxReport", () => {
  it("groups paid categorized expenses and keeps UYU and USD tax figures separate", () => {
    const report = buildCategoryTaxReport(
      [
        {
          id: "rent",
          date: "2026-09-02",
          amountMinor: 500,
          currency: "UYU",
          description: "Alquiler",
          categoryId: "housing",
          categoryName: "Vivienda",
        },
        {
          id: "food",
          date: "2026-09-03",
          amountMinor: 200,
          currency: "UYU",
          description: "Comida",
          categoryId: "food",
          categoryName: "Alimentación",
        },
        {
          id: "usd",
          date: "2026-09-04",
          amountMinor: 100,
          currency: "USD",
          description: "Servicio",
          categoryId: "services",
          categoryName: "Servicios",
        },
      ],
      [
        {
          id: "invoice",
          serviceDate: "2026-09-01",
          currency: "UYU",
          grossAmountMinor: 1_220,
          netAmountMinor: 1_000,
          ivaAmountMinor: 220,
        },
      ],
      [
        {
          id: "collection",
          invoiceId: "invoice",
          date: "2026-09-05",
          currency: "UYU",
          amountMinor: 1_220,
        },
      ],
      [
        {
          id: "reserve",
          invoiceId: "invoice",
          date: "2026-09-05",
          currency: "UYU",
          amountMinor: 220,
        },
      ],
      [
        {
          id: "settlement",
          invoiceId: "invoice",
          date: "2026-09-08",
          currency: "UYU",
          amountMinor: 100,
        },
      ],
      { from: "2026-09-01", to: "2026-09-30", groupBy: "category" },
    );

    expect(report.categoryRows).toHaveLength(3);
    expect(
      report.categoryRows.find((row) => row.key === "housing")?.totalMinor,
    ).toBe(500);
    expect(report.taxTotalsByCurrency.UYU).toMatchObject({
      invoicedGrossMinor: 1_220,
      invoicedNetMinor: 1_000,
      invoicedIvaMinor: 220,
      collectedGrossMinor: 1_220,
      reservedIvaMinor: 220,
      settledIvaMinor: 100,
    });
    expect(report.taxTotalsByCurrency.USD).toEqual({
      invoicedGrossMinor: 0,
      invoicedNetMinor: 0,
      invoicedIvaMinor: 0,
      collectedGrossMinor: 0,
      reservedIvaMinor: 0,
      settledIvaMinor: 0,
    });
    expect(report.categoryRows[0].transactions[0].href).toContain(
      "/transactions/",
    );
  });

  it("supports month and year grouping without combining currencies", () => {
    const expense = {
      id: "one",
      date: "2026-09-02",
      amountMinor: 50,
      currency: "USD" as const,
      description: "Servicio",
      categoryId: "services",
      categoryName: "Servicios",
    };
    expect(
      buildCategoryTaxReport([expense], [], [], [], [], {
        from: "2026-01-01",
        to: "2026-12-31",
        groupBy: "month",
      }).categoryRows[0],
    ).toMatchObject({ key: "2026-09", currency: "USD" });
    expect(
      buildCategoryTaxReport([expense], [], [], [], [], {
        from: "2026-01-01",
        to: "2026-12-31",
        groupBy: "year",
      }).categoryRows[0],
    ).toMatchObject({ key: "2026", currency: "USD" });
  });
});
