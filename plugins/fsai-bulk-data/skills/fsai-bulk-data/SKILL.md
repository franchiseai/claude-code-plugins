---
name: fsai-bulk-data
description: Import and export FSAI brand data over the superadmin bulk API. Use when the user asks to "import helpdesk articles", "export brand data", "bulk import", "push articles to FSAI", "sync helpdesk", or mentions "FSAI bulk data". Covers finding a brand id, fetching the agent doc for an entity, authoring an import envelope, validating it into a job, reviewing the plan with the user, and committing.
---

# FSAI Bulk Data Import and Export

Drive the FSAI superadmin bulk import/export API from the command line. The API works as a two-phase job: you post an envelope of records, the server validates it and returns a plan of what would be created, updated, skipped, or rejected, and nothing is written until you commit that job.

**Announce at start:** "I'm using the fsai-bulk-data skill to work with the FSAI bulk API."

Full endpoint and payload reference: read `reference.md` next to this file whenever you need exact shapes, status values, entity keys, or error meanings.

## Start here for any import or authoring task

The API documents itself. Before you write a single record, and before you open any repo
copy of an agent doc, pull the live doc for that entity and that brand:

```bash
eval "$(~/bin/fsai-key)"   # sets FSAI_API_KEY and FSAI_API_URL
curl -s -H "Authorization: Bearer $FSAI_API_KEY" \
  "$FSAI_API_URL/fsai-admin/bulk/$ENTITY/doc?brandId=$BRAND_ID"
```

It returns two halves, and you author against both:

- `schemaMarkdown` is the field-by-field contract, generated at request time from the same
  Zod schema the importer validates against. It gives you the shape.
- `brandSnapshot` is that brand's live data, with real ids, plus per-entity authoring notes.
  It gives you the values to reference.

**The live doc wins.** Repo copies, extracted `*-agent-doc.md` files, notes in a brand's
CLAUDE.md, and anything you remember from a previous session are all snapshots of this
endpoint. When one of them disagrees with the live doc, the live doc is right and the copy
is stale. Say so rather than reconciling them.

Never author import JSON from memory, from a schema written into a project file, or from a
repo checkout, when the API is reachable. If a grant is missing, ask for the unlock instead
of falling back to a stale copy.

Survey of every documentation surface, live and in the repo, with staleness dates:
`~/work/fsai/brand-onboarding/reference/platform/bulk-api-doc-surfaces-2026-09-14.md`.

## Prerequisites

1. **A personal API key.** The user mints it in the FSAI dashboard under Account > API key. It must belong to a superadmin account. There is one key per user, and regenerating it invalidates the previous one. Expect it in `$FSAI_API_KEY`. If it is not set, ask the user to export it in their shell. Never print, echo, log, or paste the key into a file, a commit, or a message.
2. **API access unlocked.** A superadmin has to unlock API access in the dashboard under Admin > API Access. Access can be granted for a whole brand or for a single entity, such as only `helpdesk-articles`, at Read or Read + write, for 1, 4, 8, or 24 hours. It relocks automatically when the window lapses. Reading the doc or exporting needs Read. Validating and committing an import needs Read + write.
3. **The API base URL.** Expect it in `$FSAI_API_URL`. Do not hardcode a guess: the host has moved before, and it was `https://v2.api.franchisesystems.ai` as of 2026-09-14.

Set up once per shell. On Leo this loads both the key and the URL:

```bash
eval "$(~/bin/fsai-key)"          # production
eval "$(~/bin/fsai-key --staging)" # staging, separate key
```

Every call sends `Authorization: Bearer $FSAI_API_KEY`.

## Workflow

### 1. Find the brand id

```bash
curl -s -H "Authorization: Bearer $FSAI_API_KEY" \
  "$FSAI_API_URL/public/brands"
```

Returns `{ "brands": [{ "id", "name", "logoUrl", "externalBrandName" }] }`, listing only the brands the key holder has permissions on. Match the user's brand by name and take its `id`.

