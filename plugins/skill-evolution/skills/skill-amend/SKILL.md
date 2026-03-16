---
name: skill-amend
description: Propose and apply evidence-based amendments to skills based on observation data. Use when the user says "amend skill", "improve skill", "fix the X skill", "skill needs updating", "update skill based on feedback", or "evolve skill".
---

# Skill Amendment

Propose and apply targeted improvements to a skill based on evidence from observation history. Every amendment requires human review and approval.

## Workflow

### Step 1: Gather Evidence

Read `.claude/skill-evolution/observations.jsonl` and filter for the target skill. If no skill is specified, ask which skill to amend. If no observations exist, tell the user there's insufficient evidence and suggest using the skill more before amending.

Require at least 3 observations before proposing amendments (configurable — if the user insists, proceed with fewer but note the limited evidence).

Identify:
- Most common failure patterns
- Specific errors and user corrections
- Notes with actionable feedback

### Step 2: Read Current Skill

Locate and read the target skill's SKILL.md file. Use the Glob tool to find it — typically at `plugins/{plugin-name}/skills/{skill-name}/SKILL.md` or a similar path.

### Step 3: Diagnose

Map each failure pattern to specific sections of the SKILL.md:

- **Missing step** — A workflow gap that causes failures
- **Ambiguous instruction** — Wording that leads to wrong interpretation
- **Wrong default** — A default behavior that doesn't match real usage
- **Missing edge case** — An unhandled scenario that comes up in practice
- **Outdated reference** — A file path, API, or pattern that has changed

For each diagnosis, note:
- The specific line(s) in SKILL.md
- The evidence (observation count, specific error messages)
- The proposed fix category (add/modify/remove/clarify)

### Step 4: Draft Amendment

Write the proposed changes as a clear before/after comparison:

```
## Proposed Amendment: {skill-name}

### Change 1: {brief description}
**Evidence:** {N} observations showed {pattern}
**Category:** {add|modify|remove|clarify}

**Before:**
> {current text from SKILL.md}

**After:**
> {proposed new text}

**Rationale:** {why this change addresses the failure pattern}

### Change 2: ...
```

### Step 5: Human Review

Present the full amendment proposal to the user via AskUserQuestion:

"Here are the proposed amendments to **{skill-name}** based on {N} observations:

{amendment summary — changes, evidence counts, rationale}

Options:
- **Accept all** — Apply all changes
- **Accept with modifications** — Tell me what to change
- **Reject** — Discard the proposal
- **Accept partially** — Specify which changes to apply (by number)

What would you like to do?"

Wait for explicit approval before proceeding. Never apply changes without user consent.

### Step 6: Version Snapshot

Before applying any changes:

1. Determine the next version number by checking `.claude/skill-evolution/versions/{skill-name}/` for existing versions (v1.md, v2.md, etc.)
2. Create the versions directory if needed: `.claude/skill-evolution/versions/{skill-name}/`
3. Copy the current SKILL.md to `.claude/skill-evolution/versions/{skill-name}/v{N}.md`

### Step 7: Apply Changes

Edit the actual SKILL.md file with the accepted changes using the Edit tool. Apply only the changes the user approved.

### Step 8: Log Amendment

Append an amendment record to `.claude/skill-evolution/amendments.jsonl`:

```json
{
  "timestamp": "<ISO 8601>",
  "skillName": "<skill name>",
  "pluginName": "<plugin name>",
  "version": <version number>,
  "previousVersion": <previous version number>,
  "changes": [
    {
      "description": "<brief description>",
      "category": "add|modify|remove|clarify",
      "evidenceCount": <number of supporting observations>
    }
  ],
  "totalObservations": <total observations analyzed>,
  "acceptedChanges": <number of changes accepted>,
  "rejectedChanges": <number of changes rejected>,
  "notes": "<any additional context>"
}
```

### Step 9: Confirm

Tell the user:
- What was changed (brief summary)
- Where the previous version is stored (for rollback)
- Suggest using the skill again and running `/observe` to track improvement
