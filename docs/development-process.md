# Incremental Development Process

## Principle

The application must not be built all at once. Development proceeds through small vertical slices: each slice includes the user interface, API, database changes, validation, and tests needed for one useful capability. A slice is released for review only when it works independently and does not compromise financial data.

## Current environments

| Environment | Purpose | Data rule |
|---|---|---|
| Local | Agent/developer implementation, unit tests, and functional review. | Synthetic test data only. |

There is no preview, staging, or cloud-production environment during the current phase. The project may be stored in GitHub for source control, but it is not deployed.

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
- Keep tax reserves and one-off income visibly separate.
- Make every dashboard figure traceable to underlying records.

**Acceptance:** The household can manually compare the dashboard against a small test dataset and explain each total from linked records.

### Step 6 — Debts, currencies, and exchange rates

**Goal:** Manage UYU/USD liabilities safely.

- Add debts, partial payments, account links, exchange rates, and UYU-equivalent exposure.
- Prevent overpayment and show debt balances in original and base currency.

**Acceptance:** A USD payment updates the original balance and the selected UYU-equivalent report using an explicit rate.

### Step 7 — Invoices, IVA, and tax reserves

**Goal:** Reconcile teaching income and protect tax money.

- Add invoices, IVA calculation, collection linkage, tax reserves, and settlement.
- Keep protected funds out of spendable cash.

**Acceptance:** An invoice collection can be reconciled to an income transaction; IVA is traceable; settling a reserve records a tax payment.

### Step 8 — Excel migration and reconciliation

**Goal:** Import approved historical information without propagating spreadsheet mistakes.

- Build staged CSV/Excel import preview, mapping, validation, and explicit commit.
- Reconcile August 2026 figures before importing them.

**Acceptance:** An import can be reviewed, rejected, and re-run safely; imported totals reconcile to the approved source report.

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
