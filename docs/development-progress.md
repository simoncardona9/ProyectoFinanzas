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
- Added an **Ingreso único** control to paid-income creation and correction.
  It records the `is_one_off` flag used by the dashboard's separate one-off
  income total; the control is not available for expenses.
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
- On 2026-09-05, the household completed the dashboard acceptance scenario
  locally with synthetic data and confirmed the dashboard flow and figures.

## Step 6 — Debts, currencies, and exchange rates — completed

### Slice 6.1 — Debt foundation — completed

- Added household-scoped debt records with creditor, description, incurred date,
  original balance, remaining balance, original currency, active/paid/cancelled
  status, and an audited creation event.
- Added protected `GET`/`POST /api/v1/debts`, protected
  `GET /api/v1/debts/:debtId`, and Spanish `/debts` register/detail screens.
  All reads are scoped to the server-selected active household; owners and
  editors may create records while viewer/accountant roles are read-only.
- The slice intentionally does not introduce payments, account links, exchange
  rates, UYU-equivalent exposure, or debt reporting. A debt is displayed only
  in its original UYU or USD currency.
- Added migration `0007_heavy_giant_girl.sql` and unit validation coverage for
  a positive initial balance.

### Slice 6.2 — Same-currency debt payments — completed

- Added full and partial debt payments from an active account in the debt's
  original currency. The payment amount cannot exceed the remaining balance;
  the final payment changes the debt from `active` to `paid`.
- Each payment atomically creates a `debt_payment` transaction, its debt-payment
  link, the updated debt balance/status, and a debt audit event. Concurrent
  attempts are rejected rather than risking an overpayment.
- Added the protected owner/editor `POST /api/v1/debts/:debtId/payments`
  endpoint and a localized payment form/history on the debt detail screen.
  Viewer and accountant roles remain read-only.
- Added migration `0008_real_killraven.sql`, OpenAPI/API-design documentation,
  and unit coverage for partial payment, overpayment, wrong-currency accounts,
  and closed debts.
- UYU-equivalent exposure and exchange rates remain intentionally out of scope
  for the next Step 6 slice.

### Slice 6.3 — Explicit exchange-rate register — completed

- Added household-scoped UYU/USD exchange-rate records with base/quote
  currencies, positive decimal rate, effective date, source, and confirmed or
  planning kind. The database prohibits ambiguous duplicates for one
  household, pair, date, and kind.
- Added protected `GET`/`POST /api/v1/exchange-rates`, owner/editor writes,
  household-scoped reads for every active-household role, audited creation,
  OpenAPI/API-design documentation, and a Spanish cotizaciones register.
- Added migration `0009_oval_arclight.sql` and validation coverage for
  positive precision-limited rates and distinct currency pairs. Rates do not
  change balances or calculate UYU equivalents; explicit rate selection and
  exposure remain deferred to Slice 6.4.

#### Follow-up — Explicit USD purchase/sale movement — completed

- Corrected the rate register to state the movement explicitly: `buy_usd`
  (`UYU` → `USD`), `sell_usd` (`USD` → `UYU`), or `reference`. All rates use
  the unambiguous `1 USD = X UYU` convention, and duplicate protection now
  includes movement.
- USD debt detail and report exposure accept and display only the USD-purchase
  movement because it is the UYU cost of obtaining USD for settlement. Sale and
  reference rates remain visible in the register but cannot be selected for
  that purpose.
- Added migration `0010_real_marten_broadcloak.sql`. Existing rates are
  preserved as `reference` and must be re-recorded with an explicit movement
  before being selected for debt exposure.

### Slice 6.4 — Rate selection and UYU-equivalent debt exposure — completed

- Added explicit `exchangeRateId` selection on debt detail reads and the debt
  detail screen. USD debts accept only an active-household `USD` → `UYU` rate;
  the response and screen retain the original USD balance beside the
  informational UYU equivalent.
