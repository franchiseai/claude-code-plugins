/**
 * Content Generator Validator
 *
 * Validates forms.json, portal.json, and sequences.json against the metadata file
 * to catch schema errors and broken asset/form references before import.
 *
 * Usage: npx tsx validate.ts
 *
 * Exit code 0: validation passed (may have warnings)
 * Exit code 1: validation failed (has errors)
 */

import { readFileSync, readdirSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

// ── Constants ────────────────────────────────────────────────────────────────

const VALID_ACTIONS = [
  'video',
  'form',
  'slides',
  'studio_slides',
  'call',
  'sign',
  'document',
  'visit_link',
  'upload',
  'invite_team',
] as const;

const VALID_DEPARTMENTS = ['sales', 'marketing', 'operations'] as const;

const VALID_FIELD_TYPES = [
  'short-text', 'long-text', 'currency', 'number', 'date',
  'url', 'email', 'phone', 'multiselect', 'singleselect',
  'boolean', 'dropdown',
] as const;

const VALID_APPLIES_TO = ['user', 'franchisee-org', 'location'] as const;

// ── Types (mirrors SDK types) ────────────────────────────────────────────────

interface MetadataFormField {
  name: string;
  question: string | null;
  type: string;
  required: boolean;
  description: string | null;
  options: string[] | null;
  dataLocation: string | null;
}

interface MetadataFormPage {
  title: string;
  fields: MetadataFormField[];
}

interface MetadataForm {
  id: string;
  name: string;
  appliesTo: string;
  groupName: string | null;
  pages: MetadataFormPage[];
}

interface MetadataSlideAsset {
  assetId: string;
  name: string;
  createdAt: string;
}

interface MetadataVideoAsset {
  assetId: string;
  name: string;
  duration: number | null;
  createdAt: string;
}

interface MetadataOtherAsset {
  assetId: string;
  name: string;
  fileType: string;
}

interface Metadata {
  brand: {
    name: string | null;
    website: string | null;
    portalDomain: string | null;
    apTitle: string | null;
    apSubtitle: string | null;
  };
  availableForms: MetadataForm[];
  assets: {
    portalSlides: MetadataSlideAsset[];
    portalVideos: MetadataVideoAsset[];
    other: MetadataOtherAsset[];
  };
  existingPortal: {
    sectionCount: number;
    stepCount: number;
  };
  existingSequences: {
    campaignCount: number;
  };
  validStepActions: string[];
  validDepartments: string[];
  sequenceEventExamples: string[];
}

interface PortalStep {
  title?: unknown;
  subtitle?: unknown;
  action?: unknown;
  formName?: unknown;
  assetId?: unknown;
  createsDeal?: unknown;
  isFdd?: unknown;
  hidden?: unknown;
  url?: unknown;
  json?: unknown;
}

interface PortalSection {
  title?: unknown;
  subtitle?: unknown;
  emoji?: unknown;
  steps?: unknown;
}

interface PortalJson {
  title?: unknown;
  subtitle?: unknown;
  sections?: unknown;
}

interface SequenceEmail {
  name?: unknown;
  subjectLine?: unknown;
  bodyMarkdown?: unknown;
  delayDays?: unknown;
}

interface Sequence {
  name?: unknown;
  event?: unknown;
  department?: unknown;
  emails?: unknown;
}

interface SequencesJson {
  sequences?: unknown;
}

interface FormsFieldJson {
  name?: unknown;
  question?: unknown;
  type?: unknown;
  required?: unknown;
  options?: unknown;
}

interface FormsPageJson {
  title?: unknown;
  subtitle?: unknown;
  fields?: unknown;
  useExistingFields?: unknown;
}

interface FormsFormJson {
  name?: unknown;
  description?: unknown;
  appliesTo?: unknown;
  groupName?: unknown;
  pages?: unknown;
}

interface FormsJson {
  forms?: unknown;
}

// ── Helpers ──────────────────────────────────────────────────────────────────

const errors: string[] = [];
const warnings: string[] = [];

function error(msg: string): void {
  errors.push(msg);
}

function warn(msg: string): void {
  warnings.push(msg);
}

function loadJson<T>(filePath: string): T | null {
  if (!existsSync(filePath)) {
    return null;
  }
  try {
    const raw = readFileSync(filePath, 'utf-8');
    return JSON.parse(raw) as T;
  } catch (e) {
    error(`Failed to parse ${filePath}: ${e instanceof Error ? e.message : String(e)}`);
    return null;
  }
}

// ── Metadata Loading ─────────────────────────────────────────────────────────

function loadMetadata(dir: string): Metadata | null {
  const metadataDir = join(dir, 'metadata');
  if (!existsSync(metadataDir)) {
    error('metadata/ directory not found');
    return null;
  }

  const files = readdirSync(metadataDir).filter((f) => f.endsWith('.json'));
  if (files.length === 0) {
    error('No .json files found in metadata/ directory');
    return null;
  }

  const metadataPath = join(metadataDir, files[0]);
  const metadata = loadJson<Metadata>(metadataPath);
  if (!metadata) {
    error(`Failed to load metadata from ${metadataPath}`);
    return null;
  }

  // Basic metadata shape validation
  if (!metadata.assets) {
    error('Metadata missing "assets" field');
    return null;
  }
  if (!Array.isArray(metadata.availableForms)) {
    error('Metadata missing or invalid "availableForms" field');
    return null;
  }

  return metadata;
}

// ── Portal Validation ────────────────────────────────────────────────────────

function validatePortal(portal: PortalJson, metadata: Metadata): void {
  // Top-level required fields
  if (typeof portal.title !== 'string' || portal.title.length === 0) {
    error('Portal: "title" is required and must be a non-empty string');
  }
  if (typeof portal.subtitle !== 'string' || portal.subtitle.length === 0) {
    error('Portal: "subtitle" is required and must be a non-empty string');
  }
  if (!Array.isArray(portal.sections)) {
    error('Portal: "sections" is required and must be an array');
    return;
  }
  if (portal.sections.length === 0) {
    error('Portal: "sections" must contain at least one section');
    return;
  }

  // Build lookup sets from metadata
  const slideAssetIds = new Set(
    (metadata.assets.portalSlides || []).map((a) => a.assetId)
  );
  const videoAssetIds = new Set(
    (metadata.assets.portalVideos || []).map((a) => a.assetId)
  );
  const otherAssetIds = new Set(
    (metadata.assets.other || []).map((a) => a.assetId)
  );
  const allAssetIds = new Set([...slideAssetIds, ...videoAssetIds, ...otherAssetIds]);
  const formNames = new Set(metadata.availableForms.map((f) => f.name));

  const sections = portal.sections as PortalSection[];
  for (let si = 0; si < sections.length; si++) {
    const section = sections[si];
    const sLabel = `Section ${si + 1}`;

    if (typeof section.title !== 'string' || section.title.length === 0) {
      error(`${sLabel}: "title" is required and must be a non-empty string`);
    }
    if (section.subtitle !== undefined && section.subtitle !== null && typeof section.subtitle !== 'string') {
      error(`${sLabel}: "subtitle" must be a string if provided`);
    }
    if (section.emoji !== undefined && section.emoji !== null && typeof section.emoji !== 'string') {
      error(`${sLabel}: "emoji" must be a string if provided`);
    }

    if (!Array.isArray(section.steps)) {
      error(`${sLabel}: "steps" is required and must be an array`);
      continue;
    }
    if (section.steps.length === 0) {
      error(`${sLabel}: "steps" must contain at least one step`);
      continue;
    }

    const steps = section.steps as PortalStep[];
    for (let sti = 0; sti < steps.length; sti++) {
      const step = steps[sti];
      const stLabel = `${sLabel}, Step ${sti + 1}`;

      // Required fields
      if (typeof step.title !== 'string' || step.title.length === 0) {
        error(`${stLabel}: "title" is required and must be a non-empty string`);
      }
      if (typeof step.subtitle !== 'string' || step.subtitle.length === 0) {
        error(`${stLabel}: "subtitle" is required and must be a non-empty string`);
      }

      // Action validation
      if (typeof step.action !== 'string') {
        error(`${stLabel}: "action" is required and must be a string`);
        continue;
      }
      if (!(VALID_ACTIONS as readonly string[]).includes(step.action)) {
        error(
          `${stLabel}: invalid action "${step.action}". Must be one of: ${VALID_ACTIONS.join(', ')}`
        );
        continue;
      }

      // assetId type check
      if (step.assetId !== undefined && step.assetId !== null && typeof step.assetId !== 'string') {
        error(`${stLabel}: "assetId" must be a string if provided`);
      }

      const action = step.action as string;
      const assetId = typeof step.assetId === 'string' ? step.assetId : null;
      const formName = typeof step.formName === 'string' ? step.formName : null;

      // studio_slides MUST have assetId from portalSlides
      if (action === 'studio_slides') {
        if (!assetId) {
          error(`${stLabel}: studio_slides step must have an "assetId"`);
        } else if (!slideAssetIds.has(assetId)) {
          if (videoAssetIds.has(assetId)) {
            error(
              `${stLabel}: assetId "${assetId}" is a video asset, but this is a studio_slides step (expected a slide asset from portalSlides)`
            );
          } else if (allAssetIds.has(assetId)) {
            error(
              `${stLabel}: assetId "${assetId}" exists but is not in portalSlides (wrong asset type for studio_slides step)`
            );
          } else {
            error(`${stLabel}: assetId "${assetId}" not found in metadata`);
          }
        }
      }

      // video MUST have assetId from portalVideos
      if (action === 'video') {
        if (!assetId) {
          error(`${stLabel}: video step must have an "assetId"`);
        } else if (!videoAssetIds.has(assetId)) {
          if (slideAssetIds.has(assetId)) {
            error(
              `${stLabel}: assetId "${assetId}" is a slide asset, but this is a video step (expected a video asset from portalVideos)`
            );
          } else if (allAssetIds.has(assetId)) {
            error(
              `${stLabel}: assetId "${assetId}" exists but is not in portalVideos (wrong asset type for video step)`
            );
          } else {
            error(`${stLabel}: assetId "${assetId}" not found in metadata`);
          }
        }
      }

      // For other step types, if assetId is provided, it should exist somewhere
      if (
        action !== 'studio_slides' &&
        action !== 'video' &&
        assetId &&
        !allAssetIds.has(assetId)
      ) {
        error(`${stLabel}: assetId "${assetId}" not found in metadata`);
      }

      // form steps should have formName
      if (action === 'form') {
        if (!formName) {
          warn(`${stLabel}: form step has no "formName" — form will not be linked on import`);
        } else if (!formNames.has(formName)) {
          error(
            `${stLabel}: formName "${formName}" not found in available forms. Available: ${[...formNames].join(', ')}`
          );
        }
      }

      // Optional boolean fields type check
      if (step.createsDeal !== undefined && typeof step.createsDeal !== 'boolean') {
        error(`${stLabel}: "createsDeal" must be a boolean if provided`);
      }
      if (step.isFdd !== undefined && typeof step.isFdd !== 'boolean') {
        error(`${stLabel}: "isFdd" must be a boolean if provided`);
      }
      if (step.hidden !== undefined && typeof step.hidden !== 'boolean') {
        error(`${stLabel}: "hidden" must be a boolean if provided`);
      }

      // url type check
      if (step.url !== undefined && step.url !== null && typeof step.url !== 'string') {
        error(`${stLabel}: "url" must be a string if provided`);
      }
    }
  }
}

// ── Sequences Validation ─────────────────────────────────────────────────────

function validateSequences(sequences: SequencesJson, metadata: Metadata): void {
  if (!Array.isArray(sequences.sequences)) {
    error('Sequences: "sequences" is required and must be an array');
    return;
  }
  if (sequences.sequences.length === 0) {
    error('Sequences: "sequences" must contain at least one sequence');
    return;
  }

  const eventExamples = new Set(metadata.sequenceEventExamples || []);

  const seqs = sequences.sequences as Sequence[];
  for (let si = 0; si < seqs.length; si++) {
    const seq = seqs[si];
    const seqName = typeof seq.name === 'string' ? seq.name : `#${si + 1}`;
    const sLabel = `Sequence "${seqName}"`;

    // Required fields
    if (typeof seq.name !== 'string' || seq.name.length === 0) {
      error(`${sLabel}: "name" is required and must be a non-empty string`);
    }
    if (typeof seq.event !== 'string' || seq.event.length === 0) {
      error(`${sLabel}: "event" is required and must be a non-empty string`);
    }

    // Department validation
    if (typeof seq.department !== 'string') {
      error(`${sLabel}: "department" is required and must be a string`);
    } else if (!(VALID_DEPARTMENTS as readonly string[]).includes(seq.department)) {
      error(
        `${sLabel}: invalid department "${seq.department}". Must be one of: ${VALID_DEPARTMENTS.join(', ')}`
      );
    }

    // Event warning
    if (
      typeof seq.event === 'string' &&
      seq.event.length > 0 &&
      eventExamples.size > 0 &&
      !eventExamples.has(seq.event)
    ) {
      warn(
        `${sLabel}: event "${seq.event}" not in standard event list (${[...eventExamples].join(', ')})`
      );
    }

    // Emails
    if (!Array.isArray(seq.emails)) {
      error(`${sLabel}: "emails" is required and must be an array`);
      continue;
    }
    if (seq.emails.length === 0) {
      error(`${sLabel}: "emails" must contain at least one email`);
      continue;
    }

    const emails = seq.emails as SequenceEmail[];
    for (let ei = 0; ei < emails.length; ei++) {
      const email = emails[ei];
      const eLabel = `${sLabel}, Email ${ei + 1}`;

      if (typeof email.name !== 'string' || email.name.length === 0) {
        error(`${eLabel}: "name" is required and must be a non-empty string`);
      }
      if (typeof email.subjectLine !== 'string' || email.subjectLine.length === 0) {
        error(`${eLabel}: "subjectLine" is required and must be a non-empty string`);
      }
      if (typeof email.bodyMarkdown !== 'string' || email.bodyMarkdown.length === 0) {
        error(`${eLabel}: "bodyMarkdown" is required and must be a non-empty string`);
      }
      if (typeof email.delayDays !== 'number') {
        error(`${eLabel}: "delayDays" is required and must be a number`);
      } else if (email.delayDays < 0) {
        error(`${eLabel}: "delayDays" must be >= 0 (got ${email.delayDays})`);
      } else if (!Number.isInteger(email.delayDays)) {
        error(`${eLabel}: "delayDays" must be an integer (got ${email.delayDays})`);
      }
    }
  }
}

// ── Forms Validation ────────────────────────────────────────────────────────

function validateForms(forms: FormsJson, metadata: Metadata): void {
  if (!Array.isArray(forms.forms)) {
    error('Forms: "forms" is required and must be an array');
    return;
  }
  if (forms.forms.length === 0) {
    error('Forms: "forms" must contain at least one form');
    return;
  }

  // Build lookup of available field names from metadata
  const availableFieldNames = new Set<string>();
  for (const form of metadata.availableForms ?? []) {
    for (const page of form.pages ?? []) {
      for (const field of page.fields ?? []) {
        availableFieldNames.add(field.name.trim().toLowerCase());
      }
    }
  }

  const formEntries = forms.forms as FormsFormJson[];
  for (let fi = 0; fi < formEntries.length; fi++) {
    const form = formEntries[fi];
    const formName = typeof form.name === 'string' ? form.name : `#${fi + 1}`;
    const fLabel = `Form "${formName}"`;

    if (typeof form.name !== 'string' || form.name.length === 0) {
      error(`${fLabel}: "name" is required and must be a non-empty string`);
    }
    if (
      typeof form.appliesTo !== 'string' ||
      !(VALID_APPLIES_TO as readonly string[]).includes(form.appliesTo)
    ) {
      error(
        `${fLabel}: "appliesTo" must be one of: ${VALID_APPLIES_TO.join(', ')}`
      );
    }
    if (!Array.isArray(form.pages)) {
      error(`${fLabel}: "pages" is required and must be an array`);
      continue;
    }
    if (form.pages.length === 0) {
      error(`${fLabel}: "pages" must contain at least one page`);
      continue;
    }

    const fieldNames = new Set<string>();
    const pages = form.pages as FormsPageJson[];

    for (let pi = 0; pi < pages.length; pi++) {
      const page = pages[pi];
      const pLabel = `${fLabel}, Page ${pi + 1}`;

      if (typeof page.title !== 'string' || page.title.length === 0) {
        error(`${pLabel}: "title" is required and must be a non-empty string`);
      }

      // Validate useExistingFields
      if (page.useExistingFields !== undefined) {
        if (!Array.isArray(page.useExistingFields)) {
          error(`${pLabel}: "useExistingFields" must be an array of strings`);
        } else {
          for (const fieldName of page.useExistingFields) {
            if (typeof fieldName !== 'string') {
              error(`${pLabel}: useExistingFields entries must be strings`);
              continue;
            }
            if (!availableFieldNames.has(fieldName.trim().toLowerCase())) {
              warn(
                `${pLabel}: useExistingFields "${fieldName}" not found in metadata`
              );
            }
          }
        }
      }

      // Validate fields
      if (page.fields !== undefined && !Array.isArray(page.fields)) {
        error(`${pLabel}: "fields" must be an array if provided`);
      } else if (Array.isArray(page.fields)) {
        const fields = page.fields as FormsFieldJson[];
        for (let ffi = 0; ffi < fields.length; ffi++) {
          const field = fields[ffi];
          const ffLabel = `${pLabel}, Field ${ffi + 1}`;

          if (typeof field.name !== 'string' || field.name.length === 0) {
            error(`${ffLabel}: "name" is required and must be a non-empty string`);
          } else {
            const normalized = (field.name as string).trim().toLowerCase();
            if (fieldNames.has(normalized)) {
              error(`${ffLabel}: name "${field.name}" is duplicated within this form`);
            }
            fieldNames.add(normalized);
          }

          if (typeof field.question !== 'string' || field.question.length === 0) {
            error(`${ffLabel}: "question" is required and must be a non-empty string`);
          }

          if (
            typeof field.type !== 'string' ||
            !(VALID_FIELD_TYPES as readonly string[]).includes(field.type)
          ) {
            error(
              `${ffLabel}: "type" must be one of: ${VALID_FIELD_TYPES.join(', ')}`
            );
          }

          if (
            typeof field.type === 'string' &&
            ['multiselect', 'singleselect', 'dropdown'].includes(field.type) &&
            (!Array.isArray(field.options) || field.options.length === 0)
          ) {
            warn(`${ffLabel}: ${field.type} field should have options`);
          }
        }
      }
    }
  }
}

// ── Main ─────────────────────────────────────────────────────────────────────

function main(): void {
  const baseDir = dirname(fileURLToPath(import.meta.url));

  // Load metadata
  const metadata = loadMetadata(baseDir);
  if (!metadata) {
    printResults();
    process.exit(1);
  }

  const formsPath = join(baseDir, 'output', 'forms.json');
  const portalPath = join(baseDir, 'output', 'portal.json');
  const sequencesPath = join(baseDir, 'output', 'sequences.json');

  const hasForms = existsSync(formsPath);
  const hasPortal = existsSync(portalPath);
  const hasSequences = existsSync(sequencesPath);

  if (!hasForms && !hasPortal && !hasSequences) {
    error('No output files found. Expected output/forms.json, output/portal.json, and/or output/sequences.json');
    printResults();
    process.exit(1);
  }

  // Validate forms (optional)
  if (hasForms) {
    console.log('--- Validating forms.json ---');
    const forms = loadJson<FormsJson>(formsPath);
    if (forms) {
      validateForms(forms, metadata);
    }
  }

  // Validate portal
  if (hasPortal) {
    console.log('--- Validating portal.json ---');
    const portal = loadJson<PortalJson>(portalPath);
    if (portal) {
      validatePortal(portal, metadata);
    }
  }

  // Validate sequences
  if (hasSequences) {
    console.log('--- Validating sequences.json ---');
    const sequences = loadJson<SequencesJson>(sequencesPath);
    if (sequences) {
      validateSequences(sequences, metadata);
    }
  }

  printResults();
  process.exit(errors.length > 0 ? 1 : 0);
}

function printResults(): void {
  for (const e of errors) {
    console.log(`\u2717 ERROR: ${e}`);
  }
  for (const w of warnings) {
    console.log(`\u26A0 WARNING: ${w}`);
  }

  const status = errors.length === 0 ? '\u2713 Validation passed' : '\u2717 Validation failed';
  console.log(`${status} (${errors.length} errors, ${warnings.length} warnings)`);
}

main();
