---
name: project-structure-design
description: Establish or revise a project's architecture documents and repository layout before substantial implementation. Use when starting a system or when its folders and module boundaries need deliberate structure.
---

# Project Structure Design

Start with the system's boundaries, not a folder template. Identify the user
outcomes, data ownership, security or tenancy boundaries, external interfaces,
operational constraints, and the deployment shape appropriate to the present
scope. Prefer the simplest deployable architecture that meets those needs;
avoid splitting services before a concrete boundary requires it.

Write the architectural decisions that future implementation depends on before
creating broad application code. Select only the documents the project needs:
architecture and deployment shape, technology decisions, data model, business
rules and invariants, API or interface contracts, security/privacy decisions,
and an incremental development plan. Link them clearly and keep a decision
separate from an unapproved idea or future option.

Design the repository so top-level folders distinguish application code,
documentation, infrastructure/configuration, database schema and migrations,
tests, and project tooling. Inside application code, organize by feature or
bounded domain when that keeps related UI, transport, validation, services,
rules, persistence, and tests easy to find. Keep cross-cutting, genuinely
shared concerns—such as authentication, errors, money/date handling, UI
primitives, or database access—in a small shared area. Do not make a shared
folder a dumping ground.

Make dependency direction visible: delivery/UI code calls application or domain
services; services apply rules and coordinate persistence; repositories own
database queries; schemas validate external input. Keep framework-specific
details at the edge where practical. Co-locate tests with the behavior they
protect unless the test type has a clear separate home.

Before implementation, verify that a new contributor can answer: where a
feature belongs, which document defines its behavior, which layer owns a rule,
where a schema migration goes, and how to run required checks. Adapt the layout
to the selected stack and existing conventions rather than forcing this example
structure onto every project.
