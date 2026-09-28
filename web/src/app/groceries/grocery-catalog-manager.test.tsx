import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

import { GroceryCatalogManager } from "./grocery-catalog-manager";

describe("GroceryCatalogManager", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

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

  it("requires confirmation and publishes an explicit private catalog source", async () => {
    const fetchMock = vi.fn(async (input: string | URL, init?: RequestInit) => {
      if (init?.method === "POST")
        return new Response(
          JSON.stringify({ data: { id: "publication-id" } }),
          { status: 201 },
        );
      const url = String(input);
      const data = url.endsWith("/markets")
        ? [
            {
              id: "market-id",
              name: "Mercado sintético",
              normalizedName: "mercado sintetico",
            },
          ]
        : [];
      return new Response(JSON.stringify({ data }), { status: 200 });
    });
    vi.stubGlobal("fetch", fetchMock);
    vi.spyOn(window, "confirm").mockReturnValue(true);

    const user = userEvent.setup();
    render(<GroceryCatalogManager canEdit />);

    await user.click(await screen.findByRole("button", { name: "Publicar" }));

    expect(window.confirm).toHaveBeenCalledWith(
      expect.stringContaining("Se compartirá únicamente el nombre"),
    );
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/v1/groceries/publications",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({ sourceType: "market", sourceId: "market-id" }),
      }),
    );
    await waitFor(() =>
      expect(
        screen.getByText(
          "Dato publicado sin identidad del hogar ni información de compras o planes.",
        ),
      ).toBeInTheDocument(),
    );
  });
});
