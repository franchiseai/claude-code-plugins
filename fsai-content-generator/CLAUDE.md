# Content Generator for FSAI

This tool generates JSON import files for the Franchise Systems AI applicant portal and email sequences. The output is consumed by the FSAI backend's content import endpoints.

## Workflow

1. Read the metadata file in `metadata/*.json` (exported from the FSAI admin panel for a specific brand)
2. Generate `output/portal.json` and/or `output/sequences.json` based on brand context
3. Run `npx tsx validate.ts` and fix any errors before presenting output
4. Output files go in `output/portal.json` and `output/sequences.json`

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
