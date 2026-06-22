---
name: pn-audit-design-tokens
description: Surgical design-token audit — CSS custom property coverage, token naming, dark-mode correctness, and hardcoded value elimination. Standalone or chained by pn-frontend-audit.
slash: false
---

# pn-audit-design-tokens

**Start every response with:** `[pn-command] 🔺`

> **Advanced (palette-hidden).** Not in the `/` slash palette. Invoked by the `/pn-frontend-audit` umbrella, or directly via `get_command("pn-audit-design-tokens")`.

Focused design-token pass: audit CSS custom property (or design system token) coverage, naming conventions, dark-mode completeness, and hardcoded value elimination. No typography changes (use `pn-audit-typography`) — tokens only.

## Flow

### 1. Context

Check `.pncore-stack.md` for CSS framework and token approach (Tailwind / CSS variables / styled-system / etc.). Scope: "All styles or specific files/components?"

### 2. Audit

**Token coverage:**
- Are all colors defined as CSS custom properties (`--color-*` or equivalent)?
- Are spacing values from a defined set of tokens?
- Are font families and sizes tokenized?
- Are border-radii, shadow definitions, and z-index values tokenized?

**Hardcoded values:**
- Any `color: #hex` or `background: rgb(...)` not using a variable?
- Any `margin: 24px` or `padding: 12px` not using a spacing token?
- Any `font-size: 14px` not using a type token?

**Naming conventions:**
- Semantic tokens (e.g. `--color-text-primary`) separate from primitive tokens (`--color-gray-700`)?
- Consistent naming format (kebab-case, BEM, or design system standard)?

**Dark mode:**
- All semantic color tokens have dark-mode overrides (via `prefers-color-scheme` or `.dark` class)?
- No semantic tokens that reference light-mode primitives directly without override?

**Token file structure:**
- Tokens defined in one canonical file (not scattered across component files)?
- No duplicate variable declarations?

Output: numbered issues table (location | issue | severity | suggested fix). Save to `docs/audits/`.

**Gate:** Present issues for triage. Apply after confirmation.

### 3. Fix

Apply in order: consolidate token file → replace hardcoded values → add dark-mode overrides → rename inconsistent tokens.

### 4. Summary

Table: hardcoded values replaced, tokens added, naming issues fixed.

## Skills to use

- **pn-frontend-design-philosophy** — Token architecture in Phase 3 (Layout + CSS System)
- **pn-design-system** — If a formal design system is present