If the list is empty, the account has no brand permissions yet. Tell the user, and stop. Do not guess a brand id.

`helpdesk-articles` is global. The `brandId` you pass only scopes uploaded files, so any brand you can reach and that is unlocked will work for articles.

### 2. List the available entities

```bash
curl -s -H "Authorization: Bearer $FSAI_API_KEY" \
  "$FSAI_API_URL/fsai-admin/bulk/entities"
```

Returns `{ "entities": [{ "key", "label", "description" }] }`. Pick the `key` that matches what the user asked for, for example `helpdesk-articles`. This endpoint needs no brand and no grant, so it always works. 39 entities as of 2026-09-14; `reference.md` lists them all, but this endpoint is the live truth.

### 3. Fetch the agent doc for that entity

Always do this before authoring any record, even when you have imported the same entity before. The doc changes as the schema changes.

```bash
ENTITY=helpdesk-articles
BRAND_ID=<brand id from step 1>

curl -s -H "Authorization: Bearer $FSAI_API_KEY" \
  "$FSAI_API_URL/fsai-admin/bulk/$ENTITY/doc?brandId=$BRAND_ID"
```

Returns `{ "schemaMarkdown", "brandSnapshot" }`.

`schemaMarkdown` always carries these sections, in this order:

1. `## Rules`: whether the entity upserts by natural key or by `id` only, plus `$id`
   aliasing and how to reference an existing row.
2. `## Fields`: field, type, required or optional, and the description. The description is
   where the side effects live, for example whether providing an array replaces the whole
   structure and deletes what you left out. Read every description, not just the types.
3. `### <path> items`: one nested table per object-shaped field, recursively.
4. `## Allowed values`: every enum, by dot path.
5. `## Example`: a complete envelope with typed placeholders.

`brandSnapshot` differs per entity. It carries the brand's existing rows with real ids, the
valid vocabularies, prose notes such as `identityNote` and `structureNote`, and usually an
`example` or `exampleContent` payload.

Read both in full before writing records. Take every id, status name, template name, tag and
category from `brandSnapshot`. Never invent a UUID and never carry one over from another
brand. For rich-text bodies, mirror the `exampleContent` structure exactly.

### 4. Export the current data

```bash
curl -s -H "Authorization: Bearer $FSAI_API_KEY" \
  "$FSAI_API_URL/fsai-admin/bulk/$ENTITY/export?brandId=$BRAND_ID" \
  -o export.json
```

Returns an envelope: `{ "entity", "version": 1, "records": [] }`.

Use the export for two things. First, to see the real shape of live records, which is more reliable than inferring one. Second, as the starting point for edits: change the records you need, keep the envelope shape, and re-import.

Check the export for records that already cover what the user wants to add. For articles, an existing `slug` is the update key, so reusing it updates that article instead of creating a duplicate.

### 5. Author the import envelope

Write a file with the envelope shape:

```json
{
  "entity": "helpdesk-articles",
  "version": 1,
  "records": [
    {
      "title": "How to reset a password",
      "slug": "how-to-reset-a-password"
    }
  ]
}
```

Record identity, in the order the server resolves it:

- `id` is an explicit upsert target. Set it when you know the exact record you are updating.
- For articles, `slug` matches an existing article. If you omit `slug`, the server derives one from `title`, which means a retitled article can create a second record rather than updating the first.
- `$id` is a local alias used only inside the envelope, so one record can reference another before either exists.

Keep the payload under 8 MB. Split larger imports into several envelopes and run them as separate jobs.

### 6. Validate

```bash
curl -s -X POST -H "Authorization: Bearer $FSAI_API_KEY" \
  -H "Content-Type: application/json" \
  --data-binary @import.json \
  "$FSAI_API_URL/fsai-admin/bulk/$ENTITY/jobs"
```

The request body is `{ "brandId": "...", "envelope": { ... } }`, so wrap the envelope before posting:

