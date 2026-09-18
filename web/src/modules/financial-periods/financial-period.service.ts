import { ApiError } from "@/shared/errors/api-error";
import type { AuthContext } from "@/shared/auth/auth.types";

type PeriodLookup = {
  find(
    householdId: string,
    periodStart: string,
  ): Promise<{ status: "open" | "closed" } | undefined>;
  findClosed(
    householdId: string,
    periodStart: string,
  ): Promise<{ id: string } | undefined>;
};

type PeriodTransitionLookup = {
  close(
    householdId: string,
    actorUserId: string,
    periodStart: string,
  ): Promise<{ id: string } | undefined>;
  reopen(
    householdId: string,
    actorUserId: string,
    periodStart: string,
    reason: string,
  ): Promise<{ id: string } | undefined>;
};

/** Returns the first date of the calendar month containing an ISO date. */
export function financialPeriodStart(date: string) {
  if (!/^\d{4}-(0[1-9]|1[0-2])-\d{2}$/.test(date)) {
    throw new ApiError(
      422,
      "INVALID_FINANCIAL_DATE",
      "Invalid financial date.",
    );
  }
  const [year, month, day] = date.split("-").map(Number);
  const parsed = new Date(Date.UTC(year, month - 1, day));
  if (
    parsed.getUTCFullYear() !== year ||
    parsed.getUTCMonth() !== month - 1 ||
    parsed.getUTCDate() !== day
  ) {
    throw new ApiError(
      422,
      "INVALID_FINANCIAL_DATE",
      "Invalid financial date.",
    );
  }
  return `${date.slice(0, 7)}-01`;
}

export async function getFinancialPeriodStatus(
  lookup: Pick<PeriodLookup, "find">,
  householdId: string,
  period: string,
) {
  const periodStart = `${period}-01`;
  const record = await lookup.find(householdId, periodStart);
  return {
    period,
    status: record?.status ?? "open",
  };
}

export async function closeFinancialPeriod(
  repository: Pick<PeriodTransitionLookup, "close">,
  context: AuthContext,
  period: string,
) {
  const result = await repository.close(
    context.membership.householdId,
    context.user.id,
    `${period}-01`,
  );
  if (!result)
    throw new ApiError(
      409,
      "PERIOD_ALREADY_CLOSED",
      "The financial period is already closed.",
    );
  return { period, status: "closed" as const };
}

export async function reopenFinancialPeriod(
  repository: Pick<PeriodTransitionLookup, "reopen">,
  context: AuthContext,
  period: string,
  reason: string,
) {
  const result = await repository.reopen(
    context.membership.householdId,
    context.user.id,
    `${period}-01`,
    reason,
  );
  if (!result)
    throw new ApiError(
      409,
      "PERIOD_ALREADY_OPEN",
      "The financial period is already open.",
    );
  return { period, status: "open" as const };
}

/**
 * Shared closed-period guard. Slice 9.2 applies it to each dated financial
 * write; no current mutation invokes it until that coverage is complete.
 */
export async function assertFinancialPeriodOpen(
  lookup: Pick<PeriodLookup, "findClosed">,
  householdId: string,
  date: string,
) {
  const periodStart = financialPeriodStart(date);
  if (await lookup.findClosed(householdId, periodStart)) {
    throw new ApiError(
      422,
      "CLOSED_PERIOD",
      `The financial period ${periodStart.slice(0, 7)} is closed.`,
    );
  }
}

/** Checks all periods affected by one mutation, without checking a month twice. */
export async function assertFinancialPeriodsOpen(
  lookup: Pick<PeriodLookup, "findClosed">,
  householdId: string,
  dates: string[],
) {
  await Promise.all(
    [...new Set(dates.map(financialPeriodStart))].map(async (periodStart) => {
      if (await lookup.findClosed(householdId, periodStart)) {
        throw new ApiError(
          422,
          "CLOSED_PERIOD",
          `The financial period ${periodStart.slice(0, 7)} is closed.`,
        );
      }
    }),
  );
}
