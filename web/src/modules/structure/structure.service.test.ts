import { beforeEach, describe, expect, it, vi } from "vitest";
import type { AuthContext } from "@/shared/auth/auth.types";
import { financialPeriodRepository } from "@/modules/financial-periods/financial-period.repository";
import { structureRepository } from "./structure.repository";
import { createAccount, updateAccount } from "./structure.service";

vi.mock("./structure.repository", () => ({
  structureRepository: {
    findAccount: vi.fn(),
    createAccount: vi.fn(),
    updateAccount: vi.fn(),
    audit: vi.fn(),
  },
}));
vi.mock("@/modules/financial-periods/financial-period.repository", () => ({
  financialPeriodRepository: { findClosed: vi.fn() },
}));
const context = {
  user: { id: "actor" },
  membership: { householdId: "household" },
} as AuthContext;

describe("account history safeguards", () => {
  beforeEach(() => vi.resetAllMocks());
  it("rejects an opening entry in a closed month before writing an account or audit event", async () => {
    vi.mocked(financialPeriodRepository.findClosed).mockResolvedValue({
      id: "closed",
    } as never);
    await expect(
      createAccount(context, {
        name: "Synthetic cash",
        type: "cash",
        currency: "UYU",
        openingBalanceMinor: 100,
        openingBalanceDate: "2026-09-15",
      }),
    ).rejects.toMatchObject({ status: 422, code: "CLOSED_PERIOD" });
    expect(structureRepository.createAccount).not.toHaveBeenCalled();
    expect(structureRepository.audit).not.toHaveBeenCalled();
  });
  it("rejects changing the currency of an existing account", async () => {
    vi.mocked(structureRepository.findAccount).mockResolvedValue({
      currency: "UYU",
    } as never);
    await expect(
      updateAccount(context, "account", { currency: "USD" }),
    ).rejects.toMatchObject({
      status: 422,
      code: "ACCOUNT_CURRENCY_IMMUTABLE",
    });
    expect(structureRepository.updateAccount).not.toHaveBeenCalled();
    expect(structureRepository.audit).not.toHaveBeenCalled();
  });
  it("still permits same-currency metadata updates", async () => {
    vi.mocked(structureRepository.findAccount).mockResolvedValue({
      currency: "UYU",
    } as never);
    vi.mocked(structureRepository.updateAccount).mockResolvedValue({
      id: "account",
      currency: "UYU",
      name: "Renamed",
    } as never);
    await expect(
      updateAccount(context, "account", { currency: "UYU", name: "Renamed" }),
    ).resolves.toMatchObject({ name: "Renamed" });
    expect(structureRepository.audit).toHaveBeenCalledWith(
      "household",
      "actor",
      "update",
      "account",
      "account",
    );
  });
});
