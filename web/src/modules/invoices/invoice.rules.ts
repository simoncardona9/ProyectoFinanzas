import { ApiError } from "@/shared/errors/api-error";
import type { CreateInvoice, CreateInvoiceCollection } from "./invoice.schemas";

export function calculateInvoiceIva(
  grossAmountMinor: number,
  ivaRateBasisPoints: number,
) {
  const divisor = 10_000 + ivaRateBasisPoints;
  const ivaAmountMinor = Math.floor(
    (grossAmountMinor * ivaRateBasisPoints + Math.floor(divisor / 2)) / divisor,
  );
  return { ivaAmountMinor, netAmountMinor: grossAmountMinor - ivaAmountMinor };
}

export function validateInvoice(values: CreateInvoice) {
  if (values.dueDate < values.serviceDate)
    throw new ApiError(
      422,
      "INVALID_DUE_DATE",
      "The invoice due date cannot be before its service date.",
    );
  const { ivaAmountMinor, netAmountMinor } = calculateInvoiceIva(
    values.grossAmountMinor,
    values.ivaRateBasisPoints,
  );
  if (ivaAmountMinor < 0 || netAmountMinor < 0)
    throw new ApiError(422, "INVALID_IVA", "Invalid IVA calculation.");
  return { ivaAmountMinor, netAmountMinor };
}

export function validateInvoiceSend(invoice: { status: string }) {
  if (invoice.status !== "draft")
    throw new ApiError(
      422,
      "INVALID_STATUS_TRANSITION",
      "Only draft invoices can be sent.",
    );
}

export function validateInvoiceCollection(
  invoice: { status: string; remainingAmountMinor: number; currency: string },
  account: { active: boolean; currency: string } | undefined,
  values: CreateInvoiceCollection,
) {
  if (!["sent", "partially_collected"].includes(invoice.status))
    throw new ApiError(
      422,
      "INVALID_STATUS_TRANSITION",
      "Only sent invoices can receive collections.",
    );
  if (values.amountMinor > invoice.remainingAmountMinor)
    throw new ApiError(
      422,
      "COLLECTION_EXCEEDS_BALANCE",
      "Collection exceeds the remaining invoice balance.",
    );
  if (!account || !account.active)
    throw new ApiError(422, "INVALID_ACCOUNT", "The account must be active.");
  if (account.currency !== invoice.currency)
    throw new ApiError(
      422,
      "CURRENCY_MISMATCH",
      "The collection account currency must match the invoice currency.",
    );
}

export function validateInvoiceCancellation(invoice: { status: string }) {
  if (!["draft", "sent"].includes(invoice.status))
    throw new ApiError(
      422,
      "INVALID_STATUS_TRANSITION",
      "Only unpaid invoices can be cancelled.",
    );
}
