---
name: domain-refactor
description: Refactor a backend domain to follow the 3-layer architecture pattern (Controller → Service → Entity). Use when asked to refactor a domain, add an entity layer, fix architecture violations, or align a domain with backend-architecture.md. Triggers on phrases like "refactor domain", "add entity", "fix architecture", "align with pattern", or "domain doesn't have an entity".
---

# Domain Architecture Refactor

Refactor a backend domain to follow the 3-layer pattern documented in `docs/backend-architecture.md`.

**Announce at start:** "I'm using the domain-refactor skill to audit and refactor this domain."

## The Process

This is an interactive, incremental refactor. Never batch large changes without human review.

### Step 1: Identify the Domain

If the user hasn't specified a domain, ask which one. Domains live in `apps/backend/src/api/<domain>/`.

### Step 2: Audit

Read all files in the domain directory. Also read `docs/backend-architecture.md` for the reference patterns.

Produce an audit report listing every violation found, organized by category:

**Missing entity layer**
- Does the domain have an entity file? If not, flag it.
- Are there DB queries (`database.select`, `database.insert`, `database.update`, `database.delete`, `database.query`) directly in the service? List each one.

**Business logic in controllers**
- Controllers branching on domain state (checking fields, conditional logic beyond input shape validation)
- Controllers computing error messages based on domain data
- Controllers calling entity methods directly

**Business logic in services that should be entity predicates**
- Services checking domain state inline (`if (thing.status === 'x')`) instead of calling an entity predicate
- Services resolving internal IDs independently instead of getting them from predicates

**Event emission in services**
- `eventBridge.emit()` or `eventBridge.emitMany()` calls in the service that are paired with a single entity data operation

**Side effects in wrong layers**
- Notifications or emails triggered from entities or controllers

Present the audit and ask: **"Here's what I found. Which categories should we address? Want to tackle all of them, or focus on specific ones?"**

### Step 3: Plan Entity Creation (if needed)

If the domain needs a new entity file, present what it should contain:

1. **Predicates to extract** — List each business rule check in the service that should become a `can*` or `is*` predicate. Show the current service code and proposed entity signature.
2. **Data access to move** — List each DB query in the service that should move to the entity. Group by read vs write operations.
3. **Event emissions to move** — List each `eventBridge` call that should move into the entity alongside its paired data operation.

Ask: **"Does this look right for the new entity? Anything to add or remove?"**

### Step 4: Implement Incrementally

Work through changes one category at a time. After each category:

1. Make the changes
2. Show a brief summary of what moved where
3. Ask: **"How does this look? Ready for the next category?"**

**Order of operations:**
1. Create the entity file (empty class with singleton export)
2. Move data access methods (reads first, then writes)
3. Extract predicates from service inline checks
4. Move event emissions into entity methods
5. Update service to call entity methods
6. Clean up controller if needed

### Step 5: Verify

After all changes:
- Run `yarn tsc:all` to confirm compilation
- Run domain tests if they exist
- Present final summary of the refactor

## Audit Checklist

Use this to check each violation type:

**Controller layer:**
- [ ] Only extracts session, validates input shape, calls assertions, calls service, returns response
- [ ] No business logic or domain state checks
- [ ] No direct entity calls
- [ ] No DB access

**Service layer:**
- [ ] Orchestrates entity calls
- [ ] Enforces rules by calling entity predicates then throwing
- [ ] Owns transactions (`database.transaction(...)`)
- [ ] Triggers side effects (notifications, emails) after transactions
- [ ] Does NOT resolve internal IDs independently (gets them from predicate returns)
- [ ] Does NOT contain raw DB queries (these belong in the entity)
- [ ] Does NOT define business rules inline

**Entity layer:**
- [ ] Defines business rules as predicates (`can*` → `{ allowed, reason }`, `is*` → `boolean`)
- [ ] Predicates never throw
- [ ] Async predicates return resolved context (e.g. `instanceId`) alongside `allowed`
- [ ] Owns all data access (CRUD, complex queries, joins)
- [ ] Emits domain events via `eventBridge` after data writes
- [ ] Returns `null` for not found (doesn't throw `NotFoundError`)
- [ ] Transforms DB rows to SDK types
- [ ] Private `resolve*` methods for internal ID resolution

## Patterns to Apply

**Sync predicate** (entity has the data already fetched by service):
```typescript
canConvert(deal: Pick<Deal, 'convertedAt' | 'applicationId'>): { allowed: boolean; reason?: string } {
  if (deal.convertedAt) return { allowed: false, reason: 'Already converted' };
  return { allowed: true };
}
```

**Async predicate with context** (entity resolves internal state):
```typescript
async canAddTodoItem(taskId: string): Promise<
  { allowed: true; instanceId: string } | { allowed: false; reason: string }
> {
  const instance = await this.resolveInstance(taskId);
  if (!instance) return { allowed: false, reason: 'No output found' };
  return { allowed: true, instanceId: instance.instanceId };
}
```

**Service enforcement:**
```typescript
const check = await entity.canDoThing(id);
if (!check.allowed) throw new ValidationError(check.reason);
await entity.doThing(check.resolvedId, data);
```

**Entity event emission:**
```typescript
async createThing(data: CreateThingData) {
  const [result] = await database.insert(things).values(data).returning();
  await eventBridge.emit('thing.created', {
    brandId: data.brandId,
    data: { thingId: result.id },
  });
  return result;
}
```

## Key Principles

- **One category at a time** — Don't dump all changes at once
- **Ask before creating** — Always confirm the entity shape before writing it
- **Preserve behavior** — This is a refactor, not a feature change. Inputs and outputs stay the same.
- **Match existing style** — Look at `dealEntity.ts` and `taskOutputsEntity.ts` for reference
- **Don't over-extract** — Simple read-only passthroughs in the service are fine. Not every query needs a predicate.
