import { ApiError } from "@/shared/errors/api-error";
import type { CreateInvoice } from "./invoice.schemas";

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
