import { describe, expect, it } from "vitest";
import { ApiError } from "@/shared/errors/api-error";
import {
  validateInvoiceCancellation,
  validateInvoiceCollection,
  validateInvoiceSend,
} from "./invoice.rules";

const invoice = {
  status: "sent",
  remainingAmountMinor: 10_000,
  currency: "USD",
};
const collection = {
  amountMinor: 2_500,
  accountId: "00000000-0000-4000-8000-000000000001",
  paidDate: "2026-09-07",
};

describe("invoice lifecycle rules", () => {
  it("allows sending only a draft invoice", () => {
    expect(() => validateInvoiceSend({ status: "draft" })).not.toThrow();
    expect(() => validateInvoiceSend(invoice)).toThrow(ApiError);
  });

  it("allows a same-currency partial collection", () => {
    expect(() =>
      validateInvoiceCollection(
        invoice,
        { active: true, currency: "USD" },
        collection,
      ),
    ).not.toThrow();
  });

  it("rejects over-collection and mixed currencies", () => {
    expect(() =>
      validateInvoiceCollection(
        invoice,
        { active: true, currency: "USD" },
        { ...collection, amountMinor: 10_001 },
      ),
    ).toThrow(ApiError);
    expect(() =>
      validateInvoiceCollection(
        invoice,
        { active: true, currency: "UYU" },
        collection,
      ),
    ).toThrow(ApiError);
  });

  it("does not allow cancelling an invoice with a collection", () => {
    expect(() => validateInvoiceCancellation({ status: "sent" })).not.toThrow();
    expect(() =>
      validateInvoiceCancellation({ status: "partially_collected" }),
    ).toThrow(ApiError);
  });
});
