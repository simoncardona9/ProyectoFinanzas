# Development Progress

This log records completed development steps, their scope, and verification.
It intentionally contains no real financial or personal data.

## Step 0 — Project foundation — completed

- Created the local Next.js/TypeScript application with PostgreSQL and Drizzle.
- Added linting, formatting, type checks, Vitest, Zod, environment configuration,
  a Spanish landing page, and `GET /api/health`.
- Kept deployment and cloud environments out of scope.

## Step 1 — Authentication and household isolation — completed

- Added PostgreSQL tables and migration for users, households, memberships,
  revocable sessions, and audit-log storage.
- Added Argon2id password verification, opaque SHA-256-hashed session tokens,
  14-day session expiry, and `HttpOnly`, `SameSite=Lax` session cookies. Cookies
  are `Secure` in production; local HTTP development omits that attribute so the
  local-only application remains usable.
- Added login, logout, current-user, active-household, household settings, and
  owner-only member invitation API routes.
- Enforced household selection from server-side memberships and owner/editor
  write authorization. A viewer is rejected from protected edits.
- Added login and basic settings screens.
- Added unit coverage for Argon2id verification, opaque tokens, viewer editing
  denial, and the existing foundation behavior.

### Verification

- `pnpm exec tsc --noEmit` — passed.
- `pnpm lint` — passed.
- `pnpm test` — passed (6 tests).
- `pnpm db:generate` — passed; migration created at
  `web/drizzle/0000_condemned_fat_cobra.sql`.
- `pnpm db:migrate` — passed; schema applied to the configured local PostgreSQL
  database.
- `pnpm build` — passed.

The first owner and any invitees remain subject to the documented controlled
administrative account-provisioning process; there is deliberately no public
registration or real financial data.

## Step 2 — Categories and accounts — implemented, pending local acceptance

- Added household-scoped cash, bank, card, loan, and reserve-envelope accounts,
  with currency, opening balance/date, audit events, and non-destructive archive.
- Added nested income, expense, and transfer categories. Expense categories use
  fixed, variable, or discretionary classifications; parent categories must be
  active and have the same kind.
- Added a controlled, idempotent category seed based on the workbook headings,
  plus editor/owner APIs and a Spanish management screen at `/structure`.
- Viewers and accountants can list structure but cannot create, change, seed,
  or archive it. Every query and mutation is scoped to the active household.

### Verification

- `pnpm db:generate` and `pnpm db:check` — passed; migrations
  `0001_plain_bushwacker.sql` and `0002_eminent_dorian_gray.sql` generated.
- `pnpm db:migrate` — passed against the configured local PostgreSQL database.
- `pnpm exec tsc --noEmit`, `pnpm lint`, and `pnpm test` — passed (9 tests).
- `pnpm build` — passed.
