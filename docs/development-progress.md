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
- The structure screen labels each account as active or archived. Owners and
  editors can reactivate an archived account through an audited,
  household-scoped operation; its financial history is preserved.
- Account opening balances accept and format localized display amounts while
  persisting integer minor units. Development-only owner reset support removes
  active-household test financial data after typed confirmation.

### Verification

- `pnpm db:generate` and `pnpm db:check` — passed; migrations
  `0001_plain_bushwacker.sql` and `0002_eminent_dorian_gray.sql` generated.
- `pnpm db:migrate` — passed against the configured local PostgreSQL database.
- `pnpm exec tsc --noEmit`, `pnpm lint`, and `pnpm test` — passed (9 tests).
- `pnpm build` — passed.

## Step 3 — Transaction register — in progress

### Slice 3.1 — Paid UYU income and expenses — implemented, pending verification

- Added a household-scoped transaction table and migration for the broader
  transaction lifecycle. This slice only permits creating paid UYU
  income and expense records.
- Added active-account, category-kind, and currency-match validation. Creating
  a transaction and its audit event is atomic.
- Added `GET`/`POST /api/v1/transactions` and the `/transactions` Spanish
  register. Creation returns the resulting account balance and expense-category
  total; the UI immediately shows both values.
- Deferred transaction edits, voids, filters beyond date/account/category,
  pending/planned status, transfers, and USD to subsequent Step 3 slices.

### Slice 3.2 — USD-safe register and transaction details — implemented, pending verification

- Extended paid income and expense entry to UYU and USD. Accounts are restricted
  to the selected transaction currency, and category totals returned after entry
  are scoped to that currency; UYU and USD are never combined.
- Added type, currency, recurring/one-off, date, account, and category list
  filters plus bounded offset pagination.
- Added a household-scoped transaction-detail API and Spanish detail screen,
  including its available audit events.
- Added unit coverage for USD account validation, currency-aware write input,
  mutually exclusive recurring/one-off flags, and list-filter parsing.

Transaction edits and voids remain deferred to Slice 3.3. Planned and pending
financial items remain Step 4 obligation behavior.

### Slice 3.3 — Auditable corrections and voids — implemented, pending verification

- Added owner/editor-only correction of paid transactions. Each correction
  requires a reason and atomically records both the reason and previous values
  in audit metadata.
- Added owner/editor-only voiding. A void requires a reason, atomically changes
  the transaction to `cancelled`, records the prior values, and therefore
  removes it from paid balance and category-total calculations.
- Prevented cancelled or already voided transactions from being changed again,
  and added concurrent-modification protection for correction and void writes.
- Added the audit metadata migration `0004_futuristic_zarda.sql` and correction
  and void controls to the transaction detail screen.

## Step 4 — Obligations and monthly forecast — completed

- Added household-scoped obligations with amount remaining, due date, expense
  category, fixed/variable/discretionary classification, planned/pending/paid/
  deferred/cancelled lifecycle, and optional monthly, quarterly, or yearly
  recurrence metadata.
- Added a payment endpoint that validates the active same-currency account,
  prevents overpayment, atomically creates a paid expense transaction and
  payment link, updates the remaining obligation amount, and writes an audit
  event. Full payment marks the obligation paid; partial payment leaves it
  pending.
- Added audited deferral to a strictly later due date. Deferred obligations are
  shown in their new month and remain included in the projection.
- Added `/obligations`, a Spanish obligation register and monthly projection,
  plus household-scoped API endpoints for create/list, payment, deferral, and
  forecast. UYU and USD projected amounts are always shown separately.
- Added migration `0005_condemned_deathbird.sql` for obligations and payment
  links, and unit coverage for category, payment, deferral, and lifecycle
  validation.

### Verification and local acceptance

- Reviewed the Step 4 acceptance flow with synthetic data: pending obligations
  affect the monthly forecast without changing paid cash; payments create the
  linked paid expense and reduce the remaining amount; and deferrals require a
  strictly later due date and move the obligation into its new period.
- Confirmed that UYU and USD forecast totals are returned separately.
- `pnpm test` — passed (21 tests).
- `pnpm exec tsc --noEmit` — passed.
- `pnpm lint` — passed.
- `pnpm db:check` — passed.
- `pnpm build` — passed.

## Step 5 — First usable dashboard — completed

### Slice 5.1 — Traceable cash and monthly projection

- Added a protected monthly dashboard at `/dashboard` and `GET /api/v1/dashboard`.
- The dashboard shows, separately for UYU and USD, current spendable cash,
  paid income for the selected month, one-off income, pending obligations, and
  projected cash. Its inputs remain traceable through links to the transaction
  and obligation registers.
- Tax reserves are intentionally presented as unavailable: their data model,
  protection rules, and dashboard integration belong to Step 7, so displaying
  a zero would be misleading.
- Added a unit test that verifies dashboard rollups never combine currencies.

### Slice 5.2 — Expected income

- Added planned and pending income records with an active, currency-matched
  destination account and active income category.
- Added an editor/owner dashboard form to register expected income. Expected
  income changes the projection only; it does not affect current cash until it
  is recorded as paid.

### Slice 5.4 — Local reconciliation acceptance

- Added a repeatable synthetic-data checklist for reconciling each dashboard
  figure, low-buffer alerts, source links, and currency isolation before Step
  5 is accepted.

### Verification and local acceptance

- Local migration `0006_pretty_emma_frost.sql` applied successfully.
- `pnpm test` — passed (23 tests).
- `pnpm exec tsc --noEmit` — passed.
- `pnpm lint` — passed.
- `pnpm db:check` — passed.
- `pnpm build` — passed.
- The approved synthetic reconciliation procedure is retained in
  `docs/dashboard-acceptance.md` for repeatable local review.
