---
name: module-boundary-change
description: Implement a backend or full-stack capability through clear controller, validation, service, repository, and domain-rule boundaries. Use when an application already follows layered modules.
---

# Module Boundary Change

Follow the project's existing module boundaries instead of introducing a second
architecture. Put transport parsing and HTTP response mapping in the controller
or route, structural input validation in schemas, business decisions in rules or
services, and persistence queries in repositories.

Obtain the authenticated scope before reading or writing data. Pass that scope
explicitly to repositories and apply it in every resource lookup and mutation;
an identifier alone must not select another tenant's resource. Check write roles
at the transport boundary and retain domain checks in the service when they are
needed for correctness.

Use typed, stable domain errors for expected invalid states. Map them to safe
client responses at the application's established error boundary; do not expose
database errors, stack traces, or implementation details.

Keep schema changes, generated migrations, and repository logic coherent. A
multi-record state change belongs in one database transaction so an error cannot
leave partially applied state. Add focused tests at the smallest useful layer:
rules for pure decisions, services for orchestration and errors, repositories or
controllers only for behavior those layers uniquely own.
