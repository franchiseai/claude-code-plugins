#!/bin/bash
set -euo pipefail

# PostToolUse hook for Skill tool — records a minimal observation stub
# Input: JSON via stdin with tool_input.skill, session_id, etc.

input=$(cat)

# Extract skill name from tool input
skill_name=$(echo "$input" | jq -r '.tool_input.skill // empty')
if [ -z "$skill_name" ]; then
  exit 0
fi

# Extract session ID
session_id=$(echo "$input" | jq -r '.session_id // "unknown"')

# Ensure storage directory exists
obs_dir="${CLAUDE_PROJECT_DIR:-.}/.claude/skill-evolution"
mkdir -p "$obs_dir"

# Build and append observation stub
timestamp=$(date -u +"%Y-%m-%dT%H:%M:%SZ")

jq -n -c \
  --arg ts "$timestamp" \
  --arg sid "$session_id" \
  --arg skill "$skill_name" \
  '{
    timestamp: $ts,
    sessionId: $sid,
    skillName: $skill,
    pluginName: "",
    taskSummary: "",
    outcome: "pending",
    errors: [],
    userCorrections: 0,
    notes: "auto-recorded by PostToolUse hook"
  }' >> "$obs_dir/observations.jsonl"

exit 0
