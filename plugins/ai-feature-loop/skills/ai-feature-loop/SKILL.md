---
name: ai-feature-loop
description: Human-and-AI-in-the-loop quality improvement for AI Engine features. Use ONLY when explicitly invoked via /ai-feature-loop or when the user explicitly asks to "quality-loop", "run the loop on", or "iterate on" an AI feature's prompts. Never auto-trigger during normal feature development.
---

# AI Feature Quality Loop

Improve a new AI Engine feature by looping it: trigger real runs, judge the outputs against an agreed rubric using Langfuse traces, and improve the prompts one change at a time. The human sets direction at batch boundaries; iterations inside a batch run autonomously.

**Announce at start:** "I'm using the ai-feature-loop skill to quality-loop this feature."

## Hard Rules

1. **Scope: AI Engine features only.** The loop assumes an engine run traced in Langfuse (seam metadata, run_id). For non-engine AI features, tell the user this skill doesn't apply.
2. **Autonomous changes are prompt/recipe text ONLY** — system prompts, recipe instructions, few-shot examples, output-format specs. Context assembly, model/params, tool availability, and feature code changes go on a **proposals queue** and wait for the human's approval at the batch boundary. Never make them mid-batch.
3. **One change per iteration.** Two changes at once means you can't attribute the score delta.
4. **Loop on the dev model override** (`AI_ENGINE_DEV_MODEL` in `apps/backend/.env`). Improvements are tuned to that model, not the prod-pinned one — every final digest must remind the human to spot-check on the prod model before shipping.
5. **Verdicts live in Langfuse scores**, not local files. Every judged run gets scores pushed to its trace (see Judging below).

## Phase 0 — Preflight

Check the rig (concrete commands in `references/rig.md`):

- Backend running at :4000 (tsx-watch; it runs whatever branch the main fsai checkout is on)
- Inngest dev server at :8288
- Langfuse at :3005, keys readable from `apps/backend/.env`
- `AI_ENGINE_DEV_MODEL` override set

If anything is down, list exactly what to start and stop until it's up. Do not loop against a half-up rig — silent failures look like quality problems.

## Phase 1 — Setup (with the human)

1. **Identify the feature**: which seam task / recipe, the triggering inngest event and payload, the target dev brand. Suggest one of the enriched persona brands (see `references/rig.md`) unless the user has a better fixture.
2. **Baseline run**: trigger once, read the trace and the persisted output end-to-end. Confirm you can see the full input (system + prompt), the output, and where the output lands (DB row, artifact).
3. **Draft the rubric with the user.** 3–7 criteria covering tone, structure, must-include facts, and known failure modes. Each criterion gets:
   - a kebab-case Langfuse score name, namespaced `loop/<feature>/<criterion>` (e.g. `loop/funnel-emails/brand-voice`)
   - a scoring rule: binary (0/1) or graded (0–1) with what each level means
4. **Agree the loop parameters**: batch cap (default 5 iterations), and which output surface gets judged.

**Checkpoint — do not proceed without it.** Present the rubric, the baseline scores, and the loop plan. The user approves or adjusts before any batch starts.

## Phase 2 — Autonomous Batch

Each iteration:

1. **Trigger** a run (inngest event via MCP, raw POST fallback — see `references/rig.md`).
2. **Fetch the trace** once the run completes. Verify the output is real before judging: an observation with `usage 0/0, output null` is a silent rig failure, not a quality signal — stop and fix the rig, don't score it.
3. **Judge** every rubric criterion against the output. Push one Langfuse score per criterion to the trace, plus `loop/<feature>/overall` (mean or agreed weighting). The overall score's `comment` is the iteration ledger entry: one line stating what changed since the previous iteration and the judged effect.
4. **Check convergence.** The batch ends when any of these hits:
   - every criterion passes (full rubric pass)
   - two consecutive iterations with no improvement in overall score (plateau)
   - the batch cap is reached
5. **Improve**: make ONE focused prompt-text change targeting the worst-failing criterion. If the best fix for that criterion is not a prompt-text change, add it to the proposals queue with a one-line rationale and pick the next-best prompt-level fix instead. If no prompt-level fix remains for any failing criterion, end the batch early — that's a finding, not a failure.

## Phase 3 — Batch Digest (with the human)

Present, in this order:

1. **Score trajectory**: table of iteration × criterion with trace IDs, so every verdict is clickable in Langfuse.
2. **What changed**: per iteration, a short summary of the prompt edit and its effect. Show the cumulative prompt diff if asked.
3. **Verdict**: converged / plateaued / capped, and your read on why.
4. **Proposals queue**: every non-prompt change you wanted to make, with rationale. The user approves, rejects, or defers each.
5. **The dev-model caveat**: these improvements were tuned on the dev override model. Recommend a prod-model spot check before shipping.

The user then decides: run another batch (possibly with an updated rubric or approved proposals applied), or finish. Approved proposals get applied *between* batches, one at a time, so the next batch's baseline is clean.

## Traps (learned the hard way on the funnel-email loop)

- **NVIDIA endpoint + tool schemas = empty body.** Passing `tools` to `streamText` against the NVIDIA OpenAI-compatible endpoint returns 0 tokens with no error. Toolless runs must omit `tools` entirely, not just gate execution.
- **Langfuse keys in `.env` are quoted** — strip the quotes before using them in basic auth.
- **The inngest MCP connects flakily** — fall back to a raw `POST :8288/e/dev` without ceremony.
- **Backend hot-swaps branches.** The :4000 tsx-watch serves whatever branch the main fsai checkout is on. Confirm the checkout is on the feature branch before every batch.
- **Multiple GENERATION observations in one span = provider retries.** A 0-token first attempt means an empty provider response that got retried — it doubles latency but isn't a quality signal.
