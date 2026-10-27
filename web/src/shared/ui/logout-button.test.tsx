import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, expect, it, vi } from "vitest";
import { LogoutButton } from "./logout-button";

const router = vi.hoisted(() => ({ replace: vi.fn(), refresh: vi.fn() }));
vi.mock("next/navigation", () => ({ useRouter: () => router }));
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  vi.clearAllMocks();
});

it("only navigates away after the server confirms logout", async () => {
  let resolve!: (response: Response) => void;
  const fetch = vi.fn(
    () =>
      new Promise<Response>((done) => {
        resolve = done;
      }),
  );
  vi.stubGlobal("fetch", fetch);
  render(<LogoutButton />);
  await userEvent.click(screen.getByRole("button", { name: "Cerrar sesión" }));
  expect(
    screen.getByRole("button", { name: "Cerrando sesión…" }),
  ).toBeDisabled();
  expect(router.replace).not.toHaveBeenCalled();
  resolve(new Response("{}", { status: 200 }));
  await waitFor(() => expect(router.replace).toHaveBeenCalledWith("/login"));
  expect(fetch).toHaveBeenCalledWith("/api/v1/auth/logout", { method: "POST" });
});

it("keeps the page available and allows retry when logout fails", async () => {
  vi.stubGlobal(
    "fetch",
    vi.fn().mockResolvedValue(new Response("{}", { status: 500 })),
  );
  render(<LogoutButton />);
  await userEvent.click(screen.getByRole("button", { name: "Cerrar sesión" }));
  expect(await screen.findByRole("alert")).toHaveTextContent(
    "No se pudo cerrar la sesión",
  );
  expect(screen.getByRole("button", { name: "Cerrar sesión" })).toBeEnabled();
  expect(router.replace).not.toHaveBeenCalled();
});