- The converted amount uses exact decimal arithmetic and rounds half up to the
  nearest UYU minor unit. The selected rate, effective date, source, and kind
  remain visible. UYU debts are identified as already UYU and do not receive a
  synthetic conversion.
- Rate selection and conversion are read-only: neither changes debt balances,
  transactions, accounts, nor rate records. Added conversion rounding tests;
  the household debt report and local acceptance procedure remain deferred to
  Slice 6.5.

### Slice 6.5 — Debt report and local acceptance — completed

- Added the protected household-scoped `GET /api/v1/reports/debts` endpoint and
  the Spanish `/debt-report` screen. Both display debt original amount,
  same-currency paid amount, remaining balance, and separate UYU/USD totals.
- An optional explicit household `USD` → `UYU` rate produces individual and
  combined UYU-equivalent exposure while preserving every original-currency
  amount. Without a selected rate, USD and UYU are not combined.
- Added synthetic report tests covering the partial USD payment case and
  `docs/debt-acceptance.md`, a repeatable local review proving that a USD
  payment updates the original and selected-rate UYU figures. The report is
  read-only and does not modify financial records.

### Verification

- `pnpm db:migrate` — passed against the configured local PostgreSQL database.
- `pnpm exec tsc --noEmit`, `pnpm test` (30 tests), `pnpm lint`, `pnpm db:check`,
  and `pnpm build` — passed.
- On 2026-09-07, the household completed the debt acceptance scenario locally
  with synthetic data. It confirmed the USD original, paid, and remaining
  figures (`20000`, `5000`, and `15000` minor units), the selected-rate UYU
  equivalent (`641250` minor units), currency isolation, eligible-rate
  filtering, and read-only behavior. The disposable household was reset.

## Step 7 — Invoices, IVA, and tax reserves — completed

### Slice 7.1 — Invoice and IVA foundation — completed

- Added household-scoped draft invoices with client name, description, service
  and due dates, gross amount, invoice currency, captured IVA rate, and
  immutable calculated IVA and net amounts.
- Gross amounts include IVA. IVA is extracted with explicit half-up minor-unit
  rounding; a due date before the service date is rejected.
- Added protected `GET`/`POST /api/v1/invoices`, owner/editor creation,
  read-only access for every active-household role, atomic audit creation, and
  the Spanish `/invoices` register.
- Invoice records are receivables data only in this slice: they create no cash
  movement, collection link, tax reserve, or dashboard change. The controlled
  test-data reset now removes invoices as well.
- Added migration `0011_moaning_the_anarchist.sql`, invoice calculation and
  validation tests, and API contract documentation.

### Verification

- `pnpm db:migrate` — passed against the configured local PostgreSQL database.
- `pnpm exec tsc --noEmit`, `pnpm test` (41 tests), `pnpm lint`, `pnpm db:check`,
  and `pnpm build` — passed.
- On 2026-09-07, the household completed the local invoice review. It confirmed
  draft invoice creation, the displayed gross/net/IVA breakdown, unchanged
  cash and dashboard figures, and viewer read-only access.

### Slice 7.2 — Invoice lifecycle and collection reconciliation — completed

- Added invoice detail, send and unpaid-cancellation transitions, plus immutable
  collection records linked atomically to newly created paid income transactions.
- A collection requires an active same-currency account, cannot exceed the
  remaining gross receivable, and moves the invoice to `partially_collected` or
  `collected`. Concurrent balance changes roll back the transaction and link.
- The Spanish invoice register now exposes remaining balance, invoice detail,
  lifecycle actions, and partial/full collection entry. IVA reserves and
  dashboard changes remain deferred to Slice 7.3.

### Verification

- `pnpm db:migrate`, `pnpm exec tsc --noEmit`, `pnpm test` (45 tests),
  `pnpm lint`, `pnpm db:check`, and `pnpm build` — passed.
