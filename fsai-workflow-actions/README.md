# FSAI Workflow Actions Plugin

A Claude Code plugin for creating workflow action nodes in the FSAI codebase.

## Overview

Adding a new workflow action to the FSAI workflow builder requires modifying 10+ files across multiple packages. This plugin automates that process.

## Components

### Skill: `workflow-action-patterns`

Provides knowledge about the workflow action architecture, file locations, and patterns. Automatically activates when discussing workflow actions.

### Command: `/create-workflow-action`

Interactive command that generates all required files for a new workflow action.

**Usage:**
```
/create-workflow-action
```

Or with arguments:
```
/create-workflow-action action-name "Display Label" IconName
```

## Files Modified

When creating a new action, the following files are touched:

**Backend:**
- `apps/backend/src/api/workflows/types.ts` - Zod schema

**SDK:**
- `packages/sdk/src/types/workflows.ts` - TypeScript interface

**Frontend:**
- `apps/brand-dashboard/src/pages/Workflows/types.ts` - WorkflowNodeType union
- `apps/brand-dashboard/src/pages/Workflows/store/workflowBuilderStore.ts` - Default config
- `apps/brand-dashboard/src/pages/Workflows/hooks/useUnconnectedHandles.ts` - Node type union
- `apps/brand-dashboard/src/pages/Workflows/components/canvas/[ActionName]Node.tsx` - Node component
- `apps/brand-dashboard/src/pages/Workflows/components/canvas/nodeTypes.ts` - Node registry
- `apps/brand-dashboard/src/pages/Workflows/components/canvas/AddNodeButton.tsx` - Menu entry
- `apps/brand-dashboard/src/pages/Workflows/components/config-panel/[ActionName]Config.tsx` - Config panel
- `apps/brand-dashboard/src/pages/Workflows/components/config-panel/ConfigPanel.tsx` - Switch case
- `apps/brand-dashboard/src/pages/Workflows/components/config-panel/ConfigPanel.primitives.tsx` - Styling

## Requirements

- Must be used within the FSAI codebase (`/home/bill/code/fsai`)
- SDK must be rebuilt after changes: `yarn workspace @fsai/sdk build`
