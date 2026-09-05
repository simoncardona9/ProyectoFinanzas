import { describe, expect, it } from "vitest";
import {
  createPaidTransactionSchema,
  listPaidTransactionsSchema,
  updatePaidTransactionSchema,
  voidTransactionSchema,
} from "./transaction.schemas";

const ids = {
  accountId: "11111111-1111-4111-8111-111111111111",
  categoryId: "22222222-2222-4222-8222-222222222222",
};

describe("transaction schemas", () => {
  it("accepts a paid USD transaction", () => {
    expect(
      createPaidTransactionSchema.safeParse({
        ...ids,
        date: "2026-09-05",
        type: "expense",
        status: "paid",
        amountMinor: 1_250,
        currency: "USD",
        description: "Servicio en dólares",
      }).success,
    ).toBe(true);
  });

  it("rejects a transaction marked recurring and one-off", () => {
    expect(
      createPaidTransactionSchema.safeParse({
        ...ids,
        date: "2026-09-05",
        type: "expense",
        status: "paid",
        amountMinor: 1_250,
        currency: "UYU",
        description: "Servicio",
        isRecurring: true,
        isOneOff: true,
      }).success,
    ).toBe(false);
  });

  it("parses explicit list filters and safe pagination defaults", () => {
    expect(
      listPaidTransactionsSchema.parse({
        currency: "USD",
        type: "income",
        isRecurring: "true",
        limit: "20",
        offset: "40",
      }),
    ).toMatchObject({
      currency: "USD",
      type: "income",
      isRecurring: true,
      limit: 20,
      offset: 40,
    });
    expect(listPaidTransactionsSchema.parse({})).toMatchObject({
      limit: 50,
      offset: 0,
    });
  });

  it("requires reasons for corrections and voids", () => {
    expect(
      updatePaidTransactionSchema.safeParse({
        ...ids,
        date: "2026-09-05",
        type: "expense",
        amountMinor: 1_250,
        currency: "UYU",
        description: "Servicio",
        changeReason: "",
      }).success,
    ).toBe(false);
    expect(voidTransactionSchema.safeParse({ reason: "" }).success).toBe(false);
    expect(
      voidTransactionSchema.safeParse({ reason: "Duplicado" }).success,
    ).toBe(true);
  });
});
