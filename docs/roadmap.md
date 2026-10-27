# Roadmap

## Current baseline and future planning

Steps 1–11 are complete. The phases below are broad product groupings and do
not mean every listed capability has been delivered. The remaining scope is
tracked in [future-requirements.md](future-requirements.md), with all items
pending analysis/design and no new implementation step assigned.

- Financial lifecycles: expected-income collection (F-01), transfers (F-02),
  adjustments (F-03), budgets (F-04), recurring generation (F-05), and debt
  schedules/interest/plans (F-06).
- Reporting and convenience: cross-plan grocery summaries (F-07), receipt
  attachments (F-08), reminders (F-09), savings/emergency fund (F-10), and
  specialized accountant exports (F-11).
- External scope: bank/other integrations (F-12) and the separate cloud
  hosting/production-operations decision (O-01).

Expected-income collection is a suggested first analysis candidate, not an
approved priority or Step 12. Select and design a small outcome before adding
new slices to the development process.

## Phase 0 — Discovery and financial cleanup

- Confirm the data model and classifications with the household.
- Reconcile the Excel inconsistencies.
- Define categories, accounts, recurring income, and mandatory obligations.
- Choose technology and cloud provider.

## Phase 1 — Minimum viable product

- Authentication and household roles.
- Accounts, categories, transactions, and obligations.
- UYU/USD support and manual exchange rate.
- Dashboard and monthly forecast (tax-reserve separation follows the Step 7
  tax-reserve model).
- Data export and audit logging.

## Phase 2 — Finance operations

- Invoices, IVA reserves, and payment reconciliation.
- Debt plans and partial payments.
- Recurring rules, due dates, and monthly close.
- Batch-entry import workflow: a JSON paste/upload bundle is a supported
  power-user path, while Excel/CSV parsers convert uploads to the same
  canonical staged JSON before shared preview, validation, and atomic commit.
- Grocery plans, private market/product price lists, and planned-versus-actual grocery comparison.

## Phase 3 — Quality and convenience

- Mobile-first refinements.
- Attachments and notifications.
- Improved reporting and accountant export.
- Opt-in shared market, product, and price catalog with duplicate suggestions and privacy controls.
- Optional external integrations after review.

## Definition of MVP completion

The family can log monthly income and expenses from any device, see trustworthy spendable cash and a forecast, track tax reserves and USD debts, and export their data without using spreadsheet formulas.
