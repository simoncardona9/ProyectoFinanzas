# Incremental Development Process

## Principle

The application must not be built all at once. Development proceeds through small vertical slices: each slice includes the user interface, API, database changes, validation, and tests needed for one useful capability. A slice is released for review only when it works independently and does not compromise financial data.

## Current environments

| Environment | Purpose                                                            | Data rule                 |
| ----------- | ------------------------------------------------------------------ | ------------------------- |
| Local       | Agent/developer implementation, unit tests, and functional review. | Synthetic test data only. |
| Local Docker Compose | Reproducible local application, migration, seed, PostgreSQL, and HTTPS-proxy runtime. | Synthetic test data only. |

There is no preview, staging, or cloud-production environment during the current phase. The project may be stored in GitHub for source control, but it is not deployed.

Kubernetes is not an environment or delivery target for the current phase:
there are no manifests, Helm charts, clusters, or Kubernetes deployment
procedures in this repository. Introducing it requires a separately approved
deployment decision, architecture review, and operational documentation.

## Delivery cycle for every slice

1. **Select one small user outcome.** Example: “An editor can create a UYU expense and see it in the transaction list.”
2. **Define acceptance criteria.** Include inputs, authorization, expected financial result, invalid cases, and expected UI behavior.
3. **Design the smallest change.** Identify the controller, service, repository, model, migration, UI route, and tests affected.
4. **Implement with tests.** Write or update mandatory unit tests alongside the code.
5. **Run local verification.** Run unit tests, type checking, formatting/linting, and the relevant manual flow.
6. **Review locally.** Review the feature with test data on desktop and phone.
7. **Accept or correct.** Record feedback; fix issues before the next slice if they affect the approved behavior.
8. **Merge through the Git workflow.** Follow [git-workflow.md](git-workflow.md); Simon alone approves and merges a pull request into `main`.
9. **Document and plan follow-up.** Update documentation and create follow-up tasks instead of expanding the current slice.

## Implementation steps

### Step 0 — Project foundation

**Goal:** Establish a deployable, testable empty application.

- Create the Node.js/TypeScript project and PostgreSQL development database.
- Configure Prettier formatting, ESLint, TypeScript checking, Vitest with React Testing Library, Zod validation, and environment variables. CI is deferred until the repository is pushed to GitHub.
- Add health-check endpoint and a minimal Spanish UI page.
- Cloud preview and production deployment are intentionally deferred while the
  project remains local-only. Revisit deployment only after a separate approval.

**Acceptance:** The app runs locally; required checks run locally; an authorized reviewer can use the local application.

### Step 1 — Authentication and household isolation — completed

**Goal:** Only authorized household members can access their own workspace.

- Add sign-in, sign-out, household, membership, and roles.
- Enforce household scoping in API/repository access.
- Provide a basic account/settings page.

**Acceptance:** An owner can invite a viewer; a viewer cannot edit; users cannot access another household’s data.

### Step 2 — Categories and accounts

**Goal:** Create the financial structure before recording money.

- Add accounts: cash, banks, cards, loans, and reserve envelopes.
- Use one localized monetary-input convention across every financial form; do
  not expose minor units as the normal user entry format.
- Add nested income/expense categories and fixed/variable/discretionary classifications.
- Seed a controlled set of categories based on the workbook.

**Acceptance:** An editor can create, edit, archive, and list accounts/categories. Archived items preserve prior history.

### Step 3 — Transaction register

**Goal:** Record actual income and expenses reliably.

- Add income and expense transactions in UYU and USD.
- Add transaction list, filters, details, edit, and void operations.
- Validate amounts, currencies, accounts, categories, and dates.

**Acceptance:** A user can enter a paid UYU transaction and see the correct account balance and category total. Invalid values are rejected and all logic has unit tests.

### Step 4 — Obligations and monthly forecast

**Goal:** Plan upcoming bills without confusing them with paid transactions.

- Add planned, pending, paid, deferred, and cancelled obligations.
- Add due dates, fixed/variable classification, recurrence, and partial payments.
- Show projected cash for a selected month.

**Acceptance:** A pending obligation reduces forecast but not current cash; marking it paid creates the appropriate financial effect; deferring it moves it visibly to the next period.

### Step 5 — First usable dashboard

**Goal:** Replace the most important Excel dashboard view.

- Show spendable cash, collected income, expected income, pending obligations, projected cash, and low-buffer alerts.
- Keep one-off income visibly separate. Tax reserves are introduced and then
  surfaced separately by Step 7; before then the dashboard must state that
  reserve data is unavailable rather than treating it as zero.
- Make every dashboard figure traceable to underlying records.

**Acceptance:** The household can manually compare the dashboard against a small test dataset and explain each implemented total from linked records. Tax-reserve totals are explicitly out of scope until Step 7.

### Step 6 — Debts, currencies, and exchange rates

**Goal:** Manage UYU/USD liabilities safely.

- Add debts, partial payments, account links, exchange rates, and UYU-equivalent exposure.
- Prevent overpayment and show debt balances in original and base currency.

**Acceptance:** A USD payment updates the original balance and the selected UYU-equivalent report using an explicit rate.

