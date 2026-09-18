import { describe, expect, it } from "vitest";
import { ApiError } from "@/shared/errors/api-error";
import {
  assertFinancialPeriodOpen,
  assertFinancialPeriodsOpen,
  closeFinancialPeriod,
  financialPeriodStart,
  getFinancialPeriodStatus,
  reopenFinancialPeriod,
} from "./financial-period.service";

const ownerContext = {
  user: { id: "owner-id", email: "owner@example.com" },
  membership: {
    id: "membership-id",
    householdId: "household-id",
    householdName: "Test household",
    role: "owner" as const,
  },
  sessionId: "session-id",
};

describe("financial periods", () => {
  it("derives a calendar period from the actual financial date", () => {
    expect(financialPeriodStart("2026-09-30")).toBe("2026-09-01");
  });

  it("rejects invalid financial dates", () => {
    expect(() => financialPeriodStart("2026-09-31")).toThrow(ApiError);
  });

  it("reports an absent household period as open", async () => {
    await expect(
      getFinancialPeriodStatus(
        { find: async () => undefined },
        "household-id",
        "2026-09",
      ),
    ).resolves.toEqual({ period: "2026-09", status: "open" });
  });

  it("rejects writes whose actual date belongs to a closed period", async () => {
    await expect(
      assertFinancialPeriodOpen(
        { findClosed: async () => ({ id: "period-id" }) },
        "household-id",
        "2026-09-30",
      ),
    ).rejects.toMatchObject({ code: "CLOSED_PERIOD", status: 422 });
  });

  it("allows writes when the household has no closed record for that month", async () => {
    await expect(
      assertFinancialPeriodOpen(
        { findClosed: async () => undefined },
        "household-id",
        "2026-09-30",
      ),
    ).resolves.toBeUndefined();
  });

  it("checks every distinct affected month, including both sides of a correction", async () => {
    const checked: string[] = [];
    await assertFinancialPeriodsOpen(
      {
        findClosed: async (_householdId, periodStart) => {
          checked.push(periodStart);
          return undefined;
        },
      },
      "household-id",
      ["2026-08-01", "2026-09-30", "2026-09-01"],
    );
    expect(checked.sort()).toEqual(["2026-08-01", "2026-09-01"]);
  });

  it("closes a month using its canonical first day and owner audit actor", async () => {
    const calls: unknown[][] = [];
    await expect(
      closeFinancialPeriod(
        {
          close: async (...args) => {
            calls.push(args);
            return { id: "period-id" };
          },
        },
        ownerContext,
        "2026-09",
      ),
    ).resolves.toEqual({ period: "2026-09", status: "closed" });
    expect(calls).toEqual([["household-id", "owner-id", "2026-09-01"]]);
  });

  it("does not silently close an already closed month", async () => {
    await expect(
      closeFinancialPeriod(
        { close: async () => undefined },
        ownerContext,
        "2026-09",
      ),
    ).rejects.toMatchObject({ code: "PERIOD_ALREADY_CLOSED", status: 409 });
  });

  it("requires a successful controlled reopen before reporting an open month", async () => {
    const calls: unknown[][] = [];
    await expect(
      reopenFinancialPeriod(
        {
          reopen: async (...args) => {
            calls.push(args);
            return { id: "period-id" };
          },
        },
        ownerContext,
        "2026-09",
        "Corrección documentada",
      ),
    ).resolves.toEqual({ period: "2026-09", status: "open" });
    expect(calls).toEqual([
      ["household-id", "owner-id", "2026-09-01", "Corrección documentada"],
    ]);
  });
});
