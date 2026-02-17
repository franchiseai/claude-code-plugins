# FSAI - Claude Code Plugins

Claude Code plugins for code quality and development workflows.

## Installation

```bash
# Add the marketplace
/plugin marketplace add franchiseai/claude-code-plugins

# Install plugins
/plugin install code-cleanup@fsai
/plugin install dead-code@fsai
/plugin install worktree@fsai
/plugin install architecture-refactor@fsai
/plugin install entity-graph@fsai
/plugin install ux-flows@fsai
```

## Plugins

### code-cleanup

Remove AI-generated code patterns ("slop") from a branch.

**Usage:** Just ask Claude Code:

- "Remove the slop from this branch"
- "Clean up AI code"
- "Make this code look human-written"

Claude will diff against master, identify AI patterns, and fix them.

---

### dead-code

Remove dead code from a branch.

**Usage:** Just ask Claude Code:

- "Remove the dead code from this branch"

Claude will diff against master, identify dead code, and remove it.

---

### worktree

Manage git worktrees for parallel development.

**Usage:** Just ask Claude Code:

- "Create a worktree for feature-xyz"
- "List my worktrees"
- "Remove the fsai2 worktree"

Claude will manage worktrees and remind you to install dependencies.

---

### architecture-refactor

Analyze and refactor backend code to follow the entity/service separation pattern.

**The Pattern:**

```
Controller (HTTP only)
    ↓
Service (orchestration, enforcement, side effects)
    ↓
Entity (business rules as predicates, data access)
    ↓
Database
```

**Usage:** Just ask Claude Code:

- "Refactor deals to entity pattern"
- "Analyze architecture for leads"
- "Extract business rules from application service"
- "Where are the rules for deals?"
- "Create entity for franchisee"
- "Separate concerns for locations"

**What it does:**

1. **Analyzes** the current service/controller for a domain concept
2. **Identifies** scattered business rules, data access, and side effects
3. **Proposes** an entity interface with predicates and data methods
4. **Refactors** the service to be an orchestrator that:
   - Calls entity predicates (`canConvert()`, `isEntityDeal()`)
   - Enforces rules (throws if predicate returns false)
   - Coordinates multiple entities in transactions
   - Triggers side effects after success

**Key Principles:**

| Layer          | Does                                                             | Does Not                          |
| -------------- | ---------------------------------------------------------------- | --------------------------------- |
| **Entity**     | Define rules as predicates (`canX() → boolean`), CRUD, queries   | Throw errors, call other entities |
| **Service**    | Orchestrate, enforce rules (throw), business logic, transactions | Define rules, write SQL           |
| **Controller** | Parse request, auth, call service, format response               | Business logic, call entities     |

**Example Transformation:**

Before (rules scattered in service):

```typescript
async convertDeal(dealId) {
  const deal = await this.getDealOverview(dealId);
  if (deal.convertedAt) throw new ValidationError('Already converted');
  if (!deal.applicationId) throw new ValidationError('No application');
  // ... 200 lines of mixed logic
}
```

After (rules in entity, service orchestrates):

```typescript
async convertDeal(dealId) {
  const deal = await dealEntity.getOverview(dealId);

  const { allowed, reason } = dealEntity.canConvert(deal);
  if (!allowed) throw new ValidationError(reason);

  // Orchestrate...
  await dealNotifications.onConverted(deal);
}
```

---

### entity-graph

Design data models as Mermaid ER diagrams with implementation-ready Drizzle schema code.

**Usage:** Just ask Claude Code:

- "Design the data model for campaigns"
- "I need new tables for user notifications"
- "Schema design for the scheduling feature"

Claude will read your existing schema conventions, ask clarifying questions, present a Mermaid ER diagram, and write an implementation plan with exact Drizzle code.

---

### ux-flows

Turn meeting notes and technical specs into clean UX flow docs for design teams.

**Usage:** Just ask Claude Code:

- "Clean up these flows for the design team"
- "Write UX flows from these meeting notes"
- "Design handoff doc for the onboarding feature"

Claude will strip implementation details and layout prescriptions, keep edge cases and states, and output a ~1 page doc in user-facing language.

---

## Contributing

To add a new plugin:

1. Create a folder in `plugins/` with your plugin name
2. Add `plugin.json` with metadata
3. Add `skill.md` with the instruction set
4. Update `marketplace.json` to include your plugin
