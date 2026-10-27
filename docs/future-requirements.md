# Future requirements — analysis and design backlog

Registered on 2026-10-27 following the Steps 1–11 system audit. Every item
below is **pending analysis and design; not implemented**. Registration does
not assign a release, approve a design, authorize deployment, or create a
Step 12. Completed Steps 1–11 remain the current implementation baseline.

Use these identifiers when updating requirements, business rules, designs,
tests, and future implementation plans. The analysis questions and acceptance
examples are starting points to refine with the household, not final designs.

| ID | Requirement | Existing foundation |
| --- | --- | --- |
| F-01 | Collect expected income / mark it paid | Planned/pending income and forecast exist. |
| F-02 | Record transfers | Accounts, currencies, transaction ledger and explicit rates exist. |
| F-03 | Record balance adjustments | Opening balances and audited transaction correction/void exist. |
| F-04 | Monthly budgets | Categories, classification and paid-spending reports exist. |
| F-05 | Automatic recurring generation | Recurrence flags/rule metadata exist; no generator exists. |
| F-06 | Debt schedules, interest and repayment plans | Original-currency debts, partial payments and exposure exist. |
| F-07 | Grocery summaries across plans | Plan-item estimates, linked actuals and receipt lines exist. |
| F-08 | Receipt-file attachments | Structured receipt lines exist; file attachments do not. |
| F-09 | Notifications and payment reminders | Dated obligations, invoices and period planning exist. |
| F-10 | Savings goals and emergency-fund tracking | Accounts and reserve-envelope account type exist. |
| F-11 | Specialized accountant exports | Financial reports, audit report and CSV export exist. |
| F-12 | Bank imports and external integrations | Reviewed file-import staging and explicit manual rates exist. |
| O-01 | Cloud hosting and production operations | Native local/Docker runtimes and local backup/restore exist. |

## F-01 — Expected-income collection

Allow planned/pending income to become paid without retaining the same amount
in both expected and collected totals. Analyze partial versus full collection,
account selection, actual date, differences from the estimate, cancellation,
correction/void, and whether an existing paid transaction may be reconciled.
Design household/role authorization, atomic source-to-payment links, retry
protection, audit events and closed-period checks. Acceptance should prove
that collecting an expected amount changes cash once and reduces the expected
amount consistently, separately for UYU and USD.

## F-02 — Transfers

Allow movement between household accounts without creating ordinary income or
expense. Analyze supported account types, same-currency versus exchange
transfers, captured rates, rounding, fees, reconciliation and reversal.
Acceptance should reconcile both account movements, conserve same-currency
household cash, and reject invalid or partially written transfers.

## F-03 — Balance adjustments

Support explicit, reasoned reconciliation adjustments while preserving original
transactions and opening balances. Analyze eligible roles, evidence, approval,
signed amounts, reversal and report presentation. Acceptance should prove a
traceable balance correction with no silent edit, correct currency treatment,
and rejection of changes to a closed period without controlled reopening.

## F-04 — Monthly budgets

Plan and compare household monthly limits by category and currency. Analyze
classification, nested-category rollups, planned versus paid spending,
rollover, changes during a month, one-off income and overspending alerts.
Acceptance should reconcile actual spending to its source transactions and
keep budget changes separate from account movements and protected tax funds.

## F-05 — Automatic recurring generation

Generate future obligations and/or expected income from approved recurring
rules. Analyze supported entities, frequencies, start/end dates, month-end
dates, timezone, missed runs, edits, pauses, cancellation and closed periods.
Choose the scheduling mechanism during design, not by assumption. Acceptance
should prove retries produce each occurrence once, preserve past history and
never mark estimated items paid automatically.

## F-06 — Debt schedules, interest and repayment plans

Extend debts with agreed due dates, installment schedules and interest where
needed. Analyze principal versus interest/fees, interest conventions, rounding,
irregular/late/early payments, schedule amendments and obligation integration.
Acceptance should reconcile payments, remaining principal and due installments
in the original currency without double-counting cash or obligations.

## F-07 — Grocery summaries across plans

Report spending across plans by product, market and inclusive date range.
Analyze purchase date versus plan month, quantity/unit normalization, copied
catalog identities, legitimate duplicate names, unattributed receipt lines and
estimate/actual separation. Acceptance should reconcile totals to linked paid
transactions and receipt evidence without counting a purchase more than once
or combining UYU/USD.

## F-08 — Receipt-file attachments

Attach receipt files to the appropriate private financial/purchase records.
Analyze supported types/sizes, storage, household authorization, upload
validation, download, deletion, retention, backup and restore. OCR is a
separate scope decision. Acceptance should demonstrate private authorized
retrieval, cross-household rejection and a tested file-recovery lifecycle;
an attachment alone must not create a financial transaction.

## F-09 — Notifications and reminders

Offer household-controlled reminders for upcoming or overdue payments.
Analyze event types, channels, opt-in preferences, recipients, timezone,
scheduling, deduplication, retries and cancellation after payment/deferral.
Acceptance should use a local/fake delivery channel to prove correct timing,
permissions and cancellation without exposing financial details to unintended
recipients. External message delivery needs a separate explicit decision.

## F-10 — Savings goals and emergency fund

Track target amounts, contributions, withdrawals and progress. Analyze whether
goals are informational allocations or represent actual transfers, how funds
relate to reserve-envelope accounts and spendable cash, and how currencies and
tax reserves remain separate. Acceptance should reconcile goal progress and
underlying money without creating or double-counting cash.

## F-11 — Specialized accountant exports

Define formats and accounting views beyond existing CSV/report capabilities.
Analyze the accountant's required columns, grouping, date/currency semantics,
tax mappings, evidence links, role permissions and export audit events.
Acceptance should reconcile each export to source records using an agreed
synthetic example, with spreadsheet-safe output and household isolation.
Do not assume a jurisdiction-specific filing integration is included.

## F-12 — Bank imports and external integrations

Evaluate specific data sources and read-only use cases before selecting a
provider. Analyze permissions, credentials, consent/revocation, privacy,
retention, transaction matching, duplicate detection, failure recovery and
reuse of reviewed import staging. Acceptance should use mocks/sandbox sources
and prove that external data cannot silently commit or duplicate financial
records. Bank write access, payments and live-rate ingestion are separate
scope decisions. Security review is required before real-account integration.

## O-01 — Cloud hosting and production operations

This is a separate deployment decision, not an unfinished local feature.
Analyze provider/region, costs, environments, authentication/secrets, TLS,
storage, access, monitoring, backup retention and restore, migrations,
recovery objectives, rollback and incident handling. Acceptance must include
an agreed operational/recovery procedure with synthetic data. Cloud
deployment remains separately approved; Kubernetes is not an assumed target.

## Promoting an item into development

Select one household outcome and refine its requirements, unresolved
questions, dependencies and acceptance criteria. Update the affected business
rules, data model, UI/API contracts and recovery implications as part of the
design. Only then define small implementation slices through
[development-process.md](development-process.md), including a final synthetic
acceptance slice. Record dependencies as findings rather than silently
expanding scope.

F-01 is a suggested first candidate because it closes the existing expected-
income lifecycle. It has not been selected or scheduled. Priorities and release
placement for all backlog items remain open for future analysis.
