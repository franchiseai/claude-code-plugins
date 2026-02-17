---
name: entity-graph
description: Use when designing a new data model, adding database tables, or planning schema changes. Triggers on "entity graph", "data model", "new tables", "schema design", or when a feature requires new database entities.
---

# Entity Graph

Design data models as Mermaid ER diagrams with implementation-ready Drizzle schema code.

## Process

1. **Understand existing patterns** — read the project's schema file to learn conventions (PK style, timestamp format, FK naming, enum patterns, index conventions). Don't guess — match what's there.

2. **Ask clarifying questions** — one at a time, multiple choice preferred. Focus on: entity boundaries, relationship cardinality, nullable vs required, cascade behavior, naming collisions with existing tables.

3. **Present the entity graph** — Mermaid `erDiagram` showing all entities with fields, types, constraints, and relationships. Include existing tables (like `brands`) as stubs where they connect. Present in sections, validate each.

4. **Document design decisions** — short list of non-obvious choices and why (e.g. "no redundant brand_id — inherited via parent", "ON DELETE SET NULL to preserve history").

5. **Write implementation plan** — task-by-task with exact Drizzle code matching the project's conventions. Group by dependency order (enums first, then parent tables, then children, then relations, then migration generation).

## Output

Write to `docs/plans/YYYY-MM-DD-<topic>-entity-graph.md` containing:
- Mermaid ER diagram (the primary artifact)
- Key design decisions
- Task-by-task implementation plan with Drizzle code

## Principles

- **Match existing conventions exactly** — don't introduce new patterns for timestamps, FKs, or naming
- **Stub connected tables** — show existing tables in the diagram as `{ uuid id PK }` stubs so relationships are visible
- **Index what gets queried** — add indexes on FKs and status columns used in common filters
- **Name to avoid collisions** — prefix table names if generic (e.g. `social_accounts` not `accounts`)
- **No RLS in the schema task** — add policies in a follow-up once the backend auth layer exists
