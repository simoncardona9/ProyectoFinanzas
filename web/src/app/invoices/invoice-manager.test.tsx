import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { InvoiceManager } from "./invoice-manager";

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

it("opens a report-linked invoice with its server-scoped detail already selected", async () => {
  vi.stubGlobal(
    "fetch",
    vi.fn(async () => new Response(JSON.stringify({ data: [] }))),
  );
  render(
    <InvoiceManager
      canEdit={false}
      initialDetail={{
        invoice: {
          id: "synthetic-invoice",
          clientName: "Cliente de informe",
          description: "Factura sintética",
          serviceDate: "2026-10-15",
          dueDate: "2026-10-25",
          grossAmountMinor: 12200,
          netAmountMinor: 10000,
          ivaRateBasisPoints: 2200,
          ivaAmountMinor: 2200,
          currency: "UYU",
          status: "collected",
          remainingAmountMinor: 0,
        },
        collections: [],
      }}
    />,
  );
  expect(
    screen.getByRole("heading", { name: "Detalle de factura" }),
  ).toBeInTheDocument();
  expect(
    screen.getByText(/Cliente de informe · pendiente/),
  ).toBeInTheDocument();
  expect(await screen.findByText("Aún no hay cobranzas.")).toBeInTheDocument();
});
