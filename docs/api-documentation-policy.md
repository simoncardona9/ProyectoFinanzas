# API Documentation Policy

## Mandatory rule

Every API endpoint and every supported HTTP method must be documented before or in the same pull request as its implementation. The controller tables in [backend-api-design.md](backend-api-design.md) define the initial endpoint inventory; the versioned OpenAPI document becomes the exact machine-readable contract once implementation starts.

No undocumented endpoint may be added to the application.

## Source of truth

When the Node.js project is initialized, create and maintain:

```text
docs/api/openapi.v1.yaml
```

The OpenAPI file and the controller implementation must be changed together. If they disagree, the OpenAPI contract is the intended public API and the mismatch is a defect.

## Required documentation for every operation

Each `method + path` must specify all of the following:

1. Unique operation identifier, summary, and detailed description.
2. Owning controller/module and required role(s).
3. Authentication requirements and household-scoping behavior.
4. Path, query, header, and request-body parameters, including type, format, required flag, allowed values, defaults, and validation limits.
5. Request JSON schema and at least one realistic example.
6. Success status code, response schema, and response example.
7. Every expected error status/code and a response example.
8. Pagination, sorting, filtering, and date/currency semantics where applicable.
9. Side effects: records created/updated, audit events, balance changes, reserve changes, or external actions.
10. Idempotency behavior for operations that create payments, imports, or other financial events.

## Endpoint documentation template

```markdown
### `POST /api/v1/obligations/:obligationId/payments`

- **Controller:** `obligations.controller`
- **Authorization:** `owner`, `editor`; obligation must belong to current household.
- **Purpose:** Record a full or partial payment against an open obligation.
- **Path parameters:** `obligationId` — UUID, required.
- **Request body:** `amountMinor`, `currency`, `accountId`, `paidDate`, `description`.
- **Success:** `201 Created`; returns the payment transaction and remaining balance.
- **Expected errors:** `VALIDATION_ERROR` (400), `NOT_FOUND` (404), `CLOSED_PERIOD` (422), `CURRENCY_MISMATCH` (422), `PAYMENT_EXCEEDS_BALANCE` (422).
- **Side effects:** creates transaction, updates obligation balance/status, creates audit entry; all in one database transaction.
- **Tests:** validation, role authorization, household isolation, partial payment, full payment, overpayment, and closed period.
```

## Financial endpoint requirements

The following endpoints require special completeness because they alter financial state:

- `POST /transactions`
- `PATCH /transactions/:transactionId`
- `POST /transactions/:transactionId/void`
- `POST /transactions/:transactionId/mark-paid`
- `POST /obligations/:obligationId/payments`
- `POST /obligations/:obligationId/defer`
- `POST /invoices/:invoiceId/payments`
- `POST /debts/:debtId/payments`
- `POST /tax-reserves/:reserveId/settle`
- `POST /imports/json/preview`
- `POST /imports/:importId/commit`

For these operations, the documentation must explicitly state transaction boundaries, idempotency behavior, audit entries, impacted balances, and rollback behavior if a persistence step fails.

For a preview endpoint, explicitly state that no live records, balances, or
audit events for financial records are created. Document row-level validation
output, reference-resolution semantics, import-size limits, and how reuse of
an `Idempotency-Key` behaves.

## Review checklist

Before accepting a pull request that adds or changes an endpoint, verify:

- The endpoint exists in both the OpenAPI contract and the owning controller documentation.
- Inputs and outputs are typed and have examples.
- All expected domain errors are documented.
- Authorization and household isolation are explicit.
- Unit/controller tests match the documented behavior.
- Financial side effects and audit requirements are clear.
