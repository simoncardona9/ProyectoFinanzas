# Basic and Advanced views

The view is a per-user display preference. It changes navigation and contextual
links, not household data, calculations, authorization, or API access. Users
can switch at any time from the sidebar or Settings. Existing users keep the
Advanced view when the preference migration is applied; new users start in
Basic. Both views retain Settings and sign-out.

## Available now

| Basic | Advanced adds |
| --- | --- |
| General overview, including balances, paid income and expenses, upcoming payments, and currency-separated figures. | Detailed monthly dashboard and expected-income entry. |
| Paid income and expense register, search, corrections, and voids. | Invoices, collections, protected IVA reserves, and settlements. |
| Accounts and categories. | Debts, payments, exchange rates, and debt exposure. |
| Obligations with amounts, due dates, payments, deferrals, and monthly projection. | Grocery catalogs, price observations, plans, linked purchases, and shared-catalog controls. |
| Household settings appropriate to the user's role. | Reviewed JSON/CSV/Excel imports, financial period close/reopen, detailed reports, audit, and CSV export, subject to role permissions. |

Basic users can plan **specific expenses** as obligations. This is not a
category spending limit or monthly budget. Current calculations still include
advanced records and protected IVA when the Basic view is selected. A direct
link to an advanced page remains usable for an authorized user; the preference
is not an access-control boundary.

## Agreed placement for future work

- A simple monthly spending budget by category belongs in Basic. The existing
  grocery plan remains in Advanced because it manages products, prices, and
  receipt-level detail. Monthly budgets are future requirement F-04 and are not
  implemented.
- An approved ReceiptIntelligence expense should appear for review and
  confirmation under Basic **Movimientos** and count toward a future monthly
  budget only after it becomes a paid transaction. Connection setup, mappings,
  duplicate/revision resolution, delivery diagnostics, and item-level grocery
  reconciliation belong in Advanced.
- The ReceiptIntelligence connection and receiving contract are separate
  future work. No receipt delivery, review inbox, or automatic posting is
  implemented by the view preference. Design should use stable receipt IDs,
  explicit financial confirmation, and traceable corrections to prevent
  duplicate expenses.
