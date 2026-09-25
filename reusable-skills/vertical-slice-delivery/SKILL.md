---
name: vertical-slice-delivery
description: Plan, track, and deliver one small end-to-end product capability using a maintained development process and progress record. Use for scoped feature work, not isolated refactors.
---

# Vertical Slice Delivery

Work toward one independently reviewable user outcome. Keep the slice small
enough to validate in a single delivery cycle; record adjacent ideas as follow-up
work rather than incorporating them.

Before editing, identify the outcome, acceptance conditions, invalid cases, and
the boundary of the current task. Inspect the repository conventions and the
current roadmap or requirements before choosing an implementation shape.

Maintain two complementary planning artifacts when the work spans more than a
small fix. The development-process document is the forward-looking plan: ordered
steps, each step's goal, scope boundary, acceptance criteria, and rules for
advancing to the next step. The development-progress document is the factual
record: completed and active slices, the behavior delivered, verification
evidence, accepted limitations, and follow-up work. Read both before starting a
slice; update the plan only when the intended scope or sequencing changes, and
update progress when work has observable evidence.

Split a broad step into smaller slices until each has one useful user outcome,
clear acceptance conditions, and a reviewable risk surface. Do not begin a
later slice merely because its foundations are nearby. If a discovery changes a
future plan, record it as a decision or follow-up rather than silently expanding
the active slice.

## Change handling

Treat a development step as a planning boundary, not a single indivisible
implementation task. Before accepting a newly discovered requirement, defect,
or technical constraint into an active slice, compare it with that slice's
user outcome, acceptance conditions, and risk surface.

Keep it in the active slice only when it is necessary to make the already
approved outcome correct, safe, or usable. Create or revise a separate slice
when it introduces another user outcome, independently reviewable behavior,
new financial or authorization risk, a distinct migration concern, or a
meaningful alternative in product decisions. State the dependency and order of
the slices in the development-process document; retain the factual decision,
scope change, and verification evidence in the development-progress document.

When a defect threatens data integrity, authorization, or financial
calculations, prioritize its correction before convenience work. Otherwise,
record adjacent ideas as follow-up work and continue only with the approved
slice. Do not describe an unsliced expansion as a minor implementation detail.

Trace the whole path needed for the outcome: user interaction, input contract,
authorization, domain behavior, persistence, observability or audit needs, and
the way the result is presented. Change only the layers actually needed. Do
not create empty abstractions merely because other layers exist.

Treat the acceptance conditions as the review plan. Cover the successful path,
the meaningful rejected states, and any changed permission, date, currency, or
state-transition behavior. Update the user-facing and technical documentation
that defines the changed behavior. Finish by running the repository's relevant
automated checks and a focused manual flow when one is available.
