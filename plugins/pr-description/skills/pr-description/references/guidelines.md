# PR Description Guidelines

## Structure

Every PR description follows this structure:

```markdown
### Summary

- What changed, from a user/reviewer perspective
- Each bullet is a self-contained change or behavior
- 3–8 bullets, scaled to PR size

### Decisions *(optional — most PRs won't need this)*

- Only when a choice isn't obvious and a reviewer would reasonably ask "why?"
- A couple of short bullets, not a design doc

### Not included *(when applicable)*

- Anything temporary, intentionally deferred, or placeholder
- Tells the reviewer what NOT to evaluate

### Screenshots *(required for UI changes)*

Before/after when modifying existing UI. New screens for new features.

### Testing

- [x] Scenario the author verified
- [x] Edge case that could regress
- [ ] Scenario the reviewer should spot-check
```

## Principles

**Mostly what. A little why. No how.**

The summary should make sense to someone who hasn't seen the code. Describe the feature, behavior change, or fix — not the implementation.

| Good | Bad |
|------|-----|
| Adds a toggle to prevent duplicate workflow instances per entity | Uses a SQL EXISTS subquery to check for matching entity_id |
| Failed and cancelled instances no longer block retries | Changed the WHERE clause to exclude status IN ('failed', 'cancelled') |
| New column, SDK types, and frontend state updated end-to-end | Added a nullable boolean column with a Drizzle migration and updated the Zustand store |

If the PR touches multiple layers (backend, SDK, frontend), a single bullet like "updated end-to-end" is fine.

## Section Details

### Summary

- Lead with the user-visible behavior change
- 3–8 bullets, scale with PR size
- No implementation details — reviewers read code for that
- If it spans multiple layers, a single "updated end-to-end" bullet suffices

### Decisions

Most PRs skip this section. Include only when:
- A choice between reasonable approaches isn't self-evident
- A tradeoff the reviewer should know about (e.g. "polling over websockets because this runs once on page load")
- Something looks wrong but is intentional

1–3 bullets max. More than that belongs in a design doc.

### Not Included

Use when the PR intentionally defers something:
- Non-final UI that will be replaced in a follow-up
- Known edge cases handled separately
- Feature flags or temporary scaffolding

Prevents reviewers from flagging known gaps and creates a paper trail for follow-up.

### Screenshots

Required for any UI change. Optional otherwise.
- New features: show the new UI
- Modifications: before and after
- Crop to the relevant area

### Testing Checklist

Serves two audiences:
1. **Author** — forcing function to verify your own work
2. **Reviewer** — guide for spot-checking and identifying missing coverage

Write each item as a concrete, verifiable scenario:

| Good | Bad |
|------|-----|
| Toggle off, trigger workflow twice for same entity — both instances created | Test the toggle |
| Reload the page — setting persists | Check persistence |

Mark verified items `[x]`. Leave `[ ]` for reviewer to check.

**Cover:** happy path, edge cases, persistence, regression of related features, cross-cutting impact on shared code consumers.

## Example

```markdown
### Summary

- Adds a limitOnePerEntity boolean (default: true) to workflow definitions
  that prevents duplicate workflow instances for the same entity
- When enabled, the trigger worker checks for existing running or completed
  instances before creating a new one — if found, the trigger is silently skipped
- Failed and cancelled instances do not block, allowing retries
- Toggle lives in the Cancellation Rules panel with a warning when disabled
- New column, SDK types, backend validation, entity layer, frontend
  types/store/builder all updated end-to-end

### Not included

- Bulk retroactive enforcement on existing workflows — will be handled in
  a follow-up migration PR

### Screenshots

*(screenshots of the toggle in the Cancellation Rules panel)*

### Testing

- [x] Create a new workflow — verify limitOnePerEntity defaults to on
- [x] Open an existing workflow — toggle appears and reflects saved state
- [x] Toggle off — warning message appears about duplicate emails/tasks
- [x] Toggle on — warning disappears
- [x] Save workflow with toggle on, reload — setting persists
- [x] Save workflow with toggle off, reload — setting persists
- [x] Activate workflow with limit on, trigger for an entity — instance created
- [x] Trigger same workflow for same entity again — second instance not created
- [x] Cancel running instance, trigger again — new instance created
- [x] Activate workflow with limit off, trigger twice — both instances created
- [x] Duplicate a workflow — setting carries over
- [x] Export/import workflow JSON — limitOnePerEntity preserved
```
