# Backend API and Layered Design

## Purpose

This document defines the Node.js/TypeScript backend structure for version 1. It keeps HTTP handling, financial business rules, database access, and reusable utilities separate. Each controller owns one logical API area so development agents can work independently with minimal overlap.

## Layered architecture

```text
HTTP request
  -> route handler / controller
  -> request validation
  -> application service
  -> repository (database access)
  -> PostgreSQL

Shared across layers:
  domain models, authorization policies, helpers, utilities, logging, errors
```

### Controller layer

- Receives HTTP requests and returns HTTP responses.
- Parses route, query, and body parameters.
- Invokes request-schema validation and authorization checks.
- Calls one service method only; it contains no financial calculation or SQL.
- Maps known errors to consistent API responses.

### Service layer

- Implements use cases and business rules.
- Coordinates repositories in a database transaction when an operation changes multiple records.
- Enforces financial rules: currency, status transitions, protected tax reserves, debt balances, and month closing.
- Emits audit events after successful changes.

### Repository / database-access layer

- Contains database queries and persistence mapping only.
- Always scopes queries to the authorized household.
- Does not make business decisions or construct HTTP responses.
- Uses parameterized queries or a type-safe query layer; never string-concatenated SQL.

### Domain-model layer

- Defines domain types, status enums, monetary values, and service input/output contracts.
- Is independent of HTTP and database-library details where practical.

### Helpers and utilities

- **Helpers** encapsulate finance-specific reusable behavior, such as IVA calculation, currency conversion, forecasting, and category rollups.
- **Utilities** provide generic behavior, such as date parsing, pagination, UUID validation, error formatting, logging, and serialization.

## Suggested directory structure

```text
src/
  app/
    api/                         # Next.js route handlers only
  modules/
    accounts/
      accounts.controller.ts
      accounts.service.ts
      accounts.repository.ts
      accounts.schemas.ts
      accounts.models.ts
    transactions/
    obligations/
    invoices/
    debts/
    tax-reserves/
    reports/
    imports/
      parsers/                   # One service per supported file type
        csv-import-parser.service.ts
        excel-import-parser.service.ts
      import-normalization.service.ts
      import-validation.service.ts
      import-commit.service.ts
  shared/
    auth/
    database/
    domain/
    helpers/
    utils/
    errors/
    audit/
```

## API conventions

- Base path: `/api/v1`.
- Resource identifiers: UUID strings.
- JSON request and response bodies.
- Dates: ISO 8601 calendar dates, for example `2026-08-13`.
- Money: APIs receive `amountMinor` integer plus `currency` (`UYU` or `USD`).
  The Spanish Uruguay UI accepts formatted values such as `1.234,56` and
  converts them to minor units before making a request.
- Pagination query parameters: `page`, `pageSize` (maximum 100), `sort`, `order`.

### Import processing boundary

`POST /imports/json/preview` accepts a versioned JSON import bundle from a
paste or `.json` upload and stages it without changing live financial data.
The bundle uses household-local, human-readable references (for example,
account and category names), rather than database UUIDs. The server resolves
and validates those references before returning a preview.

`POST /imports` accepts an original CSV or Excel upload. The server selects a
dedicated parser service for its file type, which transparently produces the
same versioned canonical staged JSON model. Both paths use the shared mapping,
validation, preview-generation, idempotency, and explicit transactional-commit
services.

Each staged record retains its source provenance (`importId`, source name,
sheet when applicable, and row number/JSON path). File-type parsers must not
write live financial records or evaluate spreadsheet formulas as financial
truth.

- List filters use explicit query parameters, never free-form SQL-like expressions.
- Mutating endpoints require an authenticated `owner` or `editor`, unless a stricter rule is listed.
- Every resource is automatically scoped to the authenticated user's household. Clients must not choose arbitrary household IDs in normal endpoints.
- Every endpoint must be documented according to [api-documentation-policy.md](api-documentation-policy.md) before implementation and must follow [logging-error-policy.md](logging-error-policy.md).

### Standard response shapes

```json
{ "data": {} }
```

