import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, expect, it, vi } from "vitest";
import { ObligationManager } from "./obligation-manager";

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});
it("accepts localized obligation payments and converts them to minor units", async () => {
  const fetch = vi.fn(async (url: string, init?: RequestInit) => {
    let data: unknown = [];
    if (url.includes("/accounts"))
      data = [{ id: "account", name: "Caja sintética", currency: "UYU" }];
    if (url.includes("/obligations?"))
      data = [
        {
          id: "obligation",
          description: "Obligación sintética",
          remainingAmountMinor: 123456,
          originalAmountMinor: 123456,
          currency: "UYU",
          dueDate: "2026-10-25",
          status: "pending",
          categoryName: "Servicios",
          recurrenceRule: null,
        },
      ];
    if (url.includes("/forecast?")) data = { currencies: [] };
    if (init?.method === "POST") data = {};
    return new Response(JSON.stringify({ data }));
  });
  vi.stubGlobal("fetch", fetch);
  vi.spyOn(window, "prompt").mockReturnValue("1.234,56");
  render(<ObligationManager canEdit />);
  const user = userEvent.setup();
  await user.click(await screen.findByRole("button", { name: /^Pagar$/ }));
  await waitFor(() =>
    expect(fetch).toHaveBeenCalledWith(
      "/api/v1/obligations/obligation/payments",
      expect.objectContaining({ method: "POST" }),
    ),
  );
  expect(window.prompt).toHaveBeenCalledWith(
    "Importe a pagar (ej. 1.234,56)",
    "1.234,56",
  );
  const payment = fetch.mock.calls.find(([, init]) => init?.method === "POST");
  expect(fetch).toHaveBeenCalledWith(
    "/api/v1/accounts?active=true",
    expect.anything(),
  );
  expect(JSON.parse(String(payment?.[1]?.body)).amountMinor).toBe(123456);
});
