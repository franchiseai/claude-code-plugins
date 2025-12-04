# FSAI - Claude Code Plugins

Claude Code plugins for code quality and development workflows.

## Installation

```bash
# Add the marketplace
/plugin marketplace add franchiseai/claude-code-plugins

# Install the code-cleanup plugin
/plugin install code-cleanup@fsai

# Install the dead-code plugin
/plugin install dead-code@fsai
```

## Plugins

### code-cleanup

Remove AI-generated code patterns ("slop") from a branch.

**Usage:** Just ask Claude Code:
- "Remove the slop from this branch"
- "Clean up AI code"
- "Make this code look human-written"

Claude will diff against master, identify AI patterns, and fix them.

### code-cleanup

Remove dead code from a branch.

**Usage:** Just ask Claude Code:
- "Remove the dead code from this branch"

Claude will diff against master, identify dead code, and remove it.

