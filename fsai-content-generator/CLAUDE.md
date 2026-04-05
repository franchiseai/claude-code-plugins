# Content Generator for FSAI

This tool generates JSON import files for the Franchise Systems AI applicant portal, custom forms, and email sequences. The output is consumed by the FSAI backend's content import endpoints.

## Guided Workflow (Three Phases)

Content generation follows a phased process. Each phase builds on the previous one.

### Phase 1: Custom Forms (`output/forms.json`)
1. Read metadata to understand existing default forms (fields with `dataLocation`)
2. Generate `output/forms.json` with custom forms that fill gaps not covered by defaults
3. Run `npx tsx validate.ts` and fix any errors
4. **User imports forms.json via super admin, then re-exports metadata**

### Phase 2: Portal (`output/portal.json`)
1. Read the **updated** metadata (now includes custom forms from Phase 1)
2. Generate `output/portal.json` referencing both default and custom form names
3. Run `npx tsx validate.ts` and fix any errors

### Phase 3: Email Sequences (`output/sequences.json`)
1. Generate `output/sequences.json` with email sequences
2. Run `npx tsx validate.ts` and fix any errors

> **Shortcut:** If no custom forms are needed, skip Phase 1 and generate portal + sequences together.

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
2. **Use `useExistingFields`** to reference default fields from metadata by name rather than recreating them.
3. **Check metadata first** — read `metadata.availableForms[].pages[].fields[]` to see what questions are already collected. Don't duplicate them.
4. **Fields with `dataLocation`** in metadata are default fields that map to database columns. Reference them via `useExistingFields` if you want them in a custom form.
5. **`appliesTo` scoping** — `user` for applicant/member data, `franchisee-org` for business entity data, `location` for location-specific data.

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

## Asset Reference Rules

These rules are enforced by `validate.ts` and the backend import service.

### Required asset references

- Every `studio_slides` step **MUST** have an `assetId` that matches a UUID from `metadata.assets.portalSlides`
- Every `video` step **MUST** have an `assetId` that matches a UUID from `metadata.assets.portalVideos`
- Asset IDs must exactly match the UUIDs from the metadata file (copy-paste them)

### Form references

- Every `form` step **SHOULD** have a `formName` that matches the `name` field of an entry in `metadata.availableForms`
- If no matching form exists, the step will be created but the form will not be linked

### Asset type matching

- `studio_slides` steps must reference slide assets (from `portalSlides`), not video assets
- `video` steps must reference video assets (from `portalVideos`), not slide assets
- Other asset types from `metadata.assets.other` can be referenced but are not typically used in portal steps

---

## Instructions

1. **Always read the metadata file first**: `metadata/*.json` contains the brand name, available forms, uploaded assets with their UUIDs, and other context needed to generate valid content.

2. **Use real asset IDs**: Copy asset UUIDs exactly from the metadata. Never invent UUIDs.

3. **Use real form names**: Match form names exactly as they appear in `metadata.availableForms[].name`.

4. **Validate before presenting**: After generating output files, run:
   ```bash
   npx tsx validate.ts
   ```
   Fix any errors before presenting the output to the user. Warnings are advisory and do not need to be fixed.

5. **Output location**: Write portal content to `output/portal.json` and sequence content to `output/sequences.json`.
