import { describe, expect, it } from "vitest";
import { ApiError } from "@/shared/errors/api-error";
import { validateDebt } from "./debt.rules";

describe("validateDebt", () => {
  it("rejects a non-positive original balance", () => {
    expect(() =>
      validateDebt({
        creditorName: "Banco de prueba",
        description: "Tarjeta",
        amountMinor: 0,
        currency: "USD",
        incurredDate: "2026-09-06",
      }),
    ).toThrow(ApiError);
  });
});
