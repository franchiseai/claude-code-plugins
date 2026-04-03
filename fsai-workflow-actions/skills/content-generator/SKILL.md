---
name: content-generator
description: >-
  Generate valid JSON import files for the FSAI applicant portal, custom forms, and email sequences.
  Use when asked to "generate content", "content generator", "portal json", "sequences json",
  "forms json", "fsai content", "brand onboarding content", or when working with FSAI brand onboarding.
user_invocable: true
---

# FSAI Content Generator

This skill helps you generate valid JSON import files for the FSAI applicant portal, custom forms, and email sequences. The output is consumed by the FSAI backend's content import endpoints.

---

## Workflow

1. **Setup** — If `metadata/` and `output/` directories don't exist in the current workspace, create them.

2. **Metadata check** — Look for a `metadata/*.json` file. If none is found, tell the user:
   > "No metadata file found. Export one from the FSAI admin panel and place it in `metadata/`. The file contains brand info, available forms, and uploaded assets needed to generate valid content."

3. **Read metadata** — Read the `metadata/*.json` file to understand the brand context: name, available forms, uploaded assets (with their UUIDs), and existing portal/sequence counts.

4. **Generate content** — Based on the user's request, generate `output/forms.json` (optional), `output/portal.json`, and/or `output/sequences.json` following the schemas and rules below. Use real asset IDs and form names from the metadata — never invent them. Only generate `forms.json` if the brand needs custom forms beyond the defaults.

> **Important:** If generating `forms.json`, it must be uploaded and imported BEFORE generating `portal.json` and `sequences.json`. After form import, the super admin should re-export metadata so that portal generation can reference the newly created forms by name.

5. **Validate** — After generating output files:
   - Copy the validator to the workspace root if not already present:
     ```bash
     cp "${CLAUDE_PLUGIN_ROOT}/skills/content-generator/references/validate.ts" ./validate.ts
     ```
   - Run validation:
     ```bash
     npx tsx validate.ts
     ```
   - If there are errors: fix them and re-validate
   - If there are only warnings: present output to the user with warnings noted

6. **Output** — Files are written to `output/forms.json` (optional), `output/portal.json`, and/or `output/sequences.json`.

---

## Portal JSON Schema (`output/portal.json`)

```typescript
interface ImportPortalJson {
  /** Main title displayed at the top of the applicant portal */
  title: string;
  /** Subtitle displayed below the title */
  subtitle: string;
  /** Ordered list of portal sections */
  sections: ImportPortalSectionJson[];
}

interface ImportPortalSectionJson {
  /** Section heading */
  title: string;
  /** Optional section description */
  subtitle?: string;
  /** Optional emoji shown next to the section title */
  emoji?: string;
  /** Ordered list of steps within this section */
  steps: ImportPortalStepJson[];
}

interface ImportPortalStepJson {
  /** Step heading shown to the applicant */
  title: string;
  /** Step description / instructions */
  subtitle: string;
  /** The type of interaction this step presents */
  action:
    | 'video'          // Embedded video player (requires assetId referencing a video asset)
    | 'form'           // Dynamic form (requires formName matching an available form)
    | 'slides'         // PDF/image slides viewer
    | 'studio_slides'  // Interactive slide deck from the studio (requires assetId referencing a slide asset)
    | 'call'           // Schedule a call (Calendly or similar)
    | 'sign'           // E-signature document
    | 'document'       // Downloadable document
    | 'visit_link'     // External link (requires url)
    | 'upload'         // File upload prompt
    | 'invite_team';   // Invite team members step

  /** Form name to bind to (required for action: 'form'). Must match a name from metadata availableForms. */
  formName?: string | null;

  /** Asset UUID to bind to (required for action: 'video' and 'studio_slides'). Must match an assetId from metadata assets. */
  assetId?: string;

  /** Whether completing this step creates a deal in the pipeline */
  createsDeal?: boolean;

  /** Whether this step is the FDD (Franchise Disclosure Document) step */
  isFdd?: boolean;

  /** Whether this step is hidden from the applicant by default */
  hidden?: boolean;

  /** URL for visit_link steps or fallback video URL */
  url?: string | null;

  /** Arbitrary JSON data attached to the step (rarely used) */
  json?: unknown | null;
}
```

