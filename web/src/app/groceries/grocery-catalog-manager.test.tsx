import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

import { GroceryCatalogManager } from "./grocery-catalog-manager";

describe("GroceryCatalogManager", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("retains the submitted form element across an async private-market request", async () => {
    const fetchMock = vi.fn(
      async () => new Response(JSON.stringify({ data: [] }), { status: 200 }),
    );
    vi.stubGlobal("fetch", fetchMock);

    const user = userEvent.setup();
    render(<GroceryCatalogManager canEdit />);

    await user.type(
      screen.getByPlaceholderText("Ej. Feria del barrio"),
      "Mercado sintético",
    );
    await user.click(screen.getByRole("button", { name: "Guardar mercado" }));

    await waitFor(() =>
      expect(
        screen.getByText("Mercado guardado como dato privado del hogar."),
      ).toBeInTheDocument(),
    );
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/v1/groceries/markets",
      expect.objectContaining({ method: "POST" }),
    );
  });
});
