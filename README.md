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
```

## Plugins

### code-cleanup

Remove AI-generated code patterns ("slop") from a branch.

**Usage:** Just ask Claude Code:
- "Remove the slop from this branch"
- "Clean up AI code"
- "Make this code look human-written"

Claude will diff against master, identify AI patterns, and fix them.

### dead-code

Remove dead code from a branch.

**Usage:** Just ask Claude Code:
- "Remove the dead code from this branch"

Claude will diff against master, identify dead code, and remove it.

### worktree

Manage git worktrees for parallel development.

**Usage:** Just ask Claude Code:
- "Create a worktree for feature-xyz"
- "List my worktrees"
- "Remove the fsai2 worktree"

Claude will manage worktrees and remind you to install dependencies.