```json
{
  "data": [],
  "meta": { "page": 1, "pageSize": 25, "total": 0 }
}
```

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "A readable explanation",
    "fields": { "amountMinor": "Must be greater than zero" }
  }
}
```

## Controllers and endpoint contracts

### Authentication

Authentication is first-party and database-backed. There is no public registration endpoint: users are added through the controlled administrative database process. Login verifies the Argon2id password hash and creates a revocable opaque session whose raw token is sent only in an `HttpOnly`, `Secure`, `SameSite=Lax` cookie. Protected routes resolve the session and household role server-side.

| Method and path               | Parameters                | Purpose                                                                           |
| ----------------------------- | ------------------------- | --------------------------------------------------------------------------------- |
| `POST /auth/login`            | body: `email`, `password` | Authenticate an active user and issue a session cookie.                           |
| `POST /auth/logout`           | none                      | Revoke the current session and clear its cookie.                                  |
| `GET /auth/me`                | none                      | Return the current user, active household membership, and selectable memberships. |
| `POST /auth/active-household` | body: `householdId`       | Set the active household after verifying the user has an active membership.       |

### 1. `households.controller`

| Method and path                       | Parameters                                            | Purpose                                                                                                |
| ------------------------------------- | ----------------------------------------------------- | ------------------------------------------------------------------------------------------------------ |
| `GET /household`                      | none                                                  | Return current household profile.                                                                      |
| `PATCH /household`                    | body: `name`, `locale`, `defaultCurrency`, `timeZone` | Update household settings.                                                                             |
| `GET /household/members`              | `page`, `pageSize`, `role`                            | List household members.                                                                                |
| `POST /household/members`             | body: `email`, `role`                                 | Invite a member. Owner only.                                                                           |
| `PATCH /household/members/:memberId`  | path: `memberId`; body: `role`                        | Change a member role. Owner only.                                                                      |
| `DELETE /household/members/:memberId` | path: `memberId`                                      | Remove a member. Owner only.                                                                           |
| `POST /household/reset-test-data`     | body: exact development confirmation                  | Development-only owner reset of the active household's financial test data; unavailable in production. |

This controller manages household membership and roles, not passwords or session tokens.

### 2. `accounts.controller`

| Method and path                         | Parameters                                                                    | Purpose                                                      |
| --------------------------------------- | ----------------------------------------------------------------------------- | ------------------------------------------------------------ |
| `GET /accounts`                         | `type`, `currency`, `active`, pagination                                      | List accounts.                                               |
| `POST /accounts`                        | body: `name`, `type`, `currency`, `openingBalanceMinor`, `openingBalanceDate` | Create cash, bank, card, loan, or virtual-reserve account.   |
| `GET /accounts/:accountId`              | path: `accountId`                                                             | Return account details and computed balance.                 |
| `PATCH /accounts/:accountId`            | path; body: mutable account fields                                            | Update account metadata.                                     |
| `POST /accounts/:accountId/archive`     | path                                                                          | Archive without deleting financial history.                  |
| `POST /accounts/:accountId/activate`    | path                                                                          | Reactivate an archived account without changing its history. |
| `GET /accounts/:accountId/transactions` | path; date/status/category filters and pagination                             | List account activity.                                       |

### 3. `categories.controller`

| Method and path                        | Parameters                                                | Purpose                                                                |
| -------------------------------------- | --------------------------------------------------------- | ---------------------------------------------------------------------- |
| `GET /categories`                      | `kind`, `parentId`, `active`                              | List category hierarchy.                                               |
| `POST /categories`                     | body: `name`, `kind`, `parentId`, `defaultClassification` | Create category.                                                       |
| `PATCH /categories/:categoryId`        | path; body: mutable category fields                       | Rename or reclassify category.                                         |
| `POST /categories/:categoryId/archive` | path                                                      | Archive category after validation that it has a replacement if needed. |

### 4. `transactions.controller`

| Method and path                               | Parameters                                                                                                                    | Purpose                                                                                                            |
| --------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------ |
| `GET /transactions`                           | `from`, `to`, `type`, `status`, `accountId`, `categoryId`, `currency`, `isRecurring`, `isOneOff`, pagination                  | Filter and list transactions.                                                                                      |
| `POST /transactions`                          | body: `date`, `type`, `status`, `amountMinor`, `currency`, `accountId`, `categoryId`, `description`, optional links and flags | Create paid income/expense or planned/pending expected income; expected income does not change an account balance. |
| `GET /transactions/:transactionId`            | path                                                                                                                          | Get one transaction with links and audit history.                                                                  |
| `PATCH /transactions/:transactionId`          | path; body: allowed mutable fields, `changeReason`                                                                            | Amend an unclosed transaction.                                                                                     |
| `POST /transactions/:transactionId/void`      | path; body: `reason`                                                                                                          | Void rather than delete a posted transaction.                                                                      |
| `POST /transactions/:transactionId/mark-paid` | path; body: `paidDate`, optional `accountId`                                                                                  | Change planned or pending item to paid.                                                                            |

### 5. `obligations.controller`

| Method and path                            | Parameters                                                                                                            | Purpose                                       |
| ------------------------------------------ | --------------------------------------------------------------------------------------------------------------------- | --------------------------------------------- |
| `GET /obligations`                         | `dueFrom`, `dueTo`, `status`, `classification`, `categoryId`, pagination                                              | List bills and commitments.                   |
| `POST /obligations`                        | body: `description`, `amountMinor`, `currency`, `dueDate`, `categoryId`, `classification`, `status`, `recurrenceRule` | Create an obligation.                         |
| `GET /obligations/:obligationId`           | path                                                                                                                  | Get obligation and linked payments.           |
| `PATCH /obligations/:obligationId`         | path; body: mutable fields                                                                                            | Update an unpaid obligation.                  |
| `POST /obligations/:obligationId/payments` | path; body: `amountMinor`, `currency`, `accountId`, `paidDate`, `description`                                         | Apply full or partial payment.                |
| `POST /obligations/:obligationId/defer`    | path; body: `newDueDate`, `reason`                                                                                    | Mark deferred and carry it to another period. |

### 6. `invoices.controller`

| Method and path                      | Parameters                                                                                           | Purpose                                    |
| ------------------------------------ | ---------------------------------------------------------------------------------------------------- | ------------------------------------------ |
| `GET /invoices`                      | `status`, `clientId`, `serviceMonth`, `dueFrom`, `dueTo`, pagination                                 | List invoices.                             |
| `POST /invoices`                     | body: `clientId`, `serviceDate`, `grossAmountMinor`, `currency`, `ivaRate`, `dueDate`, `description` | Create invoice and calculated IVA record.  |
| `GET /invoices/:invoiceId`           | path                                                                                                 | Get invoice, IVA, and linked collections.  |
| `PATCH /invoices/:invoiceId`         | path; body: mutable draft or unpaid fields                                                           | Update invoice.                            |
| `POST /invoices/:invoiceId/send`     | path; body: `sentDate`                                                                               | Mark invoice sent.                         |
| `POST /invoices/:invoiceId/payments` | path; body: `amountMinor`, `currency`, `accountId`, `paidDate`                                       | Reconcile full or partial collection.      |
| `POST /invoices/:invoiceId/cancel`   | path; body: `reason`                                                                                 | Cancel an unpaid invoice with audit trail. |

### 7. `debts.controller`

| Method and path                | Parameters                                                                 | Purpose                                                     |
| ------------------------------ | -------------------------------------------------------------------------- | ----------------------------------------------------------- |
| `GET /debts`                   | optional `status`, `currency`, `limit` (1–100, default 50), `offset`       | List debts belonging to the active household.               |
| `POST /debts`                  | `creditorName`, `description`, `amountMinor`, `currency`, `incurredDate`   | Create an active debt with equal original/current balances. |
| `GET /debts/:debtId`           | path                                                                       | Get a household-scoped debt and its audit history.          |
| `POST /debts/:debtId/payments` | path; body: `amountMinor`, `accountId`, `paidDate`, optional `description` | Apply a same-currency full or partial payment.              |

Slice 6.2 adds a same-currency payment and account link. It deliberately has
no exchange-rate, UYU-equivalent exposure, or term-edit endpoint.

### 8. `tax-reserves.controller`

| Method and path                        | Parameters                                                                          | Purpose                                   |
| -------------------------------------- | ----------------------------------------------------------------------------------- | ----------------------------------------- |
| `GET /tax-reserves`                    | `taxType`, `status`, `periodFrom`, `periodTo`                                       | List tax and IVA reserves.                |
| `POST /tax-reserves`                   | body: `taxType`, `period`, `amountMinor`, `currency`, `dueDate`, `sourceInvoiceIds` | Create or adjust a protected reserve.     |
| `GET /tax-reserves/:reserveId`         | path                                                                                | Get reserve details and settlement links. |
| `POST /tax-reserves/:reserveId/settle` | path; body: `amountMinor`, `accountId`, `paidDate`, `reference`                     | Record tax payment and reduce reserve.    |

### 9. `exchange-rates.controller`

| Method and path              | Parameters                                                                       | Purpose                                  |
| ---------------------------- | -------------------------------------------------------------------------------- | ---------------------------------------- |
| `GET /exchange-rates`        | `baseCurrency`, `quoteCurrency`, `from`, `to`                                    | List rates.                              |
| `POST /exchange-rates`       | body: `baseCurrency`, `quoteCurrency`, `rate`, `effectiveDate`, `source`, `kind` | Add confirmed or planning exchange rate. |

Slice 6.3 implements the list and create endpoints only. Each rate belongs to
the server-selected active household and has a UYU/USD base/quote pair, a
positive decimal rate, effective date, source, and `confirmed` or `planning`
kind. Owners and editors create; every household role reads. A household may
not have two records for the same pair, date, and kind. Creating a rate writes
an audit event and never changes a debt, account, transaction, or report.
`GET /exchange-rates/latest` is deferred until explicit rate selection in
Slice 6.4.

### 10. `dashboard.controller`

| Method and path            | Parameters                   | Purpose                                                                                                                                                                                                                        |
| -------------------------- | ---------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `GET /dashboard`           | `period` (`YYYY-MM`)         | Return separate-currency current cash, paid, one-off, and expected income for the period, pending obligations, and projected cash. Tax reserves, debt, and currency conversion are added only when their source modules exist. |
| `GET /dashboard/cash-flow` | `from`, `to`, `baseCurrency` | Return grouped cash-flow timeline.                                                                                                                                                                                             |
| `GET /dashboard/alerts`    | `period`                     | Return overdue, low-buffer, due-soon, and USD-exposure alerts.                                                                                                                                                                 |

This controller is read-only. It delegates all calculations to reporting/forecast services.

### 11. `reports.controller`

| Method and path                 | Parameters                                                                                                | Purpose                                                                                                   |
| ------------------------------- | --------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------- |
| `GET /reports/monthly-close`    | `period`, `baseCurrency`                                                                                  | Return period income, expenses, taxes, debt, and closing balance.                                         |
| `GET /reports/categories`       | `from`, `to`, `kind`, `groupBy`                                                                           | Return category totals.                                                                                   |
| `GET /reports/spending-summary` | `from`, `to`, `groupBy` (`month`, `year`, `category`), `currency` or `baseCurrency` with `exchangeRateId` | Return paid-expense totals for any inclusive date range, including two months, a year, or a custom range. |
| `GET /reports/debts`            | `asOfDate`, `baseCurrency`, `exchangeRateId`                                                              | Return liability and payment report.                                                                      |
| `GET /reports/export`           | `from`, `to`, `format` (`csv` initially)                                                                  | Create household-scoped export.                                                                           |

### 12. `grocery-plans.controller`

| Method and path                         | Parameters                                                             | Purpose                                                         |
| --------------------------------------- | ---------------------------------------------------------------------- | --------------------------------------------------------------- |
| `GET /grocery-plans`                    | `period`, `status`, pagination                                         | List household grocery plans.                                   |
| `POST /grocery-plans`                   | body: `period`, optional `marketId`, `name`                            | Create a non-financial grocery plan.                            |
| `GET /grocery-plans/:planId`            | path                                                                   | Return a plan, its items, estimates, and fulfillment status.    |
| `PATCH /grocery-plans/:planId`          | path; body: mutable plan fields                                        | Update a draft or active plan.                                  |
| `POST /grocery-plans/:planId/items`     | body: product/free-text item, quantity, unit, optional suggested price | Add a planned grocery item.                                     |
| `POST /grocery-plans/:planId/reconcile` | body: `transactionId`, line-item links                                 | Link an actual paid purchase and update fulfillment comparison. |

### 13. `markets.controller`

| Method and path                        | Parameters                                                               | Purpose                                                                  |
| -------------------------------------- | ------------------------------------------------------------------------ | ------------------------------------------------------------------------ |
| `GET /markets`                         | `query`, `location`, `includeShared`                                     | Search household and shared markets, including similar-name suggestions. |
| `POST /markets`                        | body: `name`, optional branch/location and aliases                       | Create a household-private market after returning possible duplicates.   |
| `GET /products`                        | `query`, `marketId`, `includeShared`                                     | Search household and shared product catalog entries.                     |
| `POST /products`                       | body: name, optional brand, category, pack size, barcode                 | Create a household-private product.                                      |
| `GET /market-prices`                   | `marketId`, `productId`, `from`, `to`, `includeShared`                   | Return dated price suggestions.                                          |
| `POST /market-prices`                  | body: market, product, price, currency, quantity, unit, observation date | Record a household-private price observation.                            |
| `POST /market-prices/:priceId/publish` | path                                                                     | Explicitly publish an eligible, non-identifying catalog contribution.    |

### 14. `imports.controller`

| Method and path                    | Parameters                            | Purpose                                                                                                          |
| ---------------------------------- | ------------------------------------- | ---------------------------------------------------------------------------------------------------------------- |
| `POST /imports/json/preview`       | JSON bundle; `Idempotency-Key`        | Stage and validate pasted/uploaded JSON; return resolved rows, errors, warnings, and totals without live writes. |
| `POST /imports`                    | multipart file; `sourceType`          | Upload Excel/CSV to a non-production staging area.                                                               |
| `GET /imports/:importId`           | path                                  | Return validation and mapping status.                                                                            |
| `POST /imports/:importId/map`      | path; body: column/entity mappings    | Save reviewed mappings.                                                                                          |
| `POST /imports/:importId/validate` | path                                  | Validate dates, amounts, currencies, duplicates, and references.                                                 |
| `POST /imports/:importId/commit`   | path; confirmation; `Idempotency-Key` | Atomically import approved staged records; retrying the same key returns the original result.                    |

## Cross-cutting helpers

| Helper          | Responsibility                                              |
| --------------- | ----------------------------------------------------------- |
| `money`         | Addition, comparison, currency validation, fixed precision. |
| `exchange-rate` | Convert currency with rate source and effective date.       |
| `iva`           | Calculate net base and IVA from gross amount/rate.          |
| `cash-flow`     | Calculate spendable and projected cash from statuses.       |
| `forecast`      | Combine recurring income, expected income, and obligations. |
| `period`        | Determine month boundaries and closed-period behavior.      |
| `audit`         | Construct immutable change-event records.                   |

## Implementation rules for agents

1. Add a new endpoint only inside its owning controller/module.
2. Validate all input at the controller boundary with typed schemas.
3. Keep controllers thin; move decisions to services and queries to repositories.
4. Use database transactions for payment application, debt balance changes, tax settlement, and import commit.
5. Test service rules independently of HTTP.
6. Test controllers for validation, authorization, response shape, and household isolation.
7. Update this document whenever an endpoint, parameter, or responsibility changes.
8. Add or update the endpoint's OpenAPI contract, response examples, error codes, and tests in the same change as the implementation.
