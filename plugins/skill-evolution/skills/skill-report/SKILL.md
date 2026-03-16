---
name: skill-report
description: Display a health dashboard for all skills based on observation data. Use when the user says "skill health", "skill report", "how are my skills doing", "skill stats", "skill dashboard", or invokes /skill-health.
---

# Skill Health Report

Generate a dashboard showing the health and usage of all observed skills.

## Workflow

1. **Load data** — Read `.claude/skill-evolution/observations.jsonl` and `.claude/skill-evolution/amendments.jsonl` (if they exist). If neither file exists, tell the user no observations have been recorded yet and suggest using skills then running `/observe` or waiting for the hooks to capture data.

2. **Parse observations** — For each unique skill name, calculate:
   - **Total invocations** — count of observation records
   - **Outcomes** — count per outcome type (completed, partial, failed, abandoned, pending)
   - **Success rate** — completed / (total - pending) as percentage
   - **Last used** — most recent timestamp
   - **User corrections** — total correction count across all observations
   - **Error patterns** — most common errors (if any)

3. **Parse amendments** — For each skill, count:
   - **Amendment count** — number of amendments applied
   - **Last amended** — most recent amendment timestamp

4. **Display dashboard** — Present as a markdown table:

```
## Skill Health Dashboard

| Skill | Invocations | Success Rate | Last Used | Amendments | Status |
|-------|-------------|--------------|-----------|------------|--------|
| pr-description | 12 | 83% | 2026-03-15 | 2 | ✅ Healthy |
| domain-refactor | 5 | 40% | 2026-03-14 | 0 | ⚠️ Needs attention |
| code-cleanup | 1 | 100% | 2026-03-10 | 0 | ✅ Healthy |
```

**Status thresholds:**
- ✅ Healthy: success rate >= 75%
- ⚠️ Needs attention: success rate 50-74% OR corrections > 3
- 🔴 Failing: success rate < 50%
- 💤 Stale: no usage in 30+ days

5. **Highlight issues** — Below the table, list any skills that need attention with a brief note on the most common failure pattern. Suggest running `skill-inspect` on problematic skills.
