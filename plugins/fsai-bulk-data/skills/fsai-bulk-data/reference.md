# FSAI Bulk Data API Reference

Self-contained reference for the FSAI bulk import/export API. Base URL is `$FSAI_API_URL`, default `https://api.franchisesystems.ai`.

## Authentication

Every request sends:

```
Authorization: Bearer $FSAI_API_KEY
```

The key is a personal API key, minted by the user in the FSAI dashboard under Account > API key.

- There is one key per user. Regenerating it invalidates the previous key immediately.
- Keys do not expire on their own.
- The `/fsai-admin/bulk` routes additionally require that the key holder is a superadmin. Organisation keys are rejected.
- Never print, log, or store the key.

## Per-brand API access

Key-authenticated calls into `/fsai-admin/bulk` are gated by a separate switch that a superadmin manages in the dashboard under Admin > API Access.

- A grant is made for a duration of 1, 4, 8, or 24 hours, and relocks automatically when the window lapses.
- A grant is either **Read** or **Read + write**. Read covers the doc and export endpoints. Read + write is required to create a validation job or to commit one.
- A grant can cover a whole brand, or a single entity such as only `helpdesk-articles`. A 403 saying access is locked therefore means either the brand is locked, or that specific entity is not included in the grant.
- Expiry is evaluated per request. There is no grace period: the first request after the window lapses is refused.
- Browser superadmin sessions in the dashboard are unaffected by this gate. It applies to API-key calls only.

When you hit a lock, ask for an unlock naming the brand, the entity key, and whether Read or Read + write is needed. Do not retry and do not switch brands to route around it.

## Brand discovery

### `GET /public/brands`

Lists the brands the key holder has permissions on. This is the endpoint to use for brand id discovery.

```json
{
  "brands": [
    {
      "id": "uuid",
      "name": "Brand Name",
      "logoUrl": "https://... or null",
      "externalBrandName": "string or null"
    }
  ]
}
```

An empty array means the account has no brand permissions. That is a permissions problem, not an API problem.

### `POST /public/brands/match`

This is **not** a name-to-id lookup. It writes an external management organisation's name onto brands you already know the ids of, and it is used by external partner integrations. Body:

```json
{
  "matches": [{ "brandId": "uuid", "externalBrandName": "string" }]
}
```

Returns `{ "results": [{ "brandId", "success", "error?" }] }`, one entry per input, with `success: false` when the brand is out of scope for the key or has no external management record.

For finding a brand id, use `GET /public/brands`.

## Bulk endpoints

All paths are under `/fsai-admin/bulk`.

### `GET /fsai-admin/bulk/entities`

Lists the importable and exportable entities. Ungated: no brand, no data.

```json
{
  "entities": [{ "key": "helpdesk-articles", "label": "Helpdesk Articles", "description": "..." }]
}
```

### `GET /fsai-admin/bulk/:entityKey/doc?brandId=<uuid>`

The agent brief for one entity. Requires Read.

```json
{
  "schemaMarkdown": "markdown describing every field, constraints, and an exampleContent block",
  "brandSnapshot": {}
}
```

`schemaMarkdown` is the authoritative field contract. `brandSnapshot` is live brand context that records can reference by natural key.

Fetch this before authoring records, every time.

### `GET /fsai-admin/bulk/:entityKey/export?brandId=<uuid>`

Exports the current records as an import-ready envelope. Requires Read.

```json
{
  "entity": "helpdesk-articles",
  "version": 1,
  "records": []
}
```

The response can be fed straight back into a validation job after editing.

### `POST /fsai-admin/bulk/:entityKey/jobs`

Creates a validation job. Requires Read + write. Body:

```json
{
  "brandId": "uuid",
  "envelope": { "entity": "helpdesk-articles", "version": 1, "records": [] }
}
```

Returns `{ "jobId": "uuid" }`. Nothing is written to the database by this call. The job runs validation asynchronously.

### `GET /fsai-admin/bulk/jobs/:jobId`

Polls a job. Requires Read on the job's brand.

```json
{
  "jobId": "uuid",
  "status": "validating | validated | committing | completed | failed",
  "planSummary": {
    "counts": { "create": 0, "update": 0, "skip": 0, "error": 0 },
    "records": [
      {
        "index": 0,
        "action": "create | update | skip | error",
        "targetId": "uuid, set when action is update",
        "resolvedRefs": {},
        "errors": [],
        "warnings": []
      }
    ]
  },
  "error": null
}
```

`planSummary` is `null` until validation finishes. `error` is populated on `failed` and should be surfaced verbatim.

Poll every 2 to 3 seconds. Terminal statuses for validation are `validated` and `failed`; for commit they are `completed` and `failed`.

### `POST /fsai-admin/bulk/jobs/:jobId/commit`

Commits a validated job. Requires Read + write. Returns `{ "jobId": "uuid" }`, then poll the job endpoint to `completed` or `failed`.

The commit is refused while `planSummary.counts.error > 0`. There is no partial commit: fix the failing records, create a new job, and validate again.

## Record identity

Within an envelope's `records` array:

- **`id`** is an explicit upsert target. When present, it names the exact record to update.
- **Natural keys** are matched per entity. For `helpdesk-articles` the key is `slug`, and if `slug` is omitted it is derived from `title`. A given or derived slug that matches an existing article plans as `update`; anything else plans as `create`. Retitling without carrying the original slug creates a duplicate.
- **`$id`** is a local alias, scoped to the envelope only. Use it when one record needs to reference another that does not exist yet. It is never stored.

## Entity keys

`GET /fsai-admin/bulk/entities` is the live list. Known keys:

`agents`, `applicant-portal`, `asset-shares`, `brand-feed`, `brand-mockup-sections`, `brand-profile`, `brand-setup`, `brand-ticket-categories`, `certificates`, `collections`, `courses`, `deal-fee-types`, `email-content`, `email-footers`, `forms`, `franchisee-entities`, `franchisees`, `funnel-sites`, `helpdesk-articles`, `ingredients`, `lead-statuses`, `leads`, `learning-paths`, `legal-terms`, `locations`, `manuals`, `marketing-prospects`, `menu-items`, `menu-templates`, `menus`, `project-templates`, `qr-code-templates`, `tags`, `territories`, `tracking-links`, `vendor-assignment-templates`, `vendor-types`, `vendors`, `workflows`.

`helpdesk-articles` is global rather than per brand. The `brandId` you pass only scopes uploaded files, so any brand that is unlocked for that entity will work.

## Limits and errors

| Limit | Value |
| --- | --- |
| JSON body size | 8 MB. Split larger imports into several envelopes. |
| Read requests | 120 per minute per key, across the four GET endpoints. |
| Write requests | 20 per minute per key, across job creation and commit. |

| Status | Meaning | What to do |
| --- | --- | --- |
| 401 | Invalid or expired key. | Ask the user to check or regenerate the key. Do not retry with the same value. |
| 403 | Not a superadmin, an organisation key rather than a personal one, or API access locked or read-only for that brand or entity. | Read the message. If it mentions being locked, ask for an unlock naming the brand, the entity key, and Read or Read + write. Do not retry. |
| 429 | Rate limit exceeded. | Wait for the seconds given in the `Retry-After` header, then continue. |
