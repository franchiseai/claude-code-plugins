# The Loop Rig — Concrete Commands

All paths relative to the fsai repo root. Verified working 2026-07-22; if something 404s or the env var names have changed, grep the codebase before trusting this file.

## Preflight checks

```bash
curl -s -o /dev/null -w '%{http_code}' http://localhost:4000/health   # backend (any 2xx/3xx = up)
curl -s -o /dev/null -w '%{http_code}' http://localhost:8288          # inngest dev server
curl -s -o /dev/null -w '%{http_code}' http://localhost:3005          # langfuse
grep -E '^AI_ENGINE_(DEV_MODEL|LOCAL_BASE_URL)=' apps/backend/.env    # dev model override
```

The model resolver (`apps/backend/src/api/ai-engine/runs/runtimes/modelResolver.ts`) routes `local/` and `ollama/` prefixed model ids to the OpenAI-compatible endpoint in `AI_ENGINE_LOCAL_BASE_URL`. With `AI_ENGINE_DEV_MODEL` set, ALL engine calls use the override (recipes still pin their prod model for production). Expect ~2.5 min per two-phase compose run on llama-3.3-70b.

## Langfuse auth

Keys in `apps/backend/.env` are QUOTED — strip them:

```bash
PK=$(grep '^LANGFUSE_PUBLIC_KEY' apps/backend/.env | cut -d= -f2 | tr -d '"')
SK=$(grep '^LANGFUSE_SECRET_KEY' apps/backend/.env | cut -d= -f2 | tr -d '"')
# then: curl -u "$PK:$SK" ...
```

## Reading traces

```bash
# List recent traces (latency is in SECONDS)
curl -s -u "$PK:$SK" 'http://localhost:3005/api/public/traces?limit=20&orderBy=timestamp.desc'

# Full trace: input (system+prompt), output, per-generation observations
curl -s -u "$PK:$SK" 'http://localhost:3005/api/public/traces/<traceId>'
```

Engine trace metadata keys (vary per trace — don't assume all are present):
`fsai.agent.run_id`, `fsai.agent.recipe_id`, `fsai.agent.brand_id`, `fsai.agent.origin.kind`, and `fsai.agent.seam.*` (task, runtime, terminal, rubric, discovery, invocation, plan-shape, pre-selection, approval-routing). Match your run by `run_id` when you have it, otherwise by timestamp + brand_id.

Failure signatures:

- Observation with `usage 0/0, output null` → the call died silently. Rig failure; do not score.
- Multiple `GENERATION` observations inside one `ai.generateObject` span → AI SDK provider retries (0-token first attempt = empty provider response, retried; doubles latency).
- No trace at all for a triggered run → the trigger never reached the backend.

## Pushing scores (the iteration ledger)

```bash
curl -s -u "$PK:$SK" -X POST http://localhost:3005/api/public/scores \
  -H 'Content-Type: application/json' \
  -d '{
    "traceId": "<traceId>",
    "name": "loop/<feature>/<criterion>",
    "value": 1,
    "dataType": "NUMERIC",
    "comment": "iteration 3: tightened tone instruction; greeting no longer generic"
  }'
# returns {"id": "..."} on success
```

One score per rubric criterion per judged run, plus `loop/<feature>/overall` whose comment carries the one-line iteration summary. Read them back with `GET /api/public/scores?limit=...`.

## Triggering runs

Preferred: inngest MCP tools (`mcp__inngest-dev__send_event`, `poll_run_status`). The MCP connects flakily — the no-drama fallback is a raw event POST:

```bash
curl -s -X POST http://localhost:8288/e/dev \
  -H 'Content-Type: application/json' \
  -d '{"name": "<event/name>", "data": { ... }}'
```

Watch runs at http://localhost:8288 or poll via the MCP.

## Judging persisted output

Engine outputs often land in the dev DB, not just the trace. Read via psql against the dev database (container `supabase_db_brand-dashboard`), e.g. email templates in `templates.json`.

## Dev persona brands (dev DB, as of 2026-07)

Enriched fixtures kept for exactly this kind of loop:

- **Sunny Scoops** `5b5aaf6a-…` — `voiceOfBrand` set
- **The CodFather** `8bfd3e7e-…` — brand-voice SKILL row
- **11-Seven** `e58d026c-…` — about text only

Look up full ids in the dev DB (`brands` table) — memory only retains prefixes.
