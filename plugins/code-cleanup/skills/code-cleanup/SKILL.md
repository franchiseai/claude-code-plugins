---
name: code-cleanup
description: Remove AI-generated code patterns ("slop") from a branch. Use when asked to clean up AI-generated code, remove slop, fix AI coding style issues, or make AI-written code look human-written. Triggers on phrases like "remove slop", "clean up AI code", "fix AI style", or "make this look human-written".
---

# Code Cleanup

Remove AI-generated patterns from code changes while preserving intentional functionality.

## Workflow

1. Get the diff: `git diff main...HEAD` (or specified base branch)
2. For each changed file, compare new code against the file's existing style
3. Remove identified slop patterns
4. Report a 1-3 sentence summary of changes

## Slop Patterns to Remove

**Unnecessary comments**
- Obvious comments (`// increment counter`, `// return the result`)
- Section dividers inconsistent with file style
- Comments explaining what code does rather than why

**Defensive overkill**
- Try/catch blocks around code that can't throw or is already in trusted paths
- Null checks where values are guaranteed
- Type guards that duplicate existing validation

**Type escapes**
- Casts to `any` to bypass type errors
- `@ts-ignore` / `@ts-expect-error` without justification
- Overly loose generic types (`Record<string, any>`)

**Style inconsistencies**
- Naming conventions that differ from the file (camelCase vs snake_case)
- Brace/spacing style that doesn't match surrounding code
- Import organization that breaks file patterns

## Guidelines

- Preserve functionality—only remove stylistic slop
- When uncertain, match the existing file's conventions
- Keep the summary brief: what categories of slop were found and removed
