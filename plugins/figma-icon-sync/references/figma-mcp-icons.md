# Figma MCP Icon Extraction Reference

## Available MCP Tools for Icon Work

### get_metadata
Returns sparse XML representation of layers. Best for navigating large files.

**Use for:**
- Initial file structure exploration
- Finding icon sections and categories
- Getting node IDs for specific icons

**Example prompt:**
```
Use get_metadata to explore the structure of this Figma file:
https://www.figma.com/design/xe1fVdPmJnvHPMKoE4Jasm/central-icon-system
```

### get_design_context
Returns full design context including code generation. Use for actual icon extraction.

**Use for:**
- Extracting SVG code for specific icons
- Getting exact styling and paths

**Example prompt:**
```
Use get_design_context to extract the icon at node-id 123:456 as SVG code.
Output clean SVG with viewBox="0 0 24 24", no transforms or metadata.
```

### get_screenshot
Takes a screenshot of selection. Useful for visual verification.

**Use for:**
- Verifying correct icon selection
- Visual comparison during sync

## File Key Extraction

The file key is the alphanumeric string in the Figma URL between `/design/` and the next `/`:

```
https://www.figma.com/design/xe1fVdPmJnvHPMKoE4Jasm/central-icon-system
                             ^^^^^^^^^^^^^^^^^^^^^^^^
                             This is the file key
```

## Node ID Format

Figma node IDs follow the pattern: `123:456` or `123-456`

When referencing in URLs, they appear as query parameters:
```
https://www.figma.com/design/FILE_KEY/name?node-id=123-456
```

## Icon Extraction Strategy

### For Small Icon Libraries (< 50 icons)

1. Use `get_metadata` once to get full structure
2. Identify all icon nodes
3. Extract each with `get_design_context`

### For Large Icon Libraries (> 50 icons)

1. Use `get_metadata` to get page/section structure
2. Identify relevant sections based on user needs
3. Drill down into specific sections
4. Extract only needed icons to avoid rate limits

### For Icon Updates

1. Identify icons currently used in codebase
2. Map to Figma node IDs
3. Extract only changed or missing icons
4. Compare SVG content for actual changes

## SVG Cleanup Requirements

Icons from Figma typically need cleanup:

| Issue | Solution |
|-------|----------|
| Non-24x24 dimensions | Normalize viewBox and size |
| Figma metadata | Remove data-* attributes |
| XML declarations | Remove <?xml ...?> |
| Comments | Remove all HTML comments |
| Empty groups | Remove <g></g> elements |
| IDs | Remove id attributes |

## Common Icon Naming Patterns in Design Systems

| Pattern | Example | Normalized |
|---------|---------|------------|
| kebab-case | `arrow-left` | `ArrowLeft.svg` |
| With size | `24/arrow-left` | `ArrowLeft.svg` |
| With variant | `arrow-left-outlined` | `ArrowLeftOutlined.svg` |
| With prefix | `icon-arrow-left` | `ArrowLeft.svg` |
| Numbered | `01-arrow-left` | `ArrowLeft.svg` |

## Rate Limits

Figma API rate limits apply to MCP tool calls:

- **Free accounts:** 6 tool calls per month
- **Paid accounts:** Per-minute limits (Tier 1 REST API limits)

### Strategies to Minimize API Calls

1. Use `get_metadata` once, save locally
2. Batch icon extractions when possible
3. Cache node IDs for repeat syncs
4. Only sync changed icons

## Error Handling

### "Too many requests"
Wait and retry, or reduce batch size

### "Node not found"
Verify node ID format, check if icon was moved/deleted

### "File access denied"
Ensure Figma MCP is authenticated with proper permissions

### Large response truncation
Use `get_metadata` first to get structure, then extract individual nodes

## Integration with Project Build

After syncing icons, typical build steps:

1. **Verify icons added:**
   ```bash
   git diff --name-only packages/icons/
   ```

2. **Build icons package:**
   ```bash
   # Check package.json for exact command
   pnpm build:icons
   # or
   pnpm --filter @company/icons build
   ```

3. **Verify build output:**
   ```bash
   ls packages/icons/dist/
   ```

4. **Test imports:**
   ```typescript
   import { ArrowLeft, ArrowLeftOutlined } from '@company/icons';
   ```
