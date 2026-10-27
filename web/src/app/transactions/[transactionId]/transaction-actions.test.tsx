import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, expect, it, vi } from "vitest";
import { TransactionActions } from "./transaction-actions";

vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: vi.fn() }) }));
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});
it("displays localized correction amounts and submits integer minor units", async () => {
  const fetch = vi.fn<(url: string, init?: RequestInit) => Promise<Response>>(
    async () => new Response(JSON.stringify({ data: {} })),
  );
  vi.stubGlobal("fetch", fetch);
  render(
    <TransactionActions
      canEdit
      transaction={{
        id: "synthetic",
        date: "2026-10-15",
        type: "expense",
        amountMinor: 123456,
        currency: "UYU",
        accountId: "account",
        categoryId: "category",
        description: "Synthetic",
        isRecurring: false,
        isOneOff: false,
        status: "paid",
        voidedAt: null,
      }}
    />,
  );
  expect(screen.getByLabelText("Importe corregido")).toHaveValue("1.234,56");
  const user = userEvent.setup();
  await user.clear(screen.getByLabelText("Importe corregido"));
  await user.type(screen.getByLabelText("Importe corregido"), "12,34");
  await user.type(
    screen.getByPlaceholderText("Razón de la corrección"),
    "Corrección sintética",
  );
  await user.click(screen.getByRole("button", { name: "Guardar corrección" }));
  await waitFor(() => expect(fetch).toHaveBeenCalled());
  expect(JSON.parse(String(fetch.mock.calls[0][1]?.body)).amountMinor).toBe(
    1234,
  );
});
