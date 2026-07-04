---
name: pn-svg-creator
description: "Questionnaire-driven SVG creation. Covers purpose, identity, style, animation, colors, size, constraints. Gates on user confirmation. Generates production-quality SVG using pn-svg patterns."
---

# SVG creator

## When to use

- User requests a new logo, icon, illustration, or SVG asset.
- Invoked by `/pn-svg-creator` command.
- When generating production-quality SVG.

## Questionnaire (ask explicitly; infer only when user has already answered)

### 1. Purpose

- **Type:** Logo, icon set, illustration, diagram, favicon?
- **Scope:** Single file or multiple sizes (e.g. 16, 32, 64, 128, 512)?
- **Output path:** Default `assets/<slug>.svg`; user may specify.

### 2. Identity

- **Content:** Monogram, acronym, symbol, or imagery?
- **What to depict:** Letters, shape, metaphor, brand element?
- **Reference:** If logo — consider monogram + accent shape patterns. **When discovery ambition is award-winning/distinctive:** Avoid "single letter on colored shape"; require symbol + wordmark or metaphor.
- **When type = logo:** Ask "Symbol, metaphor, or wordmark? (Not just a letter on a shape.)" — require answer before spec.

### 3. Style

- **Direction:** Minimal, retro/terminal, modern flat, glassmorphism, illustrative, geometric, isometric, hand-drawn, pixel art, neon, neumorphism, duotone, line art, brutalist, or **Other (describe)**?
- When "Other": Ask user to describe the style; apply pn-svg patterns to achieve it.

### 4. Animation

- **Level:** None, subtle (pulse/glow), or prominent (orbits, scanlines)?
- **Technique:** SMIL preferred for SVG-native; CSS for transitions. Stagger with `begin` for multiple elements.
- **prefers-reduced-motion:** Disable or simplify when user requests a11y.

### 5. Colors

- **Palette:** Primary, secondary, accent (hex)?
- **Background:** Light, dark, transparent?
- **Accent:** e.g. red triangle, brand color.

### 6. Size

- **viewBox:** e.g. 128×128, 64×64, 512×512?
- **Aspect ratio:** 1:1 (square) or other?

### 7. Constraints

- **File size:** Any limit?
- **A11y:** `role="img"`, `aria-label` or `<title>`, `prefers-reduced-motion`?
- **Inline vs standalone:** Will it be embedded or referenced?

## How to ask

Use Cursor's built-in `ask_question` tool when available to present questionnaire items. The user gets a structured input prompt; answers are returned to you. If `ask_question` is not available (e.g. MCP-only client), output questions in chat and wait for the user's reply. Do not infer or apply defaults until user responses are received.

## Workflow

1. Present each section using `ask_question` (or chat output if unavailable). Ask for each item not in user prompt.
2. Load `get_skill("pn-documentation")` and apply the SVG spec format. Produce the SVG spec (Markdown).
3. Save to `docs/svg/YYYY-MM-DD-<slug>-spec.md` (slug from purpose/name, e.g. `logo-myapp`).
4. **Gate:** Output: "SVG spec complete and saved. Proceed with generation? Reply 'yes' or add/correct items." Do not generate until user confirms.
5. On confirmation: generate SVG per spec. Write to path from spec (default: `assets/<slug>.svg`).
6. Self-review against quality checklist. Fix once if gaps.

## Generation rules

- Use **pn-svg** skill: `viewBox`, `defs` (gradients, filters, clipPath), meaningful ids.
- Layering: background → decor → animated → content → overlay. Use animation patterns (animateMotion, staggered `begin`) when animation is specified.
- For logos: consider monogram + accent shape patterns.
- Put shared definitions in `<defs>`. Use `url(#id)` for references.

## pn-logo benchmark

For logos, output MUST achieve parity with `plugins/pnCore/assets/pn-logo.svg`:

- **Structure:** `<defs>` with at least 2 gradients OR 1+ filter; layering (bg → decor → content → overlay); custom typography or distinctive symbol.
- **Anti-pattern:** Do not produce "single letter on colored rect" unless user explicitly requests it.
- **Minimum craft:** Logo SVGs should have meaningful complexity (defs, gradients/filters, layering). Reference pn-logo (268 lines) for patterns — not line count, but structural parity: gradients, filters, patterns, or animation where appropriate.

## Quality parity checklist

When generating, ensure:

- [ ] `viewBox` and `<defs>` structure present
- [ ] Gradients/filters in defs, referenced by id
- [ ] Layering order: bg → decor → animated → content → overlay
- [ ] SMIL animations with staggered `begin` where applicable
- [ ] `role="img"` and `aria-label` (or `<title>`) for a11y
- [ ] `prefers-reduced-motion` consideration (disable or simplify animations when specified)
- [ ] For logos: defs with gradients AND/OR filters (not flat fill only)
- [ ] For logos: no "letter on rect" unless explicitly requested
- [ ] Self-check: Does this logo match the craft level of pn-logo? If not, iterate

## Output

- SVG spec (Markdown) at `docs/svg/YYYY-MM-DD-<slug>-spec.md`.
- SVG file at `assets/<slug>.svg` or user-specified path.
- Confirmation with spec path and SVG path.

## Guardrails

- Use `ask_question` when available; do not generate until user confirms spec.
- If animation requested: respect `prefers-reduced-motion` in constraints.
- Skip path: User says "skip questionnaire" or provides complete spec — save it and gate on confirmation, then generate.

## Example prompts

**Cold start:**
> Using `pn-svg-creator`, create a logo for my Cursor plugin "Paperclip" — minimal geometric symbol, dark background, warm amber accent, square 512×512, no animation.

**Warm start — turn existing brand into an SVG:**
> I have brand colors `#1a1a2e` / `#e8c547` — use `pn-svg-creator` to create a favicon and an icon set (16, 32, 64) that matches.

**Format-specific:**
> Make an animated loading spinner SVG using `pn-svg-creator` — SMIL pulse, brand primary color, 48×48, prefers-reduced-motion safe.

**Iterate:**
> The monogram feels flat — add a subtle drop shadow filter and a gradient on the letterform.
> Change the accent color from amber to teal and regenerate.
