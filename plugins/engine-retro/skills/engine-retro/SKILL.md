---
name: engine-retro
description: Post-feature friction retro for AI Engine features. Use ONLY when explicitly invoked via /engine-retro or when the user explicitly asks to review how annoying an engine feature was to build / where the engine got in the way. Never auto-trigger; this is an end-of-feature ceremony.
---

# AI Engine Friction Retro

After an AI Engine feature ships (or wraps), review how annoying it was to implement: where the engine's structures got in the way, needed workarounds, or forced boilerplate. The goal is that every new feature makes the *next* feature easier — findings become Linear tickets with proposed fixes, not a vent log.

**Announce at start:** "I'm using the engine-retro skill to review the engine friction on this feature."

## Ground Rules

1. **Scope: engine interaction only.** Friction with recipes, apertures/descriptors, registrations, seams, runtimes, terminals, surfacing, telemetry/Langfuse instrumentation, engine trigger/event plumbing, and the engine test harness. General codebase pain (SDK, frontend, review process) is out of scope — note it in one line if it comes up, then move on.
2. **Record faithfully, don't rank.** No severity scores, no prioritization — the user triages. Your job is accurate findings with evidence.
3. **Every finding cites evidence** — a `file:line` of the workaround, a commit, or "reported in interview" if it never reached code.
4. **Findings are about the engine, not the dev.** "The registration API required X to be repeated in three places" — never "the implementation duplicated X".

## Phase 1 — Mine the Evidence

Identify the feature branch (argument, or current branch — confirm) and diff it against master, scoped to engine surfaces:

```bash
git diff master...HEAD --stat -- 'apps/backend/src/api/ai-engine/**'
git diff master...HEAD -- 'apps/backend/src/api/ai-engine/**'
```

Engine surfaces (as of 2026-07: `apps/backend/src/api/ai-engine/{aperture,features,recipes,registrations,runs,skills,surfacing,telemetry,terminals}`) plus any engine-owned inngest functions and Langfuse instrumentation the feature touched. If the layout has moved, follow the code, not this list.

Read the diff hunting for friction signatures:

- **Workaround markers**: TODO / HACK / XXX / "workaround" / "for now" comments; `any` or `as` casts around engine types; `eslint-disable` near engine calls.
- **Bypasses**: code that goes around an engine abstraction instead of through it (direct DB reads where an entity/aperture exists, hand-rolled prompts where a recipe should compose, manual event emission where the engine has plumbing).
- **Copy-paste boilerplate**: blocks near-identical to a previous feature's registration/recipe/terminal wiring. Diff against the sibling feature to confirm.
- **Special-casing in shared code**: edits to shared engine files that branch on this one feature (a `if (task === 'x')` in a shared runtime is the engine admitting it lacked an extension point).
- **Invented knobs**: new config/env vars or parameters added because no existing seam carried what the feature needed.
- **Churn**: `git log master..HEAD --oneline` — repeated `fix:` commits against the same engine file usually mark a spot where the engine's behavior wasn't understandable up front.

Also check the session's own history if the feature was built in this conversation: dead ends, engine source you had to read to figure out an interface, and traps hit are all evidence even when nothing landed in the diff.

## Phase 2 — Interview the Dev

The diff can't show time lost or uncommitted dead ends. Ask (AskUserQuestion, one round, adapt to what Phase 1 found):

- What single engine interaction took the longest relative to how hard it *should* have been?
- What did you copy-paste from a previous feature because there was no better way?
- Where did you have to read engine source (rather than a type signature or doc) to figure out what to do?
- Anything you tried, abandoned, and never committed?

Fold answers into the findings; tag them "reported in interview" where there's no code citation.

## Phase 3 — Findings

Present each finding in this shape, in the order encountered (no ranking):

```
### <short name of the friction>
**What happened:** one or two sentences.
**Workaround:** what the feature did instead, with file:line.
**What the engine should offer:** the missing affordance, stated as a capability.
**Proposed fix:** (where the fix is small/clear) a code sketch or spec paragraph
  drafted right here. For larger ones, a scoped description of the change is enough —
  don't design a refactor inside a retro.
```

Keep out-of-scope pain (rig, SDK, process) in a single short "Out of scope, noting anyway" list at the end, one line each, no fixes.

## Phase 4 — Ticket

1. Present the findings and ask which should become Linear tickets (default: all engine findings, none of the out-of-scope list).
2. Confirm the Linear team/project to file against before creating anything — do not assume.
3. File each ticket via the Linear MCP if connected. Ticket body = the finding verbatim (what happened / workaround with citations / proposed fix), plus the feature branch name. Title format: `Engine DX: <short name>`.
4. If no Linear MCP is available, output each ticket as a ready-to-paste markdown block instead and say so plainly.

Close by listing what was filed (ticket IDs) and what was skipped.
