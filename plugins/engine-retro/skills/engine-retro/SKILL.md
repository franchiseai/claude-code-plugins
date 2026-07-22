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

**The usual case: the retro runs in the same session that built the feature.** Then the conversation itself is the richest evidence — better than the diff, because it holds what never got committed. Before touching git, walk back through the session and collect:

- every point where you (the assistant) had to read engine source to figure out an interface, because the types/docs didn't carry it
- approaches tried and abandoned — the dead ends the diff will never show
- workarounds you wrote and why (you know the reason; the diff only shows the result)
- traps hit (silent failures, misleading errors, test-harness fights) and how long each detour ran
- anything you flagged to the user mid-build as awkward or surprising

Write these down as draft findings FIRST, then use the diff pass below to attach `file:line` citations and catch what you'd already normalized as "just how it works" — the friction a session stops noticing is exactly what the retro exists to record.

**Fresh-context fallback:** if this session didn't build the feature, say so, note that uncommitted dead ends are invisible to you, and lean correspondingly harder on the diff pass and the Phase 2 interview.

Either way, identify the feature branch (argument, or current branch — confirm) and diff it against master, scoped to engine surfaces:

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

## Phase 2 — Interview the Dev

Skip anything the session history already answered — in a same-session retro this phase is a short gap-check, not a full interview; present your draft findings and ask what's missing or mischaracterized. In a fresh context, ask the full set (AskUserQuestion, one round, adapted to what Phase 1 found):

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
