# Agent Development Workflow

This document defines how coding agents should work on the application once development starts.

All work must follow the incremental slice process in [development-process.md](development-process.md). An agent must implement and validate the current approved slice only; it must not begin later roadmap features opportunistically.

All source-control work must follow [git-workflow.md](git-workflow.md). Agents must never push or merge directly into `main`; only Simon (`simoncardona9`) approves and merges pull requests to that branch.

## Before implementation

1. Read this documentation folder and inspect the existing repository.
2. Create or update a short implementation plan.
3. Identify data migrations, security impact, and financial-calculation impact.
4. Do not alter financial source data without explicit approval.

## Task boundaries

Split work into independently testable tasks, for example:

- Authentication and household authorization.
- Database schema and migrations.
- Transaction entry and validation.
- Dashboard calculations.
- Debt tracking.
- Import pipeline.
- Tests and documentation.

Avoid concurrent edits to the same schema, configuration, or core calculation files unless coordinated.

## Definition of done for a change

- Requirements and business rules are identified.
- Input validation and authorization are implemented.
- Unit tests are mandatory for every new or changed behavior; relevant automated tests pass.
- Currency and date handling are covered by tests where applicable.
- No production secrets or real household finance data are committed.
- Documentation is updated when behavior, model, or API changes.
- Every changed endpoint has updated contract documentation, expected error codes, and response examples.

## Financial-calculation safeguards

- Use decimal-safe money values.
- Test UYU/USD conversions with explicit rates.
- Test paid, pending, deferred, and cancelled states.
- Make formula assumptions visible in code and user interface.
- Include reconciliation tests: dashboard totals must equal underlying records.

## Mandatory unit-test policy

1. Write or update unit tests as part of the implementation task, not as optional follow-up work.
2. Test services, helpers, utilities, validation, authorization, and calculation logic independently of HTTP and the database where possible.
3. Add a regression test whenever correcting a defect.
4. Do not mark a coding task complete if its relevant unit tests are absent or failing.
5. If a unit test is genuinely inapplicable, document why in the pull request and add the closest suitable integration, controller, or end-to-end test.

## Stack constraint

- Version 1 backend work uses Node.js and TypeScript.
- Do not introduce Python or a separate backend service unless the task specifically requires advanced analytics, forecasting, machine learning, or document processing and the architectural impact is documented first.

## Logging and exceptions constraint

- Follow [logging-error-policy.md](logging-error-policy.md) for structured logs, safe error output, audit records, and custom exceptions.
- Do not log secrets, raw financial payloads, attachments, or full imported data.
- Do not return raw database errors, stack traces, or internal exception messages to an API client.
- Document every endpoint according to [api-documentation-policy.md](api-documentation-policy.md).

## Pull-request checklist

- What user problem does this solve?
- Which requirements and business rules changed?
- How was it tested?
- Does it expose, modify, or import financial data?
- Does it alter spendable-cash, tax-reserve, debt, or forecast calculations?
- Is a migration or rollback plan required?
