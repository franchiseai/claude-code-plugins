---
name: pr-description
description: This skill should be used when the user asks to "write a PR description", "create a PR", "open a PR", "push and create PR", "submit PR", "pr-description", or when finishing a feature branch and needing to create a pull request. Triggers on phrases like "create PR", "open PR", "write PR", "push this up", "submit this for review", or "pr description".
---

# PR Description Writer

Write standardized PR descriptions and create GitHub pull requests. Analyze the current branch's changes, write a description following team guidelines, confirm with the user, then push and create the PR.

## Workflow

### Step 1: Gather Branch Context

Collect all information about the current branch's changes. Run these commands in parallel:

```bash
# Current branch and base
git branch --show-current
git log --oneline main...HEAD  # or master...HEAD — detect the default branch

# Full diff against base branch for understanding changes
git diff main...HEAD --stat
git diff main...HEAD

# Check remote status
git status
```

Identify the base branch (main or master) automatically. If neither exists, ask the user.

### Step 2: Analyze Changes

Read the diff and commit history to understand:

1. **What changed** — user-visible behavior changes, new features, fixes
2. **What layers were touched** — backend, SDK, frontend, schema, etc.
3. **Whether UI changed** — if so, screenshots section is required
4. **What was intentionally deferred** — TODOs, temporary scaffolding, placeholder UI

Focus on the *what*, not the *how*. Implementation details belong in the code, not the PR description.

For detailed guidelines and examples, consult **`references/guidelines.md`**.

### Step 3: Draft the PR Description

Write the description using this structure:

```markdown
### Summary

- 3–8 bullets describing what changed from a user/reviewer perspective
- Mostly what. A little why. No how.

### Decisions *(include only if non-obvious tradeoffs were made)*

- 1–3 bullets explaining why, not how

### Not included *(include when work is intentionally deferred)*

- Temporary UI, known gaps, follow-up work

### Screenshots *(required for UI changes)*

*(placeholder — remind the user to add screenshots)*

### Testing

- [ ] Concrete, verifiable test scenarios
- [ ] Cover happy path, edge cases, persistence, regression
```

**Writing rules:**
- Lead each summary bullet with the behavior change, not the file or module
- If multiple layers were updated (backend, SDK, frontend), one bullet saying "updated end-to-end" is fine
- Testing items must be concrete and verifiable ("Toggle off, trigger twice — both instances created"), not vague ("Test the toggle")
- Mark testing items as `[ ]` unchecked — the author checks them off after verifying
- Omit the Decisions section entirely for most PRs
- Omit the Not Included section if nothing was deferred
- If UI changed, include a Screenshots section with a reminder to add images

### Step 4: Confirm with User

Present the full PR description draft using `AskUserQuestion`. Ask:

1. Whether the summary accurately captures the changes
2. Whether any deferred work should be called out in "Not included"
3. Whether screenshots are needed (if UI changes detected)
4. The PR title — suggest one following the commit message format: `<type>(<package>): <description>`

### Step 5: Create the PR

After user confirms:

```bash
# Push with upstream tracking
git push -u origin $(git branch --show-current)

# Create PR with gh
gh pr create --title "<title>" --body "<description>"
```

Use a HEREDOC for the body to preserve formatting:

```bash
gh pr create --title "feat(bd): add entity deduplication toggle" --body "$(cat <<'EOF'
### Summary

- ...

### Testing

- [ ] ...
EOF
)"
```

### Step 6: Report

Tell the user the PR URL and remind them to:
- Add screenshots if the PR includes UI changes
- Check off testing items as they verify each scenario

## Commit Message Format

PR titles follow the commit message convention:

```
<type>(<package>): <description>
```

- **Types:** `feat`, `fix`, `refactor`, `tooling`
- **Packages:** `bp` (brand-dashboard), `ap` (applicant-portal), `bd` (backend), `sdk`
- Omit package for cross-cutting changes

## Key Principles

- **No implementation details in the summary** — if a reviewer wants to know how, they read the code
- **Always confirm before creating** — present the draft and get user approval
- **Testing items must be specific** — "Toggle off, save, reload — setting persists" not "Test persistence"
- **Screenshots are required for UI changes** — remind the user even if images can't be generated
- **Call out deferred work** — prevents reviewers from flagging known gaps
- **One PR description per PR** — don't split into multiple descriptions

## Additional Resources

For the full PR description guidelines with examples and anti-patterns, consult:
- **`references/guidelines.md`** — Complete guidelines with good/bad examples and a full example PR
