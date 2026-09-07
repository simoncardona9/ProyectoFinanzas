---
name: vertical-slice-delivery
description: Plan and deliver one small end-to-end product capability when a change could span UI, API, persistence, and tests. Use for scoped feature work, not isolated refactors.
---

# Vertical Slice Delivery

Work toward one independently reviewable user outcome. Keep the slice small
enough to validate in a single delivery cycle; record adjacent ideas as follow-up
work rather than incorporating them.

Before editing, identify the outcome, acceptance conditions, invalid cases, and
the boundary of the current task. Inspect the repository conventions and the
current roadmap or requirements before choosing an implementation shape.

Trace the whole path needed for the outcome: user interaction, input contract,
authorization, domain behavior, persistence, observability or audit needs, and
the way the result is presented. Change only the layers actually needed. Do
not create empty abstractions merely because other layers exist.

Treat the acceptance conditions as the review plan. Cover the successful path,
the meaningful rejected states, and any changed permission, date, currency, or
state-transition behavior. Update the user-facing and technical documentation
that defines the changed behavior. Finish by running the repository's relevant
automated checks and a focused manual flow when one is available.