**Planned slices:**

1. **6.1 — Debt foundation (completed):** household-scoped UYU/USD debt
   records, original and remaining balances, lifecycle state, audit creation,
   register, and detail view. No cash movement or conversion occurs here.
2. **6.2 — Same-currency debt payments (completed):** full and partial
   payments from an active account in the
   debt's original currency; atomic debt-payment transaction/link, balance and
   status update, audit event, overpayment protection, and payment history.
3. **6.3 — Explicit exchange-rate register (completed):** owner/editor management and
   household-scoped read access for dated UYU/USD rates, including base and
   quote currencies, rate, effective date, source, and confirmed/planning
   kind, plus an explicit currency movement: USD purchase (`UYU` → `USD`), USD
   sale (`USD` → `UYU`), or non-transactional reference. Store all rates as
   `1 USD = X UYU`; validate positive rates and prevent ambiguous duplicates
   for the same pair, date, kind, and movement. Rates never alter balances by
   themselves.
4. **6.4 — Rate selection and UYU-equivalent debt exposure (completed):** let a report or
   debt view select an explicit eligible rate (rather than silently combining
   currencies), calculate UYU equivalents from original-currency remaining
   balances with defined rounding, and expose the selected rate/date/source.
   Preserve the original-currency amounts beside every converted figure. USD
   debt exposure may use only a USD-purchase (`UYU` → `USD`) rate because it
   represents the UYU needed to obtain USD for settlement.
5. **6.5 — Debt report and local acceptance (completed):** provide a household-scoped
   report of original balances, same-currency payments, and UYU-equivalent
   exposure without combining currencies outside the selected-rate result;
   add synthetic-data tests and a repeatable review that demonstrates a USD
   payment updating both the USD balance and selected UYU-equivalent report.

Scope boundary: interest, due-date, payment-plan, cancellation, debt-term
editing, and automatic/live exchange-rate imports are not required for Step 6.
They require separately approved future slices. Every remaining slice must
keep original currency authoritative, use an explicit dated rate for any UYU
conversion, enforce active-household scope and owner/editor write roles, and
write audit events for financial mutations.

### Step 7 — Invoices, IVA, and tax reserves

**Goal:** Reconcile teaching income and protect tax money, including its separate dashboard treatment.

- Add invoices, IVA calculation, collection linkage, tax reserves, and settlement.
- Keep protected funds out of spendable cash and expose the protected amount
  separately in the dashboard.

**Acceptance:** An invoice collection can be reconciled to an income transaction; IVA is traceable; settling a reserve records a tax payment.

**Planned slices:**

1. **7.1 — Invoice and IVA foundation:** create and list household-scoped
   invoices with an immutable gross amount, configured IVA rate, calculated IVA
   amount, service date, due date, client reference, and audit trail. This is
   receivables data only: it does not create a transaction, reserve, or
   dashboard effect.
2. **7.2 — Invoice lifecycle and collection reconciliation:** add invoice
   detail and allowed sent/cancelled/partially-collected/collected states, then
   atomically link a full or partial same-currency collection to a paid income
   transaction. Prevent collection beyond the remaining invoice balance.
3. **7.3 — Protected IVA reserve:** create the invoice-derived IVA reserve and
   its traceable links after the associated collection is recorded. Preserve
   invoice currency, never combine UYU and USD, and do not make protected
   funds available for spending.
4. **7.4 — Tax-reserve settlement:** settle a reserve through an atomic,
   same-currency tax-payment transaction and reserve-link update. Prevent
   over-settlement and retain an audit trail.
5. **7.5 — Dashboard integration and local acceptance:** replace the
   dashboard's “reserve data unavailable” state with separate, traceable
   protected-reserve totals and prove with synthetic data that protected funds
   are excluded from spendable cash.

Scope boundary: client master data, electronic tax-filing integration,
withholding rules, multi-tax invoices, tax return generation, automatic tax
calculation from transactions, and currency conversion are not part of Step 7.
Each slice keeps records household-scoped, restricts writes to owners/editors,
uses atomic financial mutations and audit events, and keeps UYU/USD separate.

### Step 8 — Batch entry, migration, and reconciliation

**Goal:** Let editors add many financial records safely, including approved
historical information, without propagating input or spreadsheet mistakes.

- Build a shared import assistant, reachable from Accounts, Categories,
  Transactions, Obligations, and Expected Income. Each entry point opens the
  same assistant with the relevant entity type preselected; it must not create
  separate batch-writing implementations in each form.
- Accept a versioned JSON import bundle as a first-class power-user input
  method (paste or `.json` upload). JSON examples and downloadable templates
  use human-readable account/category references, never database UUIDs.
- Add dedicated CSV and Excel/XLSX/XLSM parser services that convert original
  files to that same versioned canonical staged-JSON model.
- Build shared staged-JSON mapping, preview, validation, reconciliation, and
  explicit commit services. Validate every row before a commit, show row-level
  errors and currency-separated totals, and retain source provenance.
- Resolve references only inside the active household; reject missing or
  ambiguous account/category names. Apply account/category prerequisites before
  dependent records, including parent categories.
