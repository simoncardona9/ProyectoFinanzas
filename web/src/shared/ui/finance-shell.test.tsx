import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { FinanceShell } from "./finance-shell";

const refresh = vi.fn();
vi.mock("next/navigation", () => ({
  usePathname: () => "/overview",
  useRouter: () => ({ refresh }),
}));
vi.mock("./logout-button", () => ({
  LogoutButton: () => <button>Cerrar sesión</button>,
}));

describe("view modes", () => {
  beforeEach(() => {
    refresh.mockClear();
    vi.restoreAllMocks();
  });

  it("shows core navigation in Basic and persists an Advanced choice", async () => {
    const save = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify({ data: { viewMode: "advanced" } }), {
        status: 200,
      }),
    );
    render(
      <FinanceShell initialViewMode="basic">
        <p>Contenido</p>
      </FinanceShell>,
    );
    expect(
      screen.getByRole("link", { name: /Movimientos/ }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("link", { name: /Facturas/ }),
    ).not.toBeInTheDocument();

    fireEvent.change(screen.getByLabelText("Vista de la aplicación"), {
      target: { value: "advanced" },
    });
    await waitFor(() =>
      expect(
        screen.getByRole("link", { name: /Facturas/ }),
      ).toBeInTheDocument(),
    );
    expect(save).toHaveBeenCalledWith(
      "/api/v1/auth/view-mode",
      expect.objectContaining({
        method: "PATCH",
        body: JSON.stringify({ viewMode: "advanced" }),
      }),
    );
    expect(refresh).toHaveBeenCalled();
  });
});
