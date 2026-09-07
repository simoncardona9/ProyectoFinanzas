---
name: delivery-evidence
description: Validate and document a completed code change with evidence appropriate to its risk. Use before handing off a feature, fix, migration, API, or behavior change.
---

# Delivery Evidence

Derive verification from the changed behavior and its risks; do not treat a
generic command list as proof. Run the project's relevant unit or integration
tests, type checks, linting, formatting checks, and build checks when those are
available and proportionate. For persistence changes, also run the repository's
migration or schema validation.

Review the diff for scope, accidental generated output, secrets, and updates to
contracts or documentation. Compare each API operation with its public contract:
inputs, responses, status codes, authorization, errors, side effects, and
idempotency when relevant must agree.

Perform a focused manual flow for behavior that automation does not establish,
especially user interaction, responsive behavior, authorization, or a derived
total. Use synthetic or approved test data for sensitive domains.

Hand off concise evidence: what outcome changed, the checks and manual flows
run with their result, documentation or migration effects, and any remaining
limitation. Do not claim a check passed if it was not run; explain the precise
reason and impact instead.
