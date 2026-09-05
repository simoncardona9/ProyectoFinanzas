# Technology Stack Decision

## Decision

Use **TypeScript** for the user interface and API, and **PostgreSQL with SQL** for the database.

| Area | Recommended choice | Why |
|---|---|---|
| User-interface language | TypeScript | Catches common errors before deployment and shares types with the API. |
| User-interface framework | React with Next.js App Router | Responsive web application for desktop and mobile from one codebase. |
| Backend runtime | Node.js | Runs the server-side application and shares the JavaScript ecosystem with the UI. |
| API language | TypeScript | Same language, validation rules, and data types as the UI. |
| API style | REST/JSON route handlers | Clear, simple interface for this application and future mobile clients. |
| Database language | SQL | Best fit for financial relationships, reports, constraints, and transactions. |
| Database engine | PostgreSQL | Strong relational integrity, transactions, foreign keys, and reporting queries. |
| Data-access layer | Drizzle ORM | Type-safe SQL, explicit migrations, and PostgreSQL support without hiding database behavior. |
| Authentication | First-party database authentication | Keeps credentials, sessions, and household authorization under application control. |
| Validation | Zod | Provides shared, type-safe validation for API inputs and forms. |
| Unit and component testing | Vitest with React Testing Library | Fast unit tests plus accessible UI-behavior tests. |
| Formatting | Prettier | Gives the repository one consistent formatting command. |
| Local runtime | Docker Compose | Reproducible local application, migration, and PostgreSQL services. |

## Why this is the right starting point

The first release does not need multiple backend services or different programming languages. A single Node.js application written in TypeScript, with PostgreSQL, keeps development, testing, deployment, and agent coordination simpler. It also allows the UI and server to share precise types for transactions, currencies, dates, roles, and financial statuses.

Docker Compose is the supported way to run the complete local stack on a new
machine. It builds the source checked out from GitHub and runs the application,
Drizzle migrations, and PostgreSQL in separate containers. See
[docker-compose.md](docker-compose.md) for the operating procedure.

TypeScript adds static type checking to JavaScript, which is valuable for financial workflows where a typo in an amount, status, or field name should be caught before execution. [TypeScript documentation](https://www.typescriptlang.org/glossary/) explains its static type system.

Next.js supports a TypeScript UI and server-side route handlers within the same application, so the first version can use one deployable codebase instead of a separate frontend and API service. [Next.js Route Handlers documentation](https://nextjs.org/docs/app/getting-started/route-handlers) describes this capability.

PostgreSQL is preferred over a document database because financial records need transactions, foreign keys, constraints, reliable reporting, and explicit relationships between invoices, payments, debts, and household members. Its transaction model provides atomic and consistent operations. [PostgreSQL transaction processing](https://www.postgresql.org/files/developer/transactions.pdf) describes these guarantees.

## Natural language of the product

- Initial UI language: **Spanish (Uruguay)**.
- Code, database columns, API fields, and technical documentation: **English**.
- The UI must be localization-ready so Portuguese or English can be added later.
- Currency formatting must support UYU and USD independently of the UI language.

## Architectural boundaries

- Start as a modular monolith: one Next.js application, one API surface, one PostgreSQL database.
- Use server-side authorization for every household-scoped operation.
- Keep the API versionable under `/api` even while the web interface calls it internally.
- Do not expose database credentials or query the database directly from the browser.
- Store money as integer minor units or a fixed-precision decimal database type; never rely on JavaScript floating-point arithmetic for balances.
- Every feature implementation must include unit tests before it can be considered complete.

## Mandatory testing decision

Unit tests are mandatory for all production code that contains behavior: services, financial helpers, utilities, validators, authorization policies, and controller mapping logic.

The local runner is Vitest. React components are tested with React Testing Library, and `@testing-library/jest-dom` supplies accessible DOM assertions.

- A change to a business rule or a bug fix must include a test for the changed behavior or regression.
- Financial tests must cover normal, boundary, invalid, and currency/status cases relevant to the change.
- Tests must run in local development and continuous integration before merge or deployment.
- Documentation-only changes do not require unit tests.
- An exception is allowed only when a unit test is technically inapplicable; the pull request must state the reason and include the nearest appropriate test type instead.

## Backend decision

The backend for version 1 will run on **Node.js** and be written in **TypeScript**.

Node.js and TypeScript are complementary, not alternatives: Node.js runs the server; TypeScript is the language used to write the server code before it is compiled to JavaScript. This keeps the UI and API in the same language ecosystem and lets them share validation schemas and data types.

Python is not part of the initial backend. It may be introduced later as an isolated service only if the product needs a genuinely Python-oriented capability, such as advanced forecasting, machine-learning experiments, document processing, or heavier analytical workloads. It must not become a second backend language without a documented need and integration boundary.

## Deferred choices

These decisions should be made during implementation, after comparing current pricing, data residency, backup, and operating requirements:

- Cloud platform and managed PostgreSQL provider.
- UI component library and styling system.
- Notification provider.

Continuous integration is deferred until the repository is pushed to GitHub. Until then, the same test, type-check, lint, and format checks run locally.

## Explicit non-decisions

- No native iOS/Android app in version 1; the responsive web app is accessible from anywhere.
- No microservices in version 1.
- No NoSQL database for core financial records.
- No bank integration until the core application is secure and proven.
