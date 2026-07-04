---
name: pn-game-feature
description: "Add an incremental game mechanic — questionnaire, plan, skeptic, implement. Use workflow_step(\"game_feature\", 0, {}) when MCP available."
---

# Game Feature

## When to use

- Adding a new game mechanic (scoring, leveling, inventory, combat, etc.).
- Invoked by pn-game-developer agent or via workflow_step("game_feature").

## Instructions

When **MCP workflow_step** is available, call `workflow_step("game_feature", 0, {})` and follow each returned instruction. Control flow is deterministic.

### Fallback (no workflow_step)

1. Load `get_skill("pn-game-logic")`. Ask: mechanic type, inputs/triggers, states, balance. Use `ask_question` when available.
2. Create short plan; run `get_skill("pn-skeptic-challenge")` on the plan. Gate on user confirmation.
3. Implement using `get_agent("pn-game-developer")` and `get_skill("pn-game-logic")`.
4. Output summary. If the plan had options, ask before locking (plan accuracy).
