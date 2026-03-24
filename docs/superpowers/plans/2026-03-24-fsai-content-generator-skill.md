# FSAI Content Generator Skill Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Create a `content-generator` skill inside the `fsai-workflow-actions` plugin that teaches Claude the FSAI portal/sequence JSON schemas and provides a bundled validator.

**Architecture:** Single SKILL.md file with embedded schemas and workflow instructions, plus a bundled `validate.ts` in `references/`. The skill is a knowledge companion — it doesn't auto-generate content, it informs Claude how to produce valid output when the user asks.

**Tech Stack:** Claude Code plugin skill (Markdown + YAML frontmatter), TypeScript validator (run via `npx tsx`)

**Spec:** `docs/superpowers/specs/2026-03-24-fsai-content-generator-skill-design.md`

---

### Task 1: Create the skill directory structure

**Files:**
- Create: `fsai-workflow-actions/skills/content-generator/SKILL.md`
- Create: `fsai-workflow-actions/skills/content-generator/references/validate.ts`

- [ ] **Step 1: Create the skill directory and references subdirectory**

```bash
mkdir -p fsai-workflow-actions/skills/content-generator/references
```

- [ ] **Step 2: Copy validate.ts from fsai-content-generator**

```bash
cp fsai-content-generator/validate.ts fsai-workflow-actions/skills/content-generator/references/validate.ts
```

- [ ] **Step 3: Verify the file was copied correctly**

```bash
diff fsai-content-generator/validate.ts fsai-workflow-actions/skills/content-generator/references/validate.ts
```

Expected: no output (files are identical)

- [ ] **Step 4: Commit**

```bash
git add fsai-workflow-actions/skills/content-generator/references/validate.ts
git commit -m "feat: add validate.ts to content-generator skill references"
```

---

### Task 2: Write the SKILL.md

**Files:**
- Create: `fsai-workflow-actions/skills/content-generator/SKILL.md`

The SKILL.md has four sections: frontmatter, workflow, schemas, and validation instructions. Source material is in `fsai-content-generator/CLAUDE.md`.

- [ ] **Step 1: Write the SKILL.md with frontmatter and full content**

The file must contain:

**Frontmatter:**
```yaml
---
name: content-generator
description: >-
  Generate valid JSON import files for the FSAI applicant portal and email sequences.
  Use when asked to "generate content", "content generator", "portal json", "sequences json",
  "fsai content", "brand onboarding content", or when working with FSAI brand onboarding.
user_invocable: true
---
```

**Body sections (in order):**

1. **Title and purpose** — one-liner explaining this skill helps generate valid FSAI portal and sequence JSON files
2. **Workflow** — the 6-step workflow from the spec:
   - Setup: create `metadata/` and `output/` dirs if missing
   - Metadata check: look for `metadata/*.json`, instruct user if missing
   - Read metadata to understand brand context
   - Generate `output/portal.json` and/or `output/sequences.json` per user request
   - Validate: copy `validate.ts` from `${CLAUDE_PLUGIN_ROOT}/skills/content-generator/references/validate.ts` to workspace root if not present, run `npx tsx validate.ts`, fix errors, re-validate
   - Present output to user (note any warnings)
3. **Portal JSON Schema** — copy the full `ImportPortalJson`, `ImportPortalSectionJson`, `ImportPortalStepJson` TypeScript interfaces from `fsai-content-generator/CLAUDE.md` lines 17-76
4. **Sequences JSON Schema** — copy the full `ImportSequencesJson`, `ImportSequenceJson`, `ImportSequenceEmailJson` TypeScript interfaces from `fsai-content-generator/CLAUDE.md` lines 80-107
5. **Metadata Schema** — document the metadata file structure:
   - `brand` — name, website, portalDomain, apTitle, apSubtitle
   - `availableForms[]` — id, name, fields
   - `assets.portalSlides[]` — assetId, name, createdAt
   - `assets.portalVideos[]` — assetId, name, duration, createdAt
   - `assets.other[]` — assetId, name, fileType
   - `existingPortal` — sectionCount, stepCount
   - `existingSequences` — campaignCount
   - `sequenceEventExamples[]` — standard event names; non-standard events produce validator warnings
6. **Asset Reference Rules** — from spec:
   - `studio_slides` steps MUST have `assetId` from `metadata.assets.portalSlides`
   - `video` steps MUST have `assetId` from `metadata.assets.portalVideos`
   - `form` steps SHOULD have `formName` matching `metadata.availableForms[].name`
   - `visit_link` steps should include a `url` field
   - `slides` steps do not require an `assetId`
   - Asset IDs must be copied exactly from metadata (never invented)
7. **Valid Step Actions** — `video`, `form`, `slides`, `studio_slides`, `call`, `sign`, `document`, `visit_link`, `upload`, `invite_team`
8. **Valid Departments** — `sales`, `marketing`, `operations`

- [ ] **Step 2: Read back the SKILL.md and verify it contains all sections**

Verify: frontmatter has `name`, `description`, `user_invocable`. Body has all 8 sections listed above. TypeScript interfaces match the source in `fsai-content-generator/CLAUDE.md`.

- [ ] **Step 3: Commit**

```bash
git add fsai-workflow-actions/skills/content-generator/SKILL.md
git commit -m "feat: add content-generator skill with schemas and validation workflow"
```

---

### Task 3: Update plugin.json

**Files:**
- Modify: `fsai-workflow-actions/.claude-plugin/plugin.json`

- [ ] **Step 1: Update plugin.json**

Update to:
```json
{
  "name": "fsai-workflow-actions",
  "version": "0.2.0",
  "description": "FSAI workflow actions and content generation tools",
  "author": {
    "name": "Bill"
  },
  "keywords": ["fsai", "workflow", "automation", "code-generation", "content-generator", "onboarding"]
}
```

- [ ] **Step 2: Commit**

```bash
git add fsai-workflow-actions/.claude-plugin/plugin.json
git commit -m "chore: update plugin.json for content-generator skill"
```

---

### Task 4: Validate the skill works

- [ ] **Step 1: Verify directory structure is correct**

```bash
find fsai-workflow-actions/skills/content-generator -type f
```

Expected output:
```
fsai-workflow-actions/skills/content-generator/SKILL.md
fsai-workflow-actions/skills/content-generator/references/validate.ts
```

- [ ] **Step 2: Verify validate.ts runs from a test workspace**

Create a temporary test to confirm the validator works when copied to a directory with metadata and output:

```bash
mkdir -p /tmp/fsai-test/metadata /tmp/fsai-test/output
cp fsai-content-generator/metadata/test-brand.json /tmp/fsai-test/metadata/
cp fsai-content-generator/output/portal.json /tmp/fsai-test/output/
cp fsai-content-generator/output/sequences.json /tmp/fsai-test/output/
cp fsai-workflow-actions/skills/content-generator/references/validate.ts /tmp/fsai-test/
cd /tmp/fsai-test && npx tsx validate.ts
```

Expected: validator runs and reports results (pass or fail with specific errors — either is fine, we're confirming it executes)

- [ ] **Step 3: Clean up test directory**

```bash
rm -rf /tmp/fsai-test
```

- [ ] **Step 4: Verify SKILL.md frontmatter parses correctly**

Read the first 10 lines of the SKILL.md and confirm the YAML frontmatter has correct `---` delimiters, `name`, `description`, and `user_invocable` fields.
