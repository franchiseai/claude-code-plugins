---
name: skill-inspect
description: Deep analysis of a specific skill's observation history. Use when the user says "inspect skill", "analyze skill failures", "why is X skill failing", "skill inspection", "debug skill", or "what's wrong with the X skill".
---

# Skill Inspection

Perform a deep analysis of a specific skill's usage history to identify failure patterns and improvement opportunities.

## Workflow

1. **Identify target skill** — Determine which skill to inspect from the user's request. If not specified, read `.claude/skill-evolution/observations.jsonl` and suggest skills with the lowest success rates. Ask the user which one to inspect.

2. **Load observation history** — Read all observations for the target skill from `.claude/skill-evolution/observations.jsonl`. If no observations exist, tell the user and suggest using the skill first.

3. **Timeline analysis** — Present observations chronologically:

```
## Observation Timeline: {skill-name}

| # | Date | Outcome | Corrections | Notes |
|---|------|---------|-------------|-------|
| 1 | 2026-03-10 | completed | 0 | Clean run |
| 2 | 2026-03-12 | partial | 2 | Missed edge case in validation |
| 3 | 2026-03-13 | failed | 0 | Wrong file pattern, had to restart |
| 4 | 2026-03-14 | partial | 1 | Better but still missed X |
```

4. **Failure pattern analysis** — Group failures and partial completions by category:

   - **Missing context** — Skill didn't have enough information to proceed correctly
   - **Wrong approach** — Skill used an incorrect strategy or pattern
   - **Edge case** — Skill failed on an unusual input or scenario
   - **Unclear instructions** — Skill instructions were ambiguous, leading to wrong interpretation
   - **Outdated assumptions** — Skill references patterns/files/APIs that have changed
   - **Scope mismatch** — Skill tried to do too much or too little

   For each category with failures, show:
   - Count of affected observations
   - Specific examples from the notes/errors fields
   - The likely root cause in the SKILL.md

5. **Version comparison** — If `.claude/skill-evolution/versions/{skill-name}/` contains previous versions, compare pre/post-amendment success rates:

```
## Amendment Impact

| Version | Period | Invocations | Success Rate | Change |
|---------|--------|-------------|--------------|--------|
| v1 (original) | Mar 1-10 | 5 | 40% | — |
| v2 (amended Mar 10) | Mar 10-15 | 7 | 71% | +31% |
```

6. **Diagnosis summary** — Provide a concise summary:
   - Top 1-3 failure patterns
   - Specific lines/sections in the SKILL.md that are likely responsible
   - Confidence level (high/medium/low) for each diagnosis

7. **Next step** — Ask: "Would you like me to propose amendments to fix these issues? (Use the `skill-amend` skill)"
