import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

import { GroceryCatalogManager } from "./grocery-catalog-manager";

describe("GroceryCatalogManager", () => {
  afterEach(() => {
    cleanup();
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

  it("searches shared aliases and explicitly adopts a suggestion into the private catalog", async () => {
    let adopted = false;
    const fetchMock = vi.fn(async (input: string | URL, init?: RequestInit) => {
      const url = String(input);
      if (
        url === "/api/v1/groceries/shared-catalog" &&
        init?.method === "POST"
      ) {
        adopted = true;
        return new Response(JSON.stringify({ data: { id: "adoption-id" } }), {
          status: 201,
        });
      }
      if (url.startsWith("/api/v1/groceries/shared-catalog?"))
        return new Response(
          JSON.stringify({
            data: {
              query: "cañarias",
              normalizedQuery: "canarias",
              markets: [],
              products: [
                {
                  id: "public-product-id",
                  name: "Yerba Canarias 1 kg",
                  normalizedName: "yerba canarias 1 kg",
                  aliases: ["Yerba Cañarias 1-kg"],
                  possibleDuplicates: [
                    {
                      id: "public-product-alias-id",
                      name: "Yerba Cañarias 1-kg",
                    },
                  ],
                  adopted,
                },
              ],
              prices: [],
            },
          }),
          { status: 200 },
        );
      return new Response(JSON.stringify({ data: [] }), { status: 200 });
    });
    vi.stubGlobal("fetch", fetchMock);
    vi.spyOn(window, "confirm").mockReturnValue(true);

    const user = userEvent.setup();
    render(<GroceryCatalogManager canEdit />);
    await user.type(
      screen.getByPlaceholderText("Buscar mercado o producto"),
      "cañarias",
    );
    await user.click(
      screen.getByRole("button", { name: "Buscar compartidos" }),
    );

    expect(
      await screen.findByText("También publicado como: Yerba Cañarias 1-kg."),
    ).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Incorporar" }));

    expect(window.confirm).toHaveBeenCalledWith(
      expect.stringContaining("No se crearán transacciones"),
    );
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/v1/groceries/shared-catalog",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({
          sourceType: "product",
          publicSourceId: "public-product-id",
        }),
      }),
    );
    expect(await screen.findByText("Ya incorporado")).toBeInTheDocument();
  });
});
