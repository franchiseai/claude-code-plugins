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
/plugin install fsai-workflow-actions@fsai
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

### ai-feature-loop

Human-and-AI-in-the-loop quality improvement for AI Engine features. Runs trigger → observe → judge → improve batches: triggers real engine runs, judges the outputs against a rubric agreed up front, pushes verdicts as Langfuse scores, and iterates on prompt/recipe text one change at a time. Human reviews at batch boundaries; non-prompt changes (context assembly, model/params, feature code) queue for approval.

**Usage:** Invoke deliberately with:

- `/ai-feature-loop <feature>`

It never auto-triggers during normal feature development.

**Prerequisites:** The local rig must be up: backend (:4000), inngest dev server (:8288), Langfuse (:3005), and the `AI_ENGINE_DEV_MODEL` override set in `apps/backend/.env`. Loops run on the dev model — spot-check on the prod model before shipping.

---

### engine-retro

Post-feature friction retro for AI Engine features. When a feature wraps, it mines the branch diff for workaround signatures (hacks, bypassed abstractions, copy-pasted boilerplate, special-casing in shared engine code), interviews the dev to catch uncommitted dead ends, and presents findings as "what the engine should offer" with proposed fixes drafted inline. Findings you approve become Linear tickets (`Engine DX: ...`). No ranking — you triage.

**Usage:** Invoke deliberately when a feature wraps:

- `/engine-retro <feature or branch>`

Pairs with `ai-feature-loop`: loop the prompts during the build, retro the engine friction after.

---

### fsai-bulk-data

Import and export FSAI brand data over the superadmin bulk API (`/fsai-admin/bulk`). Finds the brand id, fetches the agent doc for the entity, exports current records, authors an import envelope, posts it as a validation job, shows the plan, and commits only after you approve. Nothing is written until the commit step, and commit is blocked while any record is in error.

**Usage:** Just ask Claude Code:

- "Import these helpdesk articles into FSAI"
- "Export brand data for Sunny Scoops"
- "Bulk import lead statuses"
- "Sync helpdesk articles"

**Prerequisites:**

1. A personal API key from the dashboard under Account > API key, on a superadmin account, exported as `FSAI_API_KEY`. One key per user; regenerating revokes the old one.
2. API access unlocked by a superadmin in Admin > API Access, for the brand or the specific entity, at Read (doc and export) or Read + write (import). Windows relock automatically after 1, 4, 8, or 24 hours.
3. Optionally `FSAI_API_URL`, which defaults to `https://api.franchisesystems.ai`.

A 403 saying access is locked means the brand or that entity is not currently unlocked. The skill will name what it needs and stop rather than retry.

---

### fsai-workflow-actions

FSAI workflow actions and content generation tools. Includes a content generator skill that helps produce valid JSON import files for the FSAI applicant portal and email sequences.

**Usage:** Just ask Claude Code:

- "Generate portal JSON for this brand"
- "Create email sequences"
- "FSAI content generator"

Or invoke directly with `/content-generator`.

**Prerequisites:** Export a brand metadata JSON from the FSAI admin panel and place it in `metadata/` in your workspace. The skill reads asset IDs, form names, and brand context from this file.

**What it does:**

1. Reads brand metadata (assets, forms, brand info)
2. Guides content generation following the portal and sequence JSON schemas
3. Validates output with a bundled `validate.ts` script
4. Catches broken asset references, invalid form names, and schema errors before import

---

## Contributing

To add a new plugin:

1. Create a folder in `plugins/` with your plugin name
2. Add `plugin.json` with metadata
3. Add `skill.md` with the instruction set
4. Update `marketplace.json` to include your plugin
