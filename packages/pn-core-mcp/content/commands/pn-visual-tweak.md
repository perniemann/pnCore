---
name: pn-visual-tweak
description: Quick visual edit — routes to the right surgical command (pn-typeset, pn-colorize, pn-arrange, pn-bolder, pn-quieter, pn-delight) for a bounded change without rerunning full pn-design.
---

# pn-visual-tweak

**Start every response with:** `[pn-command] 🔺`

Surgical pass on **user-facing visuals** when the user wants a bounded change (one section, one component family, one animation, palette tweak, typography fix). Keeps scope small; still aligns with **`.pncore-design.md`**, **`pn-frontend-design`**, and **`pn-core://reference/aesthetics-baseline.md`** so results stay on-brand and non-generic.

## When MCP `workflow_step` is available

Call `workflow_step` with `workflowType='visual_tweak'`, `step=0`, and `state={}`. Follow each returned instruction. Control flow is deterministic (clarify target → plan → confirm → implement → summary).

## Fallback (no `workflow_step`)

### 1. Target

Ask what must change (section, component, route, or file). If multiple unrelated areas, recommend splitting or using `pn-design` instead.

### 2. Plan

Propose concrete edits (typography / color / layout / motion / background / assets). Map work to surgical commands when helpful: `pn-typeset`, `pn-colorize`, `pn-arrange`, `pn-delight`, `pn-quieter`, `pn-bolder`.

**Gate:** User confirms plan.

### 3. Implement

Apply changes. Load `get_skill("pn-frontend-design")` and run the **AI Slop Test** after edits. Respect `prefers-reduced-motion` and existing design tokens.

### 4. Summary

List files touched and what changed visually.

## Skills and references

- **pn-frontend-design** — Non-generic bar, slop test, stack guidance
- **pn-frontend-design-philosophy** — When the tweak affects page mode, motion roles, or state visibility
- **pn-core://reference/aesthetics-baseline.md** — Full dimension checklist
- **pn-evidence-qa** — Optional screenshot pass for UI-heavy tweaks
