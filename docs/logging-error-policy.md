# Logging, Errors, and Exceptions Policy

## Goals

The backend must make failures diagnosable without exposing financial or authentication data. It must distinguish expected domain errors from unexpected technical failures, produce stable API errors for clients, and retain an auditable record of financial changes separately from technical logs.

## Structured logging policy

Use structured JSON logs from the Node.js backend. Every log record must include:

| Field                         | Purpose                                                                                                    |
| ----------------------------- | ---------------------------------------------------------------------------------------------------------- |
| `timestamp`                   | UTC ISO 8601 time.                                                                                         |
| `level`                       | `debug`, `info`, `warn`, or `error`.                                                                       |
| `event`                       | Stable machine-readable event name, for example `transaction.created`.                                     |
| `requestId`                   | Correlation ID for an HTTP request, when applicable.                                                       |
| `module`                      | Owning controller/service/repository module.                                                               |
| `userId`                      | Internal actor identifier when authenticated; never email unless explicitly required for a security event. |
| `householdId`                 | Internal household identifier when authorized.                                                             |
| `resourceType` / `resourceId` | Affected resource, where safe and applicable.                                                              |
| `errorCode`                   | Stable domain or technical code for failures.                                                              |

### Log levels

| Level   | Use                                        | Examples                                                                        |
| ------- | ------------------------------------------ | ------------------------------------------------------------------------------- |
| `debug` | Local-development diagnostic details only. | Query timing, parsed filters.                                                   |
| `info`  | Successful meaningful system event.        | Sign-in succeeded, transaction created, import validated.                       |
| `warn`  | Expected but noteworthy condition.         | Forbidden request, validation failure, duplicate import rejected, rate missing. |
| `error` | Unexpected failure or failed dependency.   | Database outage, unhandled exception, failed transaction commit.                |

### Information that must never be logged

- Passwords, reset tokens, session tokens, API keys, cookies, authorization headers, or database connection strings.
- Full financial descriptions, notes, invoice attachments, receipt contents, uploaded file contents, or raw import rows.
- Full monetary amounts unless temporarily enabled for a local, approved diagnostic session; default production logs use resource IDs and event metadata only.
- Personal information beyond the minimum internal identifiers needed to investigate an event.

## Technical logs versus audit records

Technical logs are for diagnosing system behavior and may expire. Audit records are financial-history records and are persistent.

| Technical log                                                | Audit record                                                       |
| ------------------------------------------------------------ | ------------------------------------------------------------------ |
| May be rotated/retained for a configured operational period. | Retained with the household financial history.                     |
| Records request and error metadata.                          | Records who changed what, when, why, and before/after safe values. |
| Must not expose sensitive payloads.                          | Is access-controlled and only contains necessary business data.    |
| May include stack traces for unexpected server failures.     | Never includes stack traces or secrets.                            |

Every successful create, update, void, payment, settlement, defer, import
commit, period close/reopen, and permission change must create an audit record.
An import commit records its import ID, source type, content hash, row counts,
and result summary; it does not copy raw rows into the audit event.

## Error-handling flow

```text
Request
  -> controller validates input and authorization
  -> service executes domain rule
  -> expected domain exception: map to documented 4xx response
  -> unexpected exception: log with requestId and stack, rollback transaction, return generic 500 response
```

- Controllers must not use broad `try/catch` blocks to hide errors or return success after a failure.
- A centralized error handler maps known application errors to API responses.
- Services throw typed domain exceptions for expected invalid states.
- Repositories translate known persistence conflicts to typed errors where possible; raw database errors never reach the API client.
- Unexpected exceptions are logged at `error` level with stack trace in server logs only.
- API clients receive a generic, safe message for `500` errors and the `requestId` needed for support.

## Exception model

Create a base TypeScript class:

```text
AppError
├── code: stable string
├── httpStatus: number
├── publicMessage: safe client-facing text
├── details: optional safe validation metadata
├── isOperational: true
└── cause: optional internal error
```

Expected exceptions extend `AppError`; use them only for known application states, not for normal control flow.

| Exception / code                                             | HTTP | When it is used                                           |
| ------------------------------------------------------------ | ---: | --------------------------------------------------------- |
| `ValidationError` / `VALIDATION_ERROR`                       |  400 | Input fails schema or business-format validation.         |
| `AuthenticationError` / `UNAUTHENTICATED`                    |  401 | No valid signed-in user.                                  |
| `AuthorizationError` / `FORBIDDEN`                           |  403 | User lacks role or household access.                      |
| `NotFoundError` / `NOT_FOUND`                                |  404 | Authorized resource does not exist in household.          |
| `ConflictError` / `CONFLICT`                                 |  409 | Duplicate or conflicting state, such as duplicate import. |
| `BusinessRuleError` / `BUSINESS_RULE_VIOLATION`              |  422 | Generic known financial rule violation.                   |
| `ClosedPeriodError` / `CLOSED_PERIOD`                        |  422 | Change attempted in a closed month.                       |
| `CurrencyMismatchError` / `CURRENCY_MISMATCH`                |  422 | Incompatible currency without authorized conversion.      |
| `InvalidStatusTransitionError` / `INVALID_STATUS_TRANSITION` |  422 | Invalid move, such as voiding a cancelled item.           |
| `PaymentExceedsBalanceError` / `PAYMENT_EXCEEDS_BALANCE`     |  422 | Payment exceeds remaining obligation/debt balance.        |
| `ExchangeRateNotFoundError` / `EXCHANGE_RATE_NOT_FOUND`      |  422 | Required rate is absent for requested conversion.         |
| `ProtectedReserveError` / `PROTECTED_RESERVE`                |  422 | Attempt to treat tax reserve as spendable cash.           |
| `ImportValidationError` / `IMPORT_VALIDATION_FAILED`         |  422 | Staged import has unresolved validation issues.           |

Add a new custom exception only when it represents a stable domain condition that the UI or API client must handle differently. Otherwise use an existing exception type with a specific code or allow the centralized handler to treat it as an unexpected failure.

## Required error response

```json
{
  "error": {
    "code": "PAYMENT_EXCEEDS_BALANCE",
    "message": "The payment exceeds the remaining balance.",
    "fields": {
      "amountMinor": "Must not exceed the remaining balance."
    },
    "requestId": "uuid"
  }
}
```

For unexpected failures:

```json
{
  "error": {
    "code": "INTERNAL_ERROR",
    "message": "An unexpected error occurred. Please try again or contact support with the request ID.",
    "requestId": "uuid"
  }
}
```

## Testing requirements

- Unit-test each service's expected domain exceptions and their codes.
- Controller-test the HTTP status, response body, and safe error output.
- Test that unexpected exceptions return `500`, provide `requestId`, and do not leak stack traces, SQL, secrets, or financial payloads.
- Test that failed multi-record financial operations roll back completely.
- Test audit-event creation for successful financial mutations.

## Local-only phase

Logs remain local while the project has no cloud deployment. Do not commit log files. Before cloud deployment is approved, define the log destination, retention periods, access roles, alerting rules, and incident-response procedure.
