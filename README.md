# FSAI - Claude Code Plugins

Claude Code plugins for code quality and development workflows.

## Installation

```bash
# Add the marketplace
/plugin marketplace add franchiseai/claude-code-plugins

# Install the code-cleanup plugin
/plugin install code-cleanup@fsai
```

## Plugins

### code-cleanup

Remove AI-generated code patterns ("slop") from a branch.

**Usage:** Just ask Claude Code:
- "Remove the slop from this branch"
- "Clean up AI code"
- "Make this code look human-written"

Claude will diff against main, identify AI patterns, and fix them.
