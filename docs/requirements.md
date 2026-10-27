# Requirements

This document describes the broader target product, not a list of delivered
capabilities. Steps 1–11 are the implemented baseline. Missing requirements
are registered with stable IDs and analysis/design questions in
[future-requirements.md](future-requirements.md); their registration does not
authorize implementation or deployment.

## Functional requirements

### Authentication and household access

- Users must sign in before accessing financial information.
- Financial data belongs to a household workspace.
- Household roles are `owner`, `editor`, `viewer`, and `accountant`.

### Transactions and accounts

- Record income, expenses, transfers, debt payments, and adjustments.
- Store amount, currency, date, account, category, status, notes, and attachments where needed.
- Support UYU and USD from the first release.
- Preserve transaction history; edits must be auditable.
- Future lifecycle work: collect planned/pending income without double-counting
  forecast and paid cash (F-01), dedicated transfers (F-02), and explicit
  reconciliation adjustments (F-03).

### Planning

- Track planned, pending, paid, and deferred obligations.
- Mark income as recurring or one-off.
- Separate tax reserves from spendable money.
- Support monthly budgets and cash-flow forecasts.
- Monthly budgets (F-04) and automatic recurring generation (F-05) remain
  future requirements; existing forecasts and recurrence metadata do not
  constitute those features.
- Support optional grocery plans per household and target month, including item quantities, units, estimated prices, supermarket suggestions, and planned-versus-actual comparison.
- Support household-private supermarkets, products, and price observations. A
  shared catalog may be published to or copied from only through an explicit
  user choice and must not expose household identity or financial data.

### Debt and invoicing

- Track debt balances, payments, due dates, currency, and interest information when available.
- Track client invoices and reconcile an invoice with a received payment.
- Calculate IVA from a configurable rate.
- Debt due-date schedules, interest and repayment plans remain future analysis
  under F-06; existing partial-payment tracking is already implemented.

### Reporting

- Show dashboard, monthly close, cash-flow report, debt report, IVA/tax report, and exportable data.
- Show spending summaries for any inclusive date range, such as one month, two months, a calendar year, or a custom range. Summaries must support grouping by month, year, and category.
- Support grocery spending summaries by product, market, and period when receipt line items are recorded.
- Keep financial periods per household and support open, close, and controlled reopen workflows for each month.
- Cross-plan grocery summaries (F-07) and specialized accountant exports beyond
  the existing reports/CSV (F-11) remain future requirements.

### Convenience and integrations — future analysis

- Private receipt-file attachments, with an authorized storage and recovery
  lifecycle (F-08).
- Opt-in notifications and payment reminders, including cancellation after
  payment or deferral (F-09).
- Savings goals and emergency-fund tracking without double-counting funds
  (F-10).
- Read-only bank imports and other explicitly selected external integrations,
  subject to security/privacy review and reviewed financial commits (F-12).

### Batch import and spreadsheet migration

- Accept versioned JSON bundles and original `.csv`, `.xlsx`, and `.xlsm`
  workbooks as batch-import sources.
- Read a workbook even when its sheet order, extra presentation columns,
  styling, blank formatted cells, row positions, or non-essential labels differ
  from a known template. The import must identify supported sheets and columns
  from normalized header names and configured aliases, not fixed cell addresses
  or formula ranges.
- Extract only fields that match a supported financial entity and convert them
  into the same versioned canonical batch JSON used by direct JSON imports.
  Unknown sheets/columns and unmatched rows must be reported, never silently
  interpreted as financial records.
- Show the proposed sheet/entity and column/field mappings, match confidence,
  unmatched data, and row-level conversion errors for human review. Ambiguous
  matches require a user-selected mapping before the batch can be committed.
- Preserve the original source file and row provenance for each extracted
  record. Parsing and previewing a file must not create or change live
  financial records; only an explicitly reviewed, validated batch may commit.
- For Excel/XLSX/XLSM, use defined tables as mapping evidence when available;
  detect hidden/filtered rows and presentation-only formatted tails; convert
  dates from the declared workbook date system; and preserve each original cell
  value/formula as restricted provenance.
- Never execute macros or VBA, external links, or formulas from an uploaded
  workbook. Detect and report whether an `.xlsm` package contains macros.
  Formula cells may be shown with cached values for review but require explicit
  confirmation before providing a financial amount for import.
- An import batch must record its original filename, byte content hash, and
  declared financial period. A file timestamp or “latest” filename does not
  establish source precedence.

## Non-functional requirements

- Responsive web interface suitable for phone and desktop.
- Cloud-hosted database with backups.
  Cloud hosting and production operations are deferred to the separate O-01
  decision; tested local backup/restore does not constitute cloud readiness.
- Encryption in transit and at rest where provided by the hosting platform.
- Clear error messages, validation, and no silent recalculations.
- Amounts must be stored with decimal-safe monetary arithmetic, never floating-point business logic.
- Spanish interface initially; future localization must remain possible.
- Spreadsheet parsing must be resilient to harmless layout variation while
  failing clearly and safely for missing required fields, ambiguous mappings,
  unsupported workbook features, or malformed data.
