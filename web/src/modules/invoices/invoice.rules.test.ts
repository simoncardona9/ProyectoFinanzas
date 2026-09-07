import { describe, expect, it } from "vitest";
import { ApiError } from "@/shared/errors/api-error";
import { calculateInvoiceIva, validateInvoice } from "./invoice.rules";

describe("calculateInvoiceIva", () => {
  it("extracts IVA from a gross amount and preserves the minor-unit total", () => {
    expect(calculateInvoiceIva(12_200, 2_200)).toEqual({
      ivaAmountMinor: 2_200,
      netAmountMinor: 10_000,
    });
  });

  it("rounds the IVA share half up to a minor unit", () => {
    expect(calculateInvoiceIva(3, 10_000)).toEqual({
      ivaAmountMinor: 2,
      netAmountMinor: 1,
    });
  });
});

describe("validateInvoice", () => {
  it("rejects a due date before the service date", () => {
    expect(() =>
      validateInvoice({
        clientName: "Cliente de prueba",
        description: "Clase",
        serviceDate: "2026-09-07",
        dueDate: "2026-09-06",
        grossAmountMinor: 12_200,
        ivaRateBasisPoints: 2_200,
        currency: "UYU",
      }),
    ).toThrow(ApiError);
  });
});