---

## Forms JSON Schema (`output/forms.json`)

```typescript
interface ImportFormsJson {
  /** List of custom forms to create */
  forms: ImportFormJson[];
}

interface ImportFormJson {
  /** Display name of the form */
  name: string;
  /** Optional description */
  description?: string;
  /** Which entity type this form collects data for */
  appliesTo: 'user' | 'franchisee-org' | 'location';
  /** Optional group name — creates or matches an existing form group */
  groupName?: string;
  /** Ordered list of pages in this form */
  pages: ImportFormPageJson[];
}

interface ImportFormPageJson {
  /** Page heading */
  title: string;
  /** Optional page description */
  subtitle?: string;
  /** New custom fields to create on this page */
  fields: ImportFormFieldJson[];
  /** Field names from default forms to move into this page */
  useExistingFields?: string[];
}

interface ImportFormFieldJson {
  /** Internal field name */
  name: string;
  /** Display text shown to the user */
  question: string;
  /** Additional help text */
  description?: string;
  /** Input placeholder text */
  placeholder?: string;
  /** Field input type */
  type: 'short-text' | 'long-text' | 'currency' | 'number' | 'date' | 'url'
    | 'email' | 'phone' | 'multiselect' | 'singleselect' | 'boolean' | 'dropdown';
  /** Whether the field is required (default false) */
  required?: boolean;
  /** Options for multiselect, singleselect, and dropdown types */
  options?: string[];
}
```

### Form Generation Rules

1. **Never set `dataLocation`** — imported fields are always custom. Only default fields have dataLocation.
2. **Use `useExistingFields`** to reference default fields from metadata by name rather than recreating them. This moves the field from its default form into your custom form.
3. **Check metadata first** — read `metadata.availableForms[].pages[].fields[]` to see what questions are already collected. Don't duplicate them.
4. **Fields with `dataLocation`** in metadata are default fields that map to database columns. Reference them via `useExistingFields` if you want them in a custom form.
5. **Fields without `dataLocation`** are custom fields stored as JSON.
6. **`appliesTo` scoping** — `user` for applicant/member data, `franchisee-org` for business entity data, `location` for location-specific data.
7. **Group related questions** into pages logically (e.g., "Personal Details", "Business Background").

---

## Sequences JSON Schema (`output/sequences.json`)

```typescript
interface ImportSequencesJson {
  /** List of email sequences to create */
  sequences: ImportSequenceJson[];
}

interface ImportSequenceJson {
  /** Display name of the sequence (e.g., "Welcome Series", "FDD Follow-up") */
  name: string;
  /** Event trigger that starts this sequence (e.g., "welcome", "post_application", "fdd_followup") */
  event: string;
  /** Department that owns this sequence */
  department: 'sales' | 'marketing' | 'operations';
  /** Ordered list of emails in this sequence */
  emails: ImportSequenceEmailJson[];
}

interface ImportSequenceEmailJson {
  /** Internal name for this email template */
  name: string;
  /** Email subject line (supports {{firstName}} and other merge tags) */
  subjectLine: string;
  /** Email body in Markdown format. Supports basic formatting: headers, bold, italic, links, lists. */
  bodyMarkdown: string;
  /** Number of days to wait after the previous email (or after the trigger event for the first email). Must be >= 0. */
  delayDays: number;
}
```

---

## Metadata Schema

The metadata file (`metadata/*.json`) exported from the FSAI admin panel has this structure:

