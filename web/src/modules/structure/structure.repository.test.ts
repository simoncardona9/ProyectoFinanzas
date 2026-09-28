import { describe, expect, it, vi } from "vitest";

const { db, deletedTables } = vi.hoisted(() => {
  const deletedTables: unknown[] = [];
  const tx = {
    delete: vi.fn((table: unknown) => {
      deletedTables.push(table);
      return { where: vi.fn().mockResolvedValue(undefined) };
    }),
    select: vi.fn(() => ({
      from: vi.fn(() => ({ where: vi.fn(() => []) })),
    })),
  };
  return {
    deletedTables,
    db: { transaction: vi.fn(async (callback) => callback(tx)) },
  };
});

vi.mock("@/db", () => ({ db }));

import {
  financialPeriods,
  groceryPlanItems,
  groceryPurchases,
  groceryReceiptLines,
  importBatches,
} from "@/db/schema";
import { structureRepository } from "./structure.repository";

describe("structureRepository.resetFinancialData", () => {
  it("removes grocery receipt dependencies before plan items and clears test-only import state", async () => {
    await structureRepository.resetFinancialData(
      "00000000-0000-0000-0000-000000000001",
    );

    expect(deletedTables.indexOf(groceryReceiptLines)).toBeLessThan(
      deletedTables.indexOf(groceryPlanItems),
    );
    expect(deletedTables.indexOf(groceryPurchases)).toBeLessThan(
      deletedTables.indexOf(groceryPlanItems),
    );
    expect(deletedTables).toContain(importBatches);
    expect(deletedTables).toContain(financialPeriods);
  });
});
