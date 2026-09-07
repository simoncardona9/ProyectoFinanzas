---
name: sensitive-state-mutation
description: Design or change operations that affect money, permissions, inventory, compliance, or other sensitive state. Use for mutations requiring correctness, traceability, and safe failure behavior.
---

# Sensitive State Mutation

Identify the authoritative state, invariant, permitted transition, and failure
semantics before implementation. State assumptions explicitly in code or the
user interface when they influence a calculated or regulated result.

Require explicit inputs for ambiguous operations. Never silently combine units,
currencies, time periods, scopes, or statuses when a conversion, selection, or
transition is required. Preserve original source values beside any derived or
converted result.

For a successful mutation, make the primary state change, its dependent records,
and its audit trail atomic. Record enough safe metadata to answer who changed
what and when without storing secrets or unnecessarily copying sensitive
payloads. Keep technical logs separate from the durable audit history.

For create-like operations that might be retried, define idempotency explicitly.
For conflicts and domain rejections, return stable, safe errors and leave state
unchanged. Test invariants directly, including authorization or tenant scope,
boundary values, duplicate/retry behavior when applicable, and full rollback on
failure.
