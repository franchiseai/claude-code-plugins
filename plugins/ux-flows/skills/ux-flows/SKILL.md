---
name: ux-flows
description: Use when writing UX flow docs for a design team, cleaning up meeting notes into user journeys, or when someone asks for user-facing flow documentation. Triggers on "UX flows", "user flows", "design handoff", "clean up these flows", or preparing specs for a UI/UX team.
---

# UX Flows

Turn meeting notes and technical specs into clean UX flow docs for design teams.

## Process

1. **Identify the audience** — these docs are for UI/UX designers. They need to know what the user does and what states matter. They do NOT need database fields, implementation details, or layout prescriptions.

2. **Strip implementation details** — remove all references to: table names, column names, status enums, API calls, database behavior, FK relationships, record creation logic. Translate technical states into user-facing language.

3. **Strip layout prescriptions** — remove references to: "left panel", "sidebar", "footer buttons", "split layout", "modal vs page". The design team decides how to arrange screens. Describe what happens, not where things go.

4. **Keep edge cases and states** — the design team DOES need to know: what states exist, what warnings to surface, what happens when things go wrong, what's optional vs required. Describe these in user terms.

5. **Ask clarifying questions** — challenge assumptions in the source material. Common issues: coupling scheduling with readiness, requiring fields that should be optional, prescribing flows that should be flexible.

## Output

Write to `docs/plans/YYYY-MM-DD-<topic>-ux-flows.md`. Target ~1 page. Structure as numbered flows with entry points, user actions, and key states.

## Principles

- **Describe what, not how** — "user sets a target date" not "date picker component with timezone selector"
- **Decouple orthogonal concerns** — if two things are independent (e.g. scheduling and readiness), present them as independent indicators, not a combined state
- **Everything optional by default** — question any flow that forces the user through steps. Can they skip? Come back later? Do things in any order?
- **States in user language** — "Needs attention" not `status = invalid`. "3/5 channels ready" not `posts.where(status: 'ready').count`
- **Edge cases as bullets, not flows** — disconnecting with scheduled posts, deleted assets, partial failures — describe the user impact in a sentence, don't diagram the backend cascade