- **`brand`** — `name`, `website`, `portalDomain`, `apTitle`, `apSubtitle`
- **`availableForms[]`** — `id`, `name`, `appliesTo`, `groupName`, plus `pages[]` each with `title` and `fields[]`. Each field has: `name`, `question`, `type`, `required`, `description`, `options`, `dataLocation`. Use this to understand what data is already being collected and which fields can be referenced via `useExistingFields`.
- **`assets.portalSlides[]`** — `assetId` (UUID), `name`, `createdAt`
- **`assets.portalVideos[]`** — `assetId` (UUID), `name`, `duration`, `createdAt`
- **`assets.other[]`** — `assetId` (UUID), `name`, `fileType`
- **`existingPortal`** — `sectionCount`, `stepCount` (what the brand already has)
- **`existingSequences`** — `campaignCount` (what the brand already has)
- **`sequenceEventExamples[]`** — Standard event names (e.g., `"welcome"`, `"post_application"`, `"fdd_followup"`). Non-standard events produce validator warnings but are allowed.
- **`trackingLinks`** — Pre-created tracking links for use in email content (or `null` if not yet created)
  - `returnToPortal` — `slug`, `url` (tracking URL), `destination` (final URL)
  - `portalSignUp` — `slug`, `url` (tracking URL), `destination` (final URL)

---

## Asset Reference Rules

These rules are enforced by the validator and the backend import service.

### Required asset references

- Every `studio_slides` step **MUST** have an `assetId` that matches a UUID from `metadata.assets.portalSlides`
- Every `video` step **MUST** have an `assetId` that matches a UUID from `metadata.assets.portalVideos`
- Asset IDs must exactly match the UUIDs from the metadata file (copy-paste them, never invent them)

### Form references

- Every `form` step **SHOULD** have a `formName` that matches the `name` field of an entry in `metadata.availableForms`
- If no matching form exists, the step will be created but the form will not be linked

### Asset type matching

- `studio_slides` steps must reference slide assets (from `portalSlides`), not video assets
- `video` steps must reference video assets (from `portalVideos`), not slide assets
- `slides` steps do not require an `assetId` (they use uploaded PDF/images, not studio assets)
- Other asset types from `metadata.assets.other` can be referenced but are not typically used in portal steps

### Action-specific fields

- `visit_link` steps should include a `url` field

---

## Valid Step Actions

`video`, `form`, `slides`, `studio_slides`, `call`, `sign`, `document`, `visit_link`, `upload`, `invite_team`

## Valid Departments

`sales`, `marketing`, `operations`

---

## Tracking Links in Emails

When generating email sequences, use tracking link placeholders instead of raw portal URLs. These are resolved to actual tracking URLs during import, enabling click analytics.

### Shorthand Syntax (Recommended)

| Placeholder | Resolves To |
|-------------|-------------|
| `{{link:portal}}` | Tracking URL for return to portal |
| `{{link:signup}}` | Tracking URL for signup page |

Example:
```markdown
[Return to your portal]({{link:portal}})

[Complete your application]({{link:signup}})
```

### Verbose Syntax

Also supported for backward compatibility:
- `{{trackingLinks.returnToPortal.url}}`
- `{{trackingLinks.portalSignUp.url}}`

### Fallback Behavior

If tracking links don't exist for the brand (e.g., portal domain not set), placeholders remain unchanged. The email editor will show the literal placeholder text, which can be manually replaced.

---

## Merge Tags in Emails

Merge tags allow you to personalize email content with recipient data. They are converted to interactive variable nodes in the email editor.

### Available Merge Tags

| Tag | Description |
|-----|-------------|
| `{{first_name}}` | Recipient's first name |
| `{{last_name}}` | Recipient's last name |
| `{{email}}` | Recipient's email address |
| `{{phone}}` | Recipient's phone number |

### Fallback Syntax

Use fallback values for when recipient data is missing:

```
{{first_name,fallback=Friend}}
{{last_name,fallback=Valued Customer}}
```

The fallback value appears if the merge tag has no data for that recipient.

### Where Merge Tags Work

Merge tags can be used in:
- **Subject lines**: `"Welcome {{first_name}}!"`
- **Body text**: Paragraphs, headings, lists
- **Inside formatting**: `**Hello {{first_name}}!**` (bold text with merge tag)
- **Near links**: `{{first_name}}, [click here](url) to continue`

### Example Email with Merge Tags

```json
{
  "name": "Welcome Email",
  "subjectLine": "Welcome {{first_name}}!",
  "bodyMarkdown": "# Hello {{first_name,fallback=there}}!\n\nThank you for your interest.\n\nWe'll send updates to **{{email}}**.\n\n[View your portal]({{link:portal}})\n\nBest,\nThe Team",
  "delayDays": 0
}
```
