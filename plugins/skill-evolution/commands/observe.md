---
name: observe
description: Manually record a detailed observation after using a skill. Use this when you want to capture rich feedback about how a skill performed.
user_invocable: true
---

# Record Skill Observation

You are recording a detailed observation about a skill that was just used. This feeds the skill evolution loop.

## Steps

1. **Identify the skill** — Check the conversation for the most recently used skill. If unclear, ask: "Which skill are you recording an observation for?"

2. **Assess outcome** — Based on the conversation, determine:
   - `completed` — skill worked as intended, no issues
   - `partial` — skill mostly worked but had gaps or required manual fixes
   - `failed` — skill didn't achieve its goal
   - `abandoned` — user gave up and took a different approach

3. **Gather details** — Ask the user (using AskUserQuestion) a single compound question:
   - How did the skill perform? (great / okay / poorly)
   - Were there any errors or unexpected behavior?
   - Did you have to correct or override the skill's output? How many times?
   - Any notes on what could be improved?

4. **Write the observation** — Create the `.claude/skill-evolution/` directory if needed, then append a JSONL record to `.claude/skill-evolution/observations.jsonl`:

```json
{
  "timestamp": "<ISO 8601>",
  "sessionId": "<from context>",
  "skillName": "<skill name>",
  "pluginName": "<plugin name if known>",
  "taskSummary": "<brief description of what was being done>",
  "outcome": "completed|partial|failed|abandoned",
  "errors": ["<error descriptions>"],
  "userCorrections": <number>,
  "notes": "<user's feedback and context>"
}
```

5. **Confirm** — Tell the user the observation was recorded and show a brief summary.
