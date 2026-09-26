import { describe, expect, it, vi } from "vitest";

const { groceryRepository } = vi.hoisted(() => ({
  groceryRepository: {
    findPlan: vi.fn(),
    findPaidExpense: vi.fn(),
    createPurchase: vi.fn(),
  },
}));

vi.mock("./grocery.repository", () => ({ groceryRepository }));

import { addGroceryPurchase } from "./grocery.service";

const context = {
  user: { id: "user-id" },
  membership: { householdId: "household-id", role: "owner" },
} as never;

describe("addGroceryPurchase", () => {
  it("returns a conflict instead of an internal error for an already-linked expense", async () => {
    groceryRepository.findPlan.mockResolvedValue({
      status: "draft",
      currency: "UYU",
    });
    groceryRepository.findPaidExpense.mockResolvedValue({
      currency: "UYU",
      amountMinor: 15000,
    });
    groceryRepository.createPurchase.mockRejectedValue({
      code: "23505",
      constraint: "grocery_purchases_transaction_unique",
    });

    await expect(
      addGroceryPurchase(context, "plan-id", {
        transactionId: "transaction-id",
      }),
    ).rejects.toMatchObject({
      status: 409,
      code: "GROCERY_TRANSACTION_ALREADY_LINKED",
      message: "This paid transaction is already linked to a grocery plan.",
    });
  });
});
