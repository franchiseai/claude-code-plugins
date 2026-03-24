# FSAI Content Generator Skill Design

## Overview

Convert the standalone `fsai-content-generator` into a skill within the existing `fsai-workflow-actions` plugin. The skill provides Claude with schema knowledge, asset reference rules, and a bundled validator so a teammate can generate FSAI portal and sequence JSON import files from any onboarding workspace.

## Context

- The `fsai-content-generator/` directory contains a CLAUDE.md with JSON schemas and workflow instructions, plus a `validate.ts` script
- The `fsai-workflow-actions/` plugin skeleton already exists with a proper `.claude-plugin/plugin.json`
- A teammate will use this skill in their dedicated onboarding workspace to generate content for brand onboarding

## Approach

**Schema-in-skill**: Embed all JSON schemas, asset reference rules, and workflow instructions directly in SKILL.md. Bundle `validate.ts` in `references/`. No external dependencies beyond `npx tsx`.

## File Structure

```
fsai-workflow-actions/
├── .claude-plugin/
│   └── plugin.json           # Already exists
├── skills/
│   └── content-generator/
│       ├── SKILL.md           # Full skill: schemas + rules + workflow
│       └── references/
│           └── validate.ts    # Bundled validator (copied from fsai-content-generator)
```

## Skill Behavior

### Trigger Phrases

"generate content", "content generator", "portal json", "sequences json", "fsai content", "brand onboarding content"

### Workflow

1. **Setup** — If `metadata/` and `output/` directories don't exist in the current workspace, create them
2. **Metadata check** — Look for a `metadata/*.json` file. If none found, tell the user they need to export one from the FSAI admin panel and place it there
3. **Schema knowledge** — SKILL.md contains the full Portal and Sequences JSON schemas (ImportPortalJson, ImportSequencesJson and all nested types), asset reference rules, and form reference rules
4. **Generation** — User drives content generation through conversation. Claude uses the embedded schemas and metadata to produce valid JSON
5. **Validation** — After generating output files:
   a. Copy `validate.ts` from `${CLAUDE_PLUGIN_ROOT}/skills/content-generator/references/validate.ts` to the workspace root (if not already present)
   b. Run `npx tsx validate.ts`
   c. If errors: fix and re-validate
   d. If only warnings: present output to the user with warnings noted
6. **Output** — Files written to `output/portal.json` and/or `output/sequences.json`

### Schemas Embedded in Skill

The following schemas from the current CLAUDE.md will be embedded directly in SKILL.md:

- `ImportPortalJson` — top-level portal structure (title, subtitle, sections)
- `ImportPortalSectionJson` — section with title, subtitle, emoji, steps
- `ImportPortalStepJson` — step with action type, asset/form references, flags
- `ImportSequencesJson` — top-level sequences wrapper
- `ImportSequenceJson` — sequence with name, event, department, emails
- `ImportSequenceEmailJson` — email with subject, body markdown, delay

### Asset Reference Rules (Embedded)

- `studio_slides` steps MUST have `assetId` from `metadata.assets.portalSlides`
- `video` steps MUST have `assetId` from `metadata.assets.portalVideos`
- `form` steps SHOULD have `formName` matching `metadata.availableForms[].name`
- Asset IDs must be copied exactly from metadata (never invented)

### Valid Step Actions

`video`, `form`, `slides`, `studio_slides`, `call`, `sign`, `document`, `visit_link`, `upload`, `invite_team`

### Valid Departments

`sales`, `marketing`, `operations`

### Metadata Schema (Embedded)

The metadata file structure must also be embedded so Claude knows how to read asset IDs and form names:

- `brand` — name, website, portalDomain, apTitle, apSubtitle
- `availableForms[]` — id, name, fields
- `assets.portalSlides[]` — assetId, name, createdAt
- `assets.portalVideos[]` — assetId, name, duration, createdAt
- `assets.other[]` — assetId, name, fileType
- `existingPortal` — sectionCount, stepCount
- `existingSequences` — campaignCount
- `sequenceEventExamples[]` — standard event names (e.g., "welcome", "post_application", "fdd_followup"); non-standard events produce validator warnings

### Action-Specific Field Requirements

- `visit_link` steps should include a `url` field
- `slides` steps do not require an `assetId` (they use uploaded PDF/images, not studio assets)

## Plugin Manifest Update

`plugin.json` needs no `skills` array — Claude Code auto-discovers skills from the `skills/` directory structure. However, the plugin description should be updated to reflect the added content generation capability:

```json
{
  "name": "fsai-workflow-actions",
  "version": "0.2.0",
  "description": "FSAI workflow actions and content generation tools",
  "author": { "name": "Bill" },
  "keywords": ["fsai", "workflow", "automation", "code-generation", "content-generator", "onboarding"]
}
```

## Validation Script

### Path Resolution Constraint

`validate.ts` resolves `metadata/` and `output/` relative to its own file location via `import.meta.url`. It **must** be copied to the workspace root — running it from the plugin's `references/` directory will look for metadata/output in the wrong place.

The existing `validate.ts` from `fsai-content-generator/validate.ts` is copied as-is into `references/validate.ts`. It validates:

- Schema shape (required fields, correct types)
- Asset ID references exist in metadata and match the correct asset type
- Form name references match available forms
- Sequence department and event validity
- Exit code 0 = passed (may have warnings), exit code 1 = failed (has errors)

## What This Skill Does NOT Do

- It does not dictate content tone or style — the user guides that
- It does not auto-generate content on skill invocation — it provides knowledge for when the user asks Claude to generate
- It does not manage the FSAI admin panel export — the user must provide the metadata file
