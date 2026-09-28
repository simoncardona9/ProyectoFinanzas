import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

import { GroceryPlanManager } from "./grocery-plan-manager";

const plan = {
  id: "00000000-0000-0000-0000-000000000010",
  periodStart: "2026-10-01",
  period: "2026-10",
  name: "Compra octubre sintética",
  currency: "UYU",
  status: "draft",
  preferredMarketId: null,
  preferredMarketName: null,
};

describe("GroceryPlanManager", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("loads matching paid expenses when a plan is selected", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: string) => {
        const data = url.includes("/api/v1/transactions")
          ? [
              {
                id: "00000000-0000-0000-0000-000000000011",
                date: "2026-10-05",
                description: "Compra sintética de almacén",
                amountMinor: 15000,
                currency: "UYU",
                type: "expense",
              },
            ]
          : url.endsWith(`/grocery-plans/${plan.id}`)
            ? {
                plan,
                items: [],
                estimatedTotalMinor: 0,
                actualTotalMinor: 0,
                differenceMinor: 0,
                purchases: [],
                receiptLines: [],
              }
            : url.endsWith("/grocery-plans")
              ? [plan]
              : [];
        return new Response(JSON.stringify({ data }), { status: 200 });
      }),
    );

    const user = userEvent.setup();
    render(<GroceryPlanManager canEdit />);

    expect(await screen.findByText("Ver y conciliar →")).toBeInTheDocument();
    const planButton = await screen.findByRole("button", {
      name: /Compra octubre sintética/,
    });
    expect(planButton).toHaveAttribute("aria-pressed", "false");
    await user.click(planButton);

    expect(await screen.findByText("Plan seleccionado")).toBeInTheDocument();
    expect(planButton).toHaveAttribute("aria-pressed", "true");
    expect(
      await screen.findByRole("option", {
        name: /Compra sintética de almacén/,
      }),
    ).toBeInTheDocument();
  });
});