- On 2026-09-07, the household completed the local lifecycle review. It
  confirmed sending an invoice, partial and final same-currency collections,
  linked paid income, zero balance on collection, cancellation protection after
  collection, and read-only account selection filtered to the invoice currency.

### Slice 7.3 — Protected IVA reserve — completed

- Every successful invoice collection now atomically creates one protected,
  same-currency IVA reserve linked to its invoice and source collection. The
  reserve keeps original and remaining minor-unit amounts for later settlement.
- Partial-collection reserve allocation uses exact-integer cumulative half-up
  rounding. Consequently, the reserve portions equal the invoice's immutable
  IVA exactly when its gross amount is fully collected.
- Invoice detail shows the protected IVA for each collection. The dashboard
  remains intentionally unchanged until Slice 7.5 and no reserve-settlement
  action exists until Slice 7.4.
- Added migration `0013_elite_emma_frost.sql`, reserve-allocation tests, and
  documentation for the traceable invoice-collection-reserve relationship.

### Verification

- `pnpm db:migrate` applied the new reserve schema to the configured local
  PostgreSQL database.
- `pnpm exec tsc --noEmit`, `pnpm test` (47 tests), `pnpm lint`,
  `pnpm db:check`, and `pnpm build` — passed.
- On 2026-09-07, the household completed the local protected-reserve review.
  It confirmed same-currency account filtering, linked partial and final
  collections, one protected IVA amount per collection, reserve portions that
  total the captured invoice IVA, and unchanged dashboard behavior.

### Slice 7.4 — Tax-reserve settlement — completed

- Added the tax-reserve settlement ledger and a protected settlement endpoint.
  Each settlement atomically creates a same-currency paid tax expense,
  retain its transaction link and reference, reduce the reserve, and audit both
  the payment and reserve mutation.
- Added the repeatable synthetic-data checklist in
  `docs/tax-reserve-acceptance.md`, including partial and final settlement,
  over-settlement rejection, traceability, and reset verification.

### Verification and local acceptance

- `pnpm db:migrate`, `pnpm exec tsc --noEmit`, `pnpm test` (51 tests),
  `pnpm lint`, `pnpm db:check`, and `pnpm build` — passed.
- On 2026-09-08, the household completed the local tax-reserve settlement
  review with synthetic data. It confirmed partial and final same-currency tax
  payments, balance/status updates, over-settlement rejection without a
  financial side effect, linked payment traceability, and successful test-data
  reset.

### Slice 7.5 — Dashboard integration and local acceptance — completed

- The dashboard now exposes protected IVA totals separately per currency and
  deducts each remaining protected reserve from spendable and projected cash.
  Settled reserves are excluded; partial settlement reduces the protected
  amount by exactly the tax payment.
- Added `docs/dashboard-tax-reserve-acceptance.md` for the repeatable local
  UYU and USD synthetic-data proof and invoice-to-dashboard traceability.
- On 2026-09-08, the household completed the local dashboard review. It
  confirmed protected IVA is displayed separately and excluded from spendable
  and projected cash, while IVA settlement releases the corresponding amount
  and UYU/USD remain separate.

### Verification

- `pnpm test` (52 tests), `pnpm exec tsc --noEmit`, `pnpm lint`, and
  `pnpm build` — passed.

## Local container runtime — documented

- Docker Compose runs the local stack: PostgreSQL, one-shot migrations,
  idempotent synthetic test-user seeding, the Next.js application, and a Caddy
  HTTPS reverse proxy. Only Caddy publishes host ports 80 and 443; PostgreSQL
  and the application remain internal to the Compose network.
- The Caddy configuration supports a configured public DNS name or a local CA
  certificate for a LAN IP/local hostname, including Windows clients that omit
  TLS SNI when connecting by IP. The operational procedure is in
  `docs/docker-compose.md`.
- Kubernetes is not configured: this repository contains no Kubernetes
  manifests, Helm chart, cluster, or deployment workflow. It remains outside
  the local-only scope and requires separate approval and implementation.
