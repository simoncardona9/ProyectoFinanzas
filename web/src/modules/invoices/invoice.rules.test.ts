import { describe, expect, it } from "vitest";
import { ApiError } from "@/shared/errors/api-error";
import {
  calculateCollectionIvaReserve,
  calculateInvoiceIva,
  validateInvoice,
} from "./invoice.rules";

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

describe("calculateCollectionIvaReserve", () => {
  it("allocates partial collections cumulatively and preserves the captured IVA", () => {
    const invoice = {
      grossAmountMinor: 10,
      ivaAmountMinor: 3,
      remainingAmountMinor: 10,
    };
    const first = calculateCollectionIvaReserve(invoice, 5);
    const second = calculateCollectionIvaReserve(
      { ...invoice, remainingAmountMinor: 5 },
      5,
    );
    expect([first, second]).toEqual([2, 1]);
    expect(first + second).toBe(invoice.ivaAmountMinor);
  });

  it("uses exact integer arithmetic for large invoice amounts", () => {
    expect(
      calculateCollectionIvaReserve(
        {
          grossAmountMinor: 2_000_000_000,
          ivaAmountMinor: 1_000_000_000,
          remainingAmountMinor: 2_000_000_000,
        },
        1_000_000_001,
      ),
    ).toBe(500_000_001);
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
