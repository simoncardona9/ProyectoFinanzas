import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import Home from "../app/page";

const { checkDatabaseConnection } = vi.hoisted(() => ({
  checkDatabaseConnection: vi.fn(),
}));

vi.mock("../db", () => ({ checkDatabaseConnection }));

import { GET } from "../app/api/health/route";

describe("foundation", () => {
  it("renders the Spanish family-finance introduction", () => {
    render(<Home />);

    expect(
      screen.getByRole("heading", {
        level: 1,
        name: "Control financiero para el hogar",
      }),
    ).toBeInTheDocument();
    expect(screen.getByText(/Accede de forma segura/i)).toBeInTheDocument();
  });

  it("reports healthy when PostgreSQL is available", async () => {
    checkDatabaseConnection.mockResolvedValueOnce(undefined);

    const response = await GET();

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ status: "ok" });
  });

  it("reports unavailable without exposing database details", async () => {
    checkDatabaseConnection.mockRejectedValueOnce(
      new Error("connection refused"),
    );

    const response = await GET();

    expect(response.status).toBe(503);
    await expect(response.json()).resolves.toEqual({ status: "unavailable" });
  });
});
