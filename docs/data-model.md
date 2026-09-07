# Data Model

## Core entities

### Household

Represents one family-finance workspace. It owns all financial data and is the data-isolation boundary. A user may belong to more than one household.

### User, Membership, and Session

`User` stores identity, a unique email, an Argon2id password hash, activation state, and timestamps. `Membership` links a user to a household with one role: `owner`, `editor`, `viewer`, or `accountant`. A user may have memberships in multiple households, but a `(user_id, household_id)` pair is unique. `Session` stores a user reference, a hashed opaque token, expiry, revocation state, and timestamps; it never stores the raw token. The active household is selected from the user's memberships and stored in the server-side session context.

### FinancialPeriod

Represents one household calendar month and controls the monthly close. Required fields: `household_id`, `year`, `month`, `status` (`open` or `closed`), `closed_at`, `closed_by_user_id`, and a reopen reason when applicable. A `(household_id, year, month)` combination is unique.

Transactions and other dated records keep their actual date; their reporting month and year are derived from that date rather than duplicated in every record. `FinancialPeriod` exists to lock or reopen a month with an audit trail.

### Account

Represents where money is held or owed: cash, bank account, card, loan, tax reserve, or virtual envelope.

Required fields: `name`, `type`, `currency`, `opening_balance`, `active`.
`active` and `archived_at` support non-destructive archival; reactivation clears
the archive marker without changing historical transactions.

### Category

Supports hierarchical reporting. Examples: Income > DualBoot, Expenses > Services > UTE, Taxes > IVA, Debt > Credit Card.

Required fields: `name`, `kind` (`income`, `expense`, `transfer`), `parent_category_id`, `default_classification`.

### Transaction

The immutable financial event.

Required fields: `date`, `type`, `status`, `amount_minor`, `currency`, `account_id`, `category_id`, `description`, `is_recurring`, `is_one_off`.

`type` is `income`, `expense`, `transfer`, `debt_payment`, or `adjustment`.
`status` is `planned`, `pending`, `paid`, `deferred`, or `cancelled`.

### TransactionLineItem

An optional receipt-level breakdown of one transaction. Required fields: `transaction_id`, `description`, `quantity`, `unit`, `unit_price_minor`, `total_minor`, and optional `product_id`, `category_id`, and `grocery_plan_item_id`. Quantities may be decimal (for example, kilograms); monetary values remain integer minor units. The line-item total must reconcile to the parent transaction total, with any difference recorded explicitly as an uncategorized remainder.

### GroceryPlan and GroceryPlanItem

`GroceryPlan` is a household-owned, non-financial shopping plan for a target `FinancialPeriod`. It records status (`draft`, `active`, `partially_fulfilled`, `fulfilled`, or `cancelled`), an optional preferred market, and planned totals. `GroceryPlanItem` records a product or free-text description, quantity, unit, planned price, optional market price suggestion, and actual fulfillment links. A plan may be fulfilled partially or across multiple markets and transactions. It never changes account balances by itself.

### Market, Product, and MarketPrice

`Market` is a reusable supermarket identity with a display name, normalized name, optional branch/location, and aliases. `Product` records a name, optional brand, category, quantity, unit or pack size, and optional barcode. A market or product can be household-private or a deliberately published shared catalog record.

`MarketPrice` is a dated price observation for one market and product. Required fields: `market_id`, `product_id`, `price_minor`, `currency`, `quantity`, `unit`, `observed_on`, `source`, and `visibility` (`household` by default or `shared`). Shared observations contain no household, purchase, budget, or user-identifying data.

### Obligation

Represents an amount expected to be paid, such as a loan installment, service bill, wage, tax, or subscription. A paid obligation links to one or more transactions.

### Invoice

Tracks billable work: client, service month, gross amount, IVA rate, IVA amount, sent date, due date, and collection status. It can link to one or more income transactions.

### Debt

Tracks a liability: creditor, account, original amount, outstanding amount, currency, due date, interest data, and payment plan.

### ExchangeRate

Stores the `USD` → `UYU` quote convention (`1 USD = X UYU`), rate, date,
source, planning/confirmed kind, and explicit movement: buying USD (`UYU` →
`USD`), selling USD (`USD` → `UYU`), or non-transactional reference. A USD
debt's UYU exposure may select only a USD-purchase rate because that is the
cost to obtain USD for settlement.

### TaxReserve

Links an amount to a tax type, period, due date, and protected status. It must not be included in spendable cash.

### ImportBatch and ImportRecord

`ImportBatch` is a household-scoped, staged batch-entry operation. Required
fields include `format_version`, `source_type` (`json`, `csv`, or `excel`),
`status` (`staged`, `validated`, `committed`, `rejected`, or `failed`),
`idempotency_key`, `content_hash`, actor, timestamps, and a safe summary of
row counts and currency-separated totals. The `(household_id, idempotency_key)`
and content-hash handling prevent duplicate commits.

`ImportRecord` belongs to an import batch and stores the canonical normalized
record, its entity type, source provenance (JSON path or file/sheet/row),
validation errors/warnings, and resolved target identifiers after validation.
Raw input is access-controlled and never copied into operational logs. Staged
records are not live financial records and cannot affect balances.

### AuditLog

Records create, update, delete, import, and status-change actions with actor and timestamp.

## Key relationships

```text
Household ──< Accounts, Categories, Transactions, Obligations, Invoices, Debts
User ──< Membership >── Household
User ──< Sessions
Household ──< FinancialPeriods
Household ──< ImportBatches ──< ImportRecords
FinancialPeriod ──< dated Transactions, Obligations, Invoices, TaxReserves (derived by date)
Transaction ──< TransactionLineItems >── Product
Household ──< GroceryPlans ──< GroceryPlanItems
GroceryPlanItem ──> Product and optional MarketPrice
Market ──< MarketPrices >── Product
Invoice ──< income Transactions
Obligation ──< expense Transactions
Debt ──< debt-payment Transactions
Transaction ──> Account and Category
TaxReserve ──> Transaction or Obligation
```