- Give every import an idempotency key and content hash. A retry must return
  the existing result rather than duplicate financial records.
- Commit a reviewed import atomically: all accepted records and their audit
  events are persisted, or no live record changes.
- Treat August 2026 as a reconciliation gate, not as an import source that is
  presumed correct. Its DualBoot conversion source/formula, TEC billing
  alignment, invalid cash-sheet dates, historical dashboard labels, and fixed
  formula ranges must be resolved and signed off before a production-like
  historical commit.

**Acceptance:** An editor can paste or upload a valid JSON bundle, preview its
resolved records and totals, correct reported row errors, and explicitly commit
it once without duplicates. CSV/Excel uploads use the same preview and commit
path. No live record changes before confirmation; a failed commit leaves no
partial records. Imported totals reconcile to the approved source report.

**Planned slices (6):**

1. **8.1 — Canonical JSON staging and shared assistant:** define the
   `finance-import/v1` bundle and provenance model; add the shared assistant,
   JSON paste/`.json` upload, household-local name resolution, row-level
   preview, currency-separated totals, and validation errors. This slice makes
   no live financial changes.
2. **8.2 — Structure import with safe ordering:** add reviewed, atomic, and
   idempotent import of categories (including parent-before-child ordering) and
   accounts. Preserve per-row provenance and normal audit events; reject
   missing, ambiguous, archived, or circular prerequisites.
3. **8.3 — Core cash-flow import commit:** add atomic, idempotent import of
   paid transactions, obligations, and expected income, using the same staged
   batch. Validate all rows before commit, resolve only active-household
   references, and retain source links and audit events for every created
   record.
4. **8.4 — Historical linked-record import:** extend the canonical model and
   commit pipeline for the existing debt, invoice/collection/IVA-reserve, and
   exchange-rate records needed to represent the August workbook without
   inventing links or combining currencies. Historical summaries remain
   reconciliation evidence, not live balance-changing records.
5. **8.5 — CSV and Excel/XLSX/XLSM conversion:** add dedicated CSV and Excel
   parsers that produce the identical canonical staged JSON, mapping report,
   and provenance. Mapping is alias-driven and reviewable; parsers never write
   live records, execute macros, recalculate formulas, or treat formula values
   as financial truth. They must identify hidden rows, Excel date serials,
   defined-table ranges, and presentation-only trailing rows for review.
6. **8.6 — August 2026 reconciliation and acceptance:** correct and sign off
   the documented source discrepancies, compare imported totals against that
   approved report by entity and currency, exercise retry/rollback behavior,
   and retain a repeatable synthetic acceptance procedure.

**Scope finding:** The original Step 8 entry-point list named accounts,
categories, transactions, obligations, and expected income, but the approved
August migration plan also contains debts, invoices/IVA reserves, and
exchange-rate assumptions. Slice 8.4 makes that additional historical scope
explicit. No August historical batch may commit before Slice 8.6's
reconciliation gate is satisfied.

### Step 9 — Monthly close, reports, and backup recovery

**Goal:** Make the app dependable for ongoing use.

- Add close/reopen period workflow, audit reports, CSV export, and backup/restore test.
- Add account, debt, tax, and category reports.

**Acceptance:** A closed month cannot be silently changed; an authorized correction is audited; household data can be exported and a backup restore has been tested.

### Step 10 — Grocery plans and price suggestions

**Goal:** Help a household plan grocery purchases without treating estimates as actual financial events.

- Add household-private markets, products, and dated price observations with duplicate-name suggestions.
- Add grocery plans for a target financial period, optional item quantities and units, manual or suggested prices, and estimated totals.
- Link paid grocery transactions and optional receipt line items to plan items for planned-versus-actual comparison.
- Keep grocery plans, prices, and receipt details private to the household by default.

**Acceptance:** An editor can create a monthly grocery plan, choose or override a suggested price, record an actual purchase, and see an accurate planned-versus-actual result without changing balances before the purchase is paid.

### Step 11 — Shared catalog (future)

**Goal:** Offer opt-in shared market, product, and price suggestions without exposing household financial data.

- Allow deliberate publication of eligible market, product, and price records.
- Search normalized names and aliases, show possible duplicates, and allow legitimate new branches or products.
- Exclude household identity, purchases, quantities, budgets, and plan data from shared records.

**Acceptance:** A household can explicitly publish a price suggestion and another household can use it without either household seeing the other's financial records.

## Rules for scope control

- Do not begin a later step until the current step meets its acceptance criteria.
- A step may be split further if it cannot be reviewed in one short development cycle.
- New ideas are recorded in the backlog; they do not expand a slice already under review.
- Real financial data is entered or imported only after Steps 1–5 are stable and backup procedures exist. It must remain local until a separate cloud-deployment decision is approved.
- Fix data integrity, authorization, or calculation defects before adding convenience features.

## Release checklist

- Required unit tests exist and pass.
- Type checking and linting pass.
- Database migration is reviewed and reversible or backed up.
- Authorization and household scoping were tested.
- Financial totals were manually reviewed for the slice.
- Local functional review was accepted by the household.
- Relevant documentation and API contracts are updated.