```bash
jq --arg b "$BRAND_ID" '{brandId: $b, envelope: .}' envelope.json > import.json
```

Returns `{ "jobId": "..." }`. Nothing has been written at this point.

Poll every 5 seconds, never faster, until the status leaves `validating`:

```bash
curl -s -H "Authorization: Bearer $FSAI_API_KEY" \
  "$FSAI_API_URL/fsai-admin/bulk/jobs/$JOB_ID"
```

Statuses are `validating`, `validated`, `committing`, `completed`, `failed`. Stop polling at `validated` or `failed`. On `failed`, show the `error` field verbatim and stop. Give up after about 20 polls and tell the user the job is still running rather than polling on.

### 7. Show the plan and get approval

This step is not optional. When the job reaches `validated`, `planSummary` holds `counts` and a per-record plan.

Present to the user:

- The counts: how many records will be created, updated, skipped, and how many are in error.
- Every record that carries any `errors` or `warnings`, identified by its `index` and by a human-readable field such as `title` or `slug`, with the messages quoted.
- What each update will overwrite, when that is not obvious from the counts alone.

Then ask for explicit approval before committing. The only exception is when the user has already stated an auto-approve preference for this session or this task. Absent that, wait for a yes.

Commit is refused while `counts.error > 0`. Fix the offending records, post a new job, and validate again. There is no partial commit.

### 8. Commit

```bash
curl -s -X POST -H "Authorization: Bearer $FSAI_API_KEY" \
  "$FSAI_API_URL/fsai-admin/bulk/jobs/$JOB_ID/commit"
```

Returns `{ "jobId": "..." }`. Poll the job endpoint again until `completed` or `failed`. On `failed`, surface the `error` field verbatim rather than paraphrasing it.

### 9. Confirm

Re-export the entity and check that the records landed as planned. Re-posting the same slugs should now plan as `update` rather than `create`. Report to the user what was created and what was updated.

## Hard Rules

- **Read-only by default.** The four GET endpoints (entities, doc, export, job status) are
  free to call whenever they help. Everything that writes, meaning `POST .../jobs` and
  `POST .../jobs/:jobId/commit`, needs the user's explicit go for that specific job, every
  time. A prior approval on an earlier import is not an approval for this one.
- **Load discipline against production.** The backend has been taken down once by bulk API
  traffic. One job in flight at a time. Never poll faster than every 5 seconds. Stop on the
  first 5xx and report it rather than retrying, and tell the user so they can warn Bill.
  Split a large import into several envelopes and run them one after another, not at once.
- **Never echo the key.** Do not print `$FSAI_API_KEY`, do not write it into a file or a command transcript, and do not include it in any output. Reference it only as the shell variable.
- **Always fetch the live agent doc before authoring records.** Never write records from memory, from a repo copy, or from a previous session's understanding of the schema.
- **The live doc beats every copy.** When `schemaMarkdown` disagrees with an extracted
  `*-agent-doc.md`, a project CLAUDE.md, or this skill, follow the live doc and say the copy
  is stale.
- **Mirror `exampleContent` for article bodies.** Article content is Tiptap JSON. Copy the node structure from the doc's `exampleContent` and from real exported records. Never invent Tiptap node types or attributes.
- **Reuse existing slugs to update.** Before creating an article, check the export for a matching slug or title. Reusing the slug updates the article. Coining a new one duplicates it.
- **Always show the validation plan and get approval before committing.** Counts plus every record with errors or warnings, then an explicit yes from the user, unless the user has stated an auto-approve preference.
- **A 403 mentioning "locked" is not retryable.** It means API access is off for what you are touching. That can be the whole brand, or that one entity, since access is granted either way. Tell the user to ask a superadmin to unlock it in Admin > API Access, and name what you need: the brand, the entity key, and whether Read or Read + write is required. Do not retry, and do not try a different brand to get around it.
- **Respect 429.** On a rate-limit response, wait for the number of seconds in the `Retry-After` header before the next call. Do not retry in a tight loop.
