# Architecture

## Recommended shape

Build a responsive web application backed by first-party, database-managed authentication and a PostgreSQL database. Keep the first version as one deployable application with a modular internal design; do not begin with microservices.

```text
Browser / mobile web
        |
Application UI and API
        |
Authentication + authorization
        |
Business rules / reporting layer
        |
Managed relational database + encrypted backups
        |
Object storage for receipts and imports
```

## Design principles

- Relational data model for financial integrity and reporting.
- Server-side authorization on every household-scoped query.
- Database transactions for multi-step actions such as applying a debt payment.
- Immutable audit trail for posted financial records.
- Unit tests are mandatory for every new or changed business rule, service, helper, utility, and calculation.
- No calculation should depend on a hidden spreadsheet cell or a fixed row range.
- Import files are staged, validated, and reviewed before affecting live balances.

## Technology selection criteria

The application language and database direction are defined in [technology-stack.md](technology-stack.md). The hosting provider can be selected when implementation begins, but it must provide:

- PostgreSQL-compatible relational database.
- Row-level household data isolation or equivalent server-enforced authorization.
- Automated backups and export capability.
- Secure secrets management and HTTPS by default.

## Authentication design

- Users authenticate with an email and password stored in the application database; no external authentication provider is used in version 1.
- Passwords are hashed with Argon2id. Plain-text passwords are never stored or logged.
- The initial owner account and subsequent users are created through a controlled administrative database process; public self-registration is not available.
- User-facing monetary inputs use Spanish Uruguay notation (`1.234,56`) and are
  converted at the UI boundary to integer minor units before reaching domain
  services or the database.
- Local development includes an owner-confirmed test-data reset that is disabled
  in production and scoped to the active household's financial structure,
  transactions, obligations, payment links, and audit records. It preserves
  users, memberships, sessions, and household settings.
- A successful login creates a random, opaque, revocable session token. Only its hash is stored in the database.
- The raw token is issued only in an `HttpOnly`, `Secure`, `SameSite=Lax` cookie. It is not exposed to browser JavaScript or stored in local storage.
- Every request resolves the session server-side, then applies household membership and role authorization.

## Initial API areas

- `/households`, `/memberships`
- `/accounts`, `/categories`, `/transactions`
- `/obligations`, `/invoices`, `/debts`, `/tax-reserves`
- `/dashboard`, `/reports`, `/imports`
- `/grocery-plans`, `/markets`, `/products`, `/market-prices` (planned after the core finance workflow)

The detailed controller, service, repository, and endpoint design is defined in [backend-api-design.md](backend-api-design.md).
