---
name: fsai-bulk-data
description: Import and export FSAI brand data over the superadmin bulk API. Use when the user asks to "import helpdesk articles", "export brand data", "bulk import", "push articles to FSAI", "sync helpdesk", or mentions "FSAI bulk data". Covers finding a brand id, fetching the agent doc for an entity, authoring an import envelope, validating it into a job, reviewing the plan with the user, and committing.
---

# FSAI Bulk Data Import and Export

Drive the FSAI superadmin bulk import/export API from the command line. The API works as a two-phase job: you post an envelope of records, the server validates it and returns a plan of what would be created, updated, skipped, or rejected, and nothing is written until you commit that job.

**Announce at start:** "I'm using the fsai-bulk-data skill to work with the FSAI bulk API."

Full endpoint and payload reference: read `reference.md` next to this file whenever you need exact shapes, status values, entity keys, or error meanings.

## Prerequisites

1. **A personal API key.** The user mints it in the FSAI dashboard under Account > API key. It must belong to a superadmin account. There is one key per user, and regenerating it invalidates the previous one. Expect it in `$FSAI_API_KEY`. If it is not set, ask the user to export it in their shell. Never print, echo, log, or paste the key into a file, a commit, or a message.
2. **API access unlocked.** A superadmin has to unlock API access in the dashboard under Admin > API Access. Access can be granted for a whole brand or for a single entity, such as only `helpdesk-articles`, at Read or Read + write, for 1, 4, 8, or 24 hours. It relocks automatically when the window lapses. Reading the doc or exporting needs Read. Validating and committing an import needs Read + write.
3. **The API base URL.** Expect it in `$FSAI_API_URL`. If it is not set, use `https://api.franchisesystems.ai`.

Set up once per shell:

```bash
export FSAI_API_URL="${FSAI_API_URL:-https://api.franchisesystems.ai}"
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

Returns `{ "entities": [{ "key", "label", "description" }] }`. Pick the `key` that matches what the user asked for, for example `helpdesk-articles`. `reference.md` lists the known keys, but this endpoint is the live truth.

### 3. Fetch the agent doc for that entity

Always do this before authoring any record, even when you have imported the same entity before. The doc changes as the schema changes.

```bash
ENTITY=helpdesk-articles
BRAND_ID=<brand id from step 1>

curl -s -H "Authorization: Bearer $FSAI_API_KEY" \
  "$FSAI_API_URL/fsai-admin/bulk/$ENTITY/doc?brandId=$BRAND_ID"
```

Returns `{ "schemaMarkdown", "brandSnapshot" }`. `schemaMarkdown` is the field-by-field contract for that entity, including an `exampleContent` block for rich-text bodies. `brandSnapshot` is live brand context you can reference by natural key, for example existing categories or collections.

Read it in full before writing records. For article bodies, mirror the `exampleContent` structure exactly.

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

Poll every 2 to 3 seconds until the status leaves `validating`:

```bash
curl -s -H "Authorization: Bearer $FSAI_API_KEY" \
  "$FSAI_API_URL/fsai-admin/bulk/jobs/$JOB_ID"
```

Statuses are `validating`, `validated`, `committing`, `completed`, `failed`. Stop polling at `validated` or `failed`. On `failed`, show the `error` field verbatim and stop.

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

- **Never echo the key.** Do not print `$FSAI_API_KEY`, do not write it into a file or a command transcript, and do not include it in any output. Reference it only as the shell variable.
- **Always fetch the agent doc before authoring records.** Never write records from memory or from a previous session's understanding of the schema.
- **Mirror `exampleContent` for article bodies.** Article content is Tiptap JSON. Copy the node structure from the doc's `exampleContent` and from real exported records. Never invent Tiptap node types or attributes.
- **Reuse existing slugs to update.** Before creating an article, check the export for a matching slug or title. Reusing the slug updates the article. Coining a new one duplicates it.
- **Always show the validation plan and get approval before committing.** Counts plus every record with errors or warnings, then an explicit yes from the user, unless the user has stated an auto-approve preference.
- **A 403 mentioning "locked" is not retryable.** It means API access is off for what you are touching. That can be the whole brand, or that one entity, since access is granted either way. Tell the user to ask a superadmin to unlock it in Admin > API Access, and name what you need: the brand, the entity key, and whether Read or Read + write is required. Do not retry, and do not try a different brand to get around it.
- **Respect 429.** On a rate-limit response, wait for the number of seconds in the `Retry-After` header before the next call. Do not retry in a tight loop.
