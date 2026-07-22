---
name: ai-feature-loop
description: Run a quality-improvement loop on an AI Engine feature — trigger runs, judge outputs against a rubric via Langfuse, iterate on prompts in autonomous batches with review at batch boundaries.
user_invocable: true
argument-hint: <feature>
---

# Run the AI Feature Quality Loop

Read `${CLAUDE_PLUGIN_ROOT}/skills/ai-feature-loop/SKILL.md` and follow it exactly.

The feature to loop on: $ARGUMENTS

If no feature was given, ask which AI Engine feature to loop on before doing anything else.
