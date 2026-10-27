# Functionalities and Release Priorities

These versions group target capabilities; they are not delivery-status
checklists. Steps 1–11 form the completed baseline. Remaining features are
pending analysis/design in [future-requirements.md](future-requirements.md),
and their final priorities/releases are not yet assigned.

## Version 1 — Financial control foundation

1. Secure sign-in and household workspace.
2. Accounts, categories, and currencies.
3. Income and expense entry with paid/pending/deferred status.
4. Dashboard: cash, forecast, pending obligations, tax reserve, and USD debt.
5. Monthly budget and recurring transactions.
6. Search, filters, and CSV export.
7. Future: expected-income collection (F-01), transfers (F-02), and balance
   adjustments (F-03). Monthly budgets and automatic recurring generation
   above are also future work (F-04/F-05).

## Version 2 — Reconciliation and planning

1. Invoice management and payment reconciliation.
2. Debt schedules, partial payments, and payment plans.
3. Exchange-rate history and USD exposure scenario.
4. Due-date calendar and reminders.
5. Batch-entry import assistant: JSON paste/upload first, plus Excel/CSV;
   staged preview, row errors, explicit all-or-nothing commit, and duplicate
   protection.
6. Monthly-close workflow with locked historical periods.
7. Grocery plans with optional item-level estimates, planned-versus-actual comparison, and household-private markets, products, and prices.

Debt schedules, interest and repayment plans (F-06), cross-plan grocery
summaries (F-07), and reminders (F-09) are not implemented by the existing
debt-payment, grocery-plan and due-date functionality.

## Version 3 — Convenience features

1. Receipt attachments.
2. Shared notifications.
3. Savings goals and emergency-fund tracking.
4. Accountant-oriented reports.
5. Optional read-only bank-import integration, only after security review.
6. Opt-in shared supermarket, product, and price catalog with duplicate suggestions and privacy review.

The shared catalog is complete in Step 11. Receipt-file attachments (F-08),
notifications (F-09), savings/emergency-fund tracking (F-10), specialized
accountant formats (F-11), and external integrations (F-12) remain future
analysis/design. Cloud hosting and operations (O-01) are a separate decision.
