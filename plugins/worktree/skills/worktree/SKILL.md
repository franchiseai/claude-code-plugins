---
name: worktree
description: Manage git worktrees for the current repository. Use when asked to create a worktree, set up parallel development, work on multiple branches simultaneously, or manage existing worktrees. Triggers on phrases like "create worktree", "new worktree", "parallel branch", "list worktrees", or "remove worktree".
---

# Git Worktree Management

Manage git worktrees for parallel development.

## What Are Worktrees?

Git worktrees let you have multiple working directories from the same repo, each on a different branch. This enables running parallel dev servers, working on multiple features, or testing changes side-by-side.

## Commands

All commands should be run from the main repository directory or use the repo path.

### List Worktrees
```bash
git worktree list
```

### Create New Worktree with New Branch
```bash
# Creates a new branch from the base branch and checks it out in the new worktree
git worktree add -b <new-branch-name> <path> <base-branch>

# Example: Create ../myrepo-feature on new branch "feature-xyz" based on master
git worktree add -b feature-xyz ../myrepo-feature master
```

### Create Worktree from Existing Branch
```bash
git worktree add <path> <existing-branch>

# Example
git worktree add ../myrepo-hotfix hotfix-branch
```

### Create Detached Worktree (same commit, no branch)
```bash
git worktree add --detach <path> <commit-or-branch>
```

### Remove Worktree
```bash
git worktree remove <path>
```

### Prune Stale Worktree Info
```bash
git worktree prune
```

## Workflow

1. **Creating a worktree:**
   - Ask user for branch name and optional directory path
   - Default path convention: `../<repo-name>-<identifier>` (sibling to main repo)
   - Determine if creating new branch or using existing
   - Create the worktree
   - Remind user to install dependencies in the new directory

2. **After creation, inform user:**
   ```
   Worktree created at <path> on branch <branch>

   Next steps:
   cd <path>
   <package-manager> install
   ```

3. **Listing worktrees:**
   - Show all current worktrees with their branches and paths
   - Indicate which is the main worktree (bare)

4. **Removing worktrees:**
   - First list current worktrees
   - Confirm with user which to remove
   - Run the remove command
   - Optionally prune if needed

## Important Notes

- The same branch cannot be checked out in multiple worktrees
- Each worktree needs its own dependency installation (`yarn install`, `npm install`, etc.)
- Worktrees share the same `.git` directory (saves disk space)
- Use `--detach` flag to create a worktree at a specific commit without a branch
- Worktree paths are typically siblings to the main repo (e.g., `../repo-feature`)
