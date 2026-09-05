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

## Non-functional requirements

- Responsive web interface suitable for phone and desktop.
- Cloud-hosted database with backups.
- Encryption in transit and at rest where provided by the hosting platform.
- Clear error messages, validation, and no silent recalculations.
- Amounts must be stored with decimal-safe monetary arithmetic, never floating-point business logic.
- Spanish interface initially; future localization must remain possible.
