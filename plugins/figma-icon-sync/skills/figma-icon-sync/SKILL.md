---
name: figma-icon-sync
description: Sync icons from Figma design system to your codebase. Use when asked to sync, download, or update icons from Figma, or to browse a Figma icon library. Triggers on phrases like "sync icons from Figma", "download icons from design system", "get icons from Figma", or "update icons from Figma".
---

# Figma Icon Sync

Sync icons from a Figma design system to your codebase. Connects to Figma MCP to browse, search, and download icons as optimized SVG files.

## Prerequisites

Ensure Figma MCP is connected. Check with `/mcp`. If not connected:
```bash
claude mcp add --transport http figma https://mcp.figma.com/mcp
```
Then authenticate via `/mcp` > figma > Authenticate.

## Example Figma File

Default reference file: https://www.figma.com/design/xe1fVdPmJnvHPMKoE4Jasm/central-icon-system
File Key: `xe1fVdPmJnvHPMKoE4Jasm`

Users should provide their own Figma file URL for their design system.

## Workflow

1. **Verify MCP connection** via `/mcp` - figma server must be connected
2. **Browse file structure** using `get_metadata` to see pages/sections
3. **Find required icons** in codebase:
   ```bash
   grep -r "Icon" --include="*.tsx" --include="*.ts" .
   ```
4. **Extract icons** using `get_design_context` with SVG output
5. **Optimize and save** with correct naming conventions
6. **Build icons package** using project build commands
7. **Report** synced icons summary

## Naming Conventions

| Type | Naming | Example |
|------|--------|---------|
| Filled (default) | `IconName.svg` | `Home.svg` |
| Outlined | `IconNameOutlined.svg` | `HomeOutlined.svg` |

**Transformations:**
- `arrow-left` → `ArrowLeft.svg`
- `arrow_left` → `ArrowLeft.svg`
- `arrow-left-outlined` → `ArrowLeftOutlined.svg`

## SVG Requirements

When extracting via `get_design_context`:
- viewBox="0 0 24 24"
- width="24" height="24"
- Clean paths, no transforms
- No Figma metadata or comments

## MCP Tools

| Tool | Use For |
|------|---------|
| `get_metadata` | Structure exploration, finding node IDs |
| `get_design_context` | Extracting SVG code |
| `get_screenshot` | Visual verification |

## Icon Locations

Common project locations:
- `packages/icons/`
- `libs/icons/`
- `src/icons/`

Check project structure and follow existing conventions.

## Large File Navigation

For files with many icons:
1. Get structure first with `get_metadata`
2. Note section names containing icons
3. Request specific sections
4. Download only needed icons to minimize API calls

## Error Handling

| Error | Solution |
|-------|----------|
| MCP not connected | Authenticate via `/mcp` |
| Rate limits | Batch requests, add delays |
| Large files | Use `get_metadata` first |
| Missing icons | Check naming, search alternatives |

## Example Session

```
User: "Sync home and settings icons from Figma"

Steps:
1. Verify MCP connection
2. get_metadata → browse file structure
3. Find "home" and "settings" icons
4. For each: get filled + outlined variants
5. Download as SVG via get_design_context
6. Optimize to 24x24
7. Save as Home.svg, HomeOutlined.svg, etc.
8. Add to icons package
9. Run build command
10. Report synced icons
```

## Helper Scripts

This plugin includes Python scripts for batch processing:

- `scripts/optimize_svg.py` - Optimize SVGs (dimensions, cleanup)
- `scripts/browse_icons.py` - Parse and search Figma metadata

Usage:
```bash
python scripts/optimize_svg.py input.svg output_dir/
python scripts/optimize_svg.py --batch input_dir/ output_dir/
python scripts/browse_icons.py metadata.json --search "home"
```
