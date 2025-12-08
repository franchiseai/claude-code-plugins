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

# Install the figma-icon-sync plugin
/plugin install figma-icon-sync@fsai
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

### figma-icon-sync

Sync icons from Figma design system to your codebase using Figma MCP.

**Prerequisites:** Requires Figma MCP to be connected. Add it with:
```bash
claude mcp add --transport http figma https://mcp.figma.com/mcp
```
Then authenticate via `/mcp` > figma > Authenticate.

**Usage:** Just ask Claude Code:
- "Sync icons from Figma"
- "Download home and settings icons from the design system"
- "Update icons from Figma"
- "Check available icons in Figma"

Claude will browse your Figma file, extract SVG icons with proper naming conventions (PascalCase, Outlined suffix), and add them to your icons package.

