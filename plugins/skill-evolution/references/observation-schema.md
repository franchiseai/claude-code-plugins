---
name: observation-schema
description: Schema documentation for skill-evolution JSONL storage formats
---

# Skill Evolution Data Schemas

All data is stored in `.claude/skill-evolution/` within the project directory.

## observations.jsonl

Append-only log of skill executions. One JSON object per line.

### Fields

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `timestamp` | string (ISO 8601) | yes | When the observation was recorded |
| `sessionId` | string | yes | Claude Code session identifier |
| `skillName` | string | yes | Name of the skill as invoked |
| `pluginName` | string | no | Name of the plugin containing the skill |
| `taskSummary` | string | no | Brief description of what the skill was used for |
| `outcome` | enum | yes | One of: `completed`, `partial`, `failed`, `abandoned`, `pending` |
| `errors` | string[] | no | Array of error descriptions encountered |
| `userCorrections` | number | no | Count of times user corrected the skill's output |
| `notes` | string | no | Free-text context or feedback |

### Outcome Definitions

- **completed** — Skill achieved its goal without issues
- **partial** — Skill mostly worked but required manual fixes or missed something
- **failed** — Skill did not achieve its goal
- **abandoned** — User gave up on the skill and took a different approach
- **pending** — Auto-recorded by hook; outcome not yet assessed (will be updated by Stop hook or `/observe`)

### Example

```json
{"timestamp":"2026-03-15T10:23:45Z","sessionId":"abc-123","skillName":"domain-refactor","pluginName":"domain-refactor","taskSummary":"Refactor leads domain to entity pattern","outcome":"completed","errors":[],"userCorrections":0,"notes":""}
{"timestamp":"2026-03-15T14:10:00Z","sessionId":"def-456","skillName":"pr-description","pluginName":"pr-description","taskSummary":"Write PR for auth refactor","outcome":"partial","errors":["Missed test plan section"],"userCorrections":2,"notes":"Had to manually add test plan items"}
```

## amendments.jsonl

Log of proposed and applied skill amendments. One JSON object per line.

### Fields

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `timestamp` | string (ISO 8601) | yes | When the amendment was applied |
| `skillName` | string | yes | Name of the amended skill |
| `pluginName` | string | no | Name of the plugin containing the skill |
| `version` | number | yes | New version number after amendment |
| `previousVersion` | number | yes | Version number before amendment |
| `changes` | object[] | yes | Array of change descriptions |
| `changes[].description` | string | yes | Brief description of the change |
| `changes[].category` | enum | yes | One of: `add`, `modify`, `remove`, `clarify` |
| `changes[].evidenceCount` | number | yes | Number of observations supporting this change |
| `totalObservations` | number | yes | Total observations analyzed for this amendment |
| `acceptedChanges` | number | yes | Number of proposed changes the user accepted |
| `rejectedChanges` | number | yes | Number of proposed changes the user rejected |
| `notes` | string | no | Additional context about the amendment |

### Example

```json
{"timestamp":"2026-03-15T16:00:00Z","skillName":"pr-description","pluginName":"pr-description","version":2,"previousVersion":1,"changes":[{"description":"Added explicit test plan step","category":"add","evidenceCount":4},{"description":"Clarified summary length guidance","category":"clarify","evidenceCount":2}],"totalObservations":12,"acceptedChanges":2,"rejectedChanges":0,"notes":""}
```

## Version Snapshots

Previous versions of SKILL.md files are stored at:

```
.claude/skill-evolution/versions/{skill-name}/v{N}.md
```

- `v1.md` is always the original SKILL.md before any amendments
- Version numbers increment with each amendment
- Files are full copies of the SKILL.md at that point in time
- Use these for rollback or pre/post comparison in `skill-inspect`
