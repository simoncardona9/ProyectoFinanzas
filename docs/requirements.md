# Requirements

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

### Planning

- Track planned, pending, paid, and deferred obligations.
- Mark income as recurring or one-off.
- Separate tax reserves from spendable money.
- Support monthly budgets and cash-flow forecasts.
- Support optional grocery plans per household and target month, including item quantities, units, estimated prices, supermarket suggestions, and planned-versus-actual comparison.
- Support household-private supermarkets, products, and price observations. A shared catalog may be used only through an explicit publish/share choice and must not expose household financial data.

### Debt and invoicing

- Track debt balances, payments, due dates, currency, and interest information when available.
- Track client invoices and reconcile an invoice with a received payment.
- Calculate IVA from a configurable rate.

### Reporting

- Show dashboard, monthly close, cash-flow report, debt report, IVA/tax report, and exportable data.
- Show spending summaries for any inclusive date range, such as one month, two months, a calendar year, or a custom range. Summaries must support grouping by month, year, and category.
- Support grocery spending summaries by product, market, and period when receipt line items are recorded.
- Keep financial periods per household and support open, close, and controlled reopen workflows for each month.

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
- Encryption in transit and at rest where provided by the hosting platform.
- Clear error messages, validation, and no silent recalculations.
- Amounts must be stored with decimal-safe monetary arithmetic, never floating-point business logic.
- Spanish interface initially; future localization must remain possible.
- Spreadsheet parsing must be resilient to harmless layout variation while
  failing clearly and safely for missing required fields, ambiguous mappings,
  unsupported workbook features, or malformed data.
