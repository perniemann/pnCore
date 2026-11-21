---
name: pn-image-creator
description: "Questionnaire-driven creation of PNG and SVG assets (logos, icons, illustrations, heroes). Grounds raster prompts in pn-cinematography-lighting and pn-image-prompt-engineering; gates on confirmation before generating."
---

# Image create (workflow questionnaire)

## When to use

- Invoked by workflow_step("image_create", ...) or get_command("pn-assets") (which routes to image_create).
- When the user wants a high-quality image (PNG, SVG) with content discussed before generation.

## Required skills before specification (raster)

For **PNG or any raster** output: load **`get_skill('pn-cinematography-lighting')`** and **`get_skill('pn-image-prompt-engineering')`** at the start of the flow. Use them to shape the questionnaire answers and the final prompt: **camera** (framing, lens feel, depth), **lighting** (direction, quality, ratios, color temperature), **style** (medium, period, references). Do not generate until those dimensions are reflected in the agreed spec (user may shorten with explicit “use defaults” after you state the defaults you applied).

## Questionnaire (ask explicitly; do not infer)

### 1. Subject and content

- **What to depict:** Subject, scene, or concept (e.g. hero image, product shot, illustration, diagram).
- **Mood or message:** Tone (e.g. professional, playful, minimal).

### 2. Environment, lighting, camera, and style

- **Environment:** Setting, background, context.
- **Lighting:** Motivated sources, hard vs soft, key-to-fill, color temperature—use **pn-cinematography-lighting** vocabulary; align shadow and highlight language with the described light.
- **Camera:** Shot size, angle, lens feel (e.g. wide vs portrait focal length), depth of field when relevant.
- **Style:** Photorealistic, flat illustration, 3D render, line art, era/film reference, etc.—tie to **pn-image-prompt-engineering** layered prompts.

### 3. Technical and output

- **Format:** PNG or SVG? (SVG → follow § SVG creator below.)
- **Dimensions:** For PNG: width × height (e.g. 1920×1080). For SVG: viewBox or size.
- **Quality bar:** Resolution, DPI if relevant, or "high-quality default."

### 4. Constraints

- **A11y:** Alt text or description for the asset?
- **Output path:** Default `assets/`; user may specify.

## Output contract

Before generating, gate: confirm "Image spec: [summary]. Output: [format] [dimensions]. Proceed?" (yes / correct) — see `reference/conventions.md`. Do not generate until user confirms. After generation, run `get_skill("pn-render-verify")` then `get_skill("pn-skeptic-challenge")` on the file; gate on confirmation. Then state the path, format, and skeptic verdict.

## Integration

- **PNG/raster:** Use **`get_skill('pn-cinematography-lighting')`** and **`get_skill('pn-image-prompt-engineering')`** to craft the prompt; use Cursor image generation; save to assets/.
- **SVG:** Follow § SVG creator (format: SVG) below; the workflow is `workflow_step("image_create", 0, {})` with `imageSpec.format: "svg"`. For narrative or scene SVGs, still apply **pn-cinematography-lighting** for composition and light in the brief.
- **ComfyUI / T2V / heavy pipelines:** **`get_agent('pn-generative-media-director')`** — do not substitute this skill alone.

## Example prompts

**Cold start:**
> Using `pn-image-creator`, create a hero illustration for a fintech app — soft studio lighting, isometric style, 1920×1080 PNG, professional tone.

**Warm start — from a brief:**
> I have a brand brief (attached). Use `pn-image-creator` to create a product-in-context hero shot matching the brand personality and color palette.

**Format-specific:**
> Using `pn-image-creator`, generate a 1:1 square PNG avatar icon for a Discord bot — minimal flat illustration, dark background, amber accent.

**Iterate:**
> The hero feels too cold. Warm the lighting and add a shallow depth of field. Use `pn-image-creator` to regenerate with those changes.

## Guardrails

- If the plan contains options (e.g. format, size), ask before locking; use ask_question when available. Plans must be 100% accurate per user input.
- After generate: `pn-render-verify` then `pn-skeptic-challenge` before declaring done (same as `workflow_step("image_create")`).

<!-- merged from pn-svg-creator (0.22.0) -->
## SVG creator (format: SVG)

### When to use

- User requests a new logo, icon, illustration, or SVG asset.
- Invoked by `/pn-assets` or `workflow_step("image_create", …)` with format SVG.
- When generating production-quality SVG.

### Questionnaire (ask explicitly; infer only when user has already answered)

#### 1. Purpose

- **Type:** Logo, icon set, illustration, diagram, favicon?
- **If type is diagram:** Stop this questionnaire. Load `get_skill("pn-diagram-design")` or `get_command("pn-diagram")`. Do not generate a logo-style SVG for architecture/flow/sequence.
- **Scope:** Single file or multiple sizes (e.g. 16, 32, 64, 128, 512)?
- **Output path:** Default `assets/<slug>.svg`; user may specify.

#### 2. Identity

- **Content:** Monogram, acronym, symbol, or imagery?
- **What to depict:** Letters, shape, metaphor, brand element?
- **Reference:** If logo — consider monogram + accent shape patterns. **When discovery ambition is award-winning/distinctive:** Avoid "single letter on colored shape"; require symbol + wordmark or metaphor.
- **When type = logo:** Ask "Symbol, metaphor, or wordmark? (Not just a letter on a shape.)" — require answer before spec.

#### 3. Style

- **Direction:** Minimal, retro/terminal, modern flat, glassmorphism, illustrative, geometric, isometric, hand-drawn, pixel art, neon, neumorphism, duotone, line art, brutalist, or **Other (describe)**?
- When "Other": Ask user to describe the style; apply pn-svg patterns to achieve it.

#### 4. Animation

- **Level:** None, subtle (pulse/glow), or prominent (orbits, scanlines)?
- **Technique:** SMIL preferred for SVG-native; CSS for transitions. Stagger with `begin` for multiple elements.
- **prefers-reduced-motion:** Disable or simplify when user requests a11y.

#### 5. Colors

- **Palette:** Primary, secondary, accent (hex)?
- **Background:** Light, dark, transparent?
- **Accent:** e.g. red triangle, brand color.

#### 6. Size

- **viewBox:** e.g. 128×128, 64×64, 512×512?
- **Aspect ratio:** 1:1 (square) or other?

#### 7. Constraints

- **File size:** Any limit?
- **A11y:** `role="img"`, `aria-label` or `<title>`, `prefers-reduced-motion`?
- **Inline vs standalone:** Will it be embedded or referenced?

### How to ask

Use Cursor's built-in `ask_question` tool when available to present questionnaire items. The user gets a structured input prompt; answers are returned to you. If `ask_question` is not available (e.g. MCP-only client), output questions in chat and wait for the user's reply. Do not infer or apply defaults until user responses are received.

### Workflow

1. Present each section using `ask_question` (or chat output if unavailable). Ask for each item not in user prompt.
2. Load `get_skill("pn-documentation")` and apply the SVG spec format. Produce the SVG spec (Markdown).
3. Save to `docs/svg/YYYY-MM-DD-<slug>-spec.md` (slug from purpose/name, e.g. `logo-myapp`).
4. **Gate:** Output: "SVG spec complete and saved. Proceed with generation? Reply 'yes' or add/correct items." Do not generate until user confirms.
5. On confirmation: generate SVG per spec. Write to path from spec (default: `assets/<slug>.svg`).
6. Self-review against quality checklist. Fix once if gaps.
7. **Skeptic on output (mandatory):** `get_skill("pn-skeptic-challenge")` in post-build mode on the SVG path. Gate on confirmation. Same bar as `svg_create` step 3 and `/pn-diagram` visual track. Do not skip.

### Generation rules

- Use **pn-svg** skill: `viewBox`, `defs` (gradients, filters, clipPath), meaningful ids.
- Layering: background → decor → animated → content → overlay. Use animation patterns (animateMotion, staggered `begin`) when animation is specified.
- For logos: consider monogram + accent shape patterns.
- Put shared definitions in `<defs>`. Use `url(#id)` for references.

### pn-logo benchmark

For logos, output MUST achieve parity with `plugins/pnCore/assets/pn-logo.svg`:

- **Structure:** `<defs>` with at least 2 gradients OR 1+ filter; layering (bg → decor → content → overlay); custom typography or distinctive symbol.
- **Anti-pattern:** Do not produce "single letter on colored rect" unless user explicitly requests it.
- **Minimum craft:** Logo SVGs should have meaningful complexity (defs, gradients/filters, layering). Reference pn-logo (268 lines) for patterns — not line count, but structural parity: gradients, filters, patterns, or animation where appropriate.

### Quality parity checklist

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

### Output

- SVG spec (Markdown) at `docs/svg/YYYY-MM-DD-<slug>-spec.md`.
- SVG file at `assets/<slug>.svg` or user-specified path.
- Confirmation with spec path, SVG path, and skeptic verdict.

### Guardrails

- Use `ask_question` when available; do not generate until user confirms spec.
- After generate: skeptic on output before declaring done (same as `workflow_step("svg_create")`).
- If animation requested: respect `prefers-reduced-motion` in constraints.
- Skip path: User says "skip questionnaire" or provides complete spec — save it and gate on confirmation, then generate.

### Example prompts

**Cold start:**
> Using `pn-image-creator`, create a logo for my Cursor plugin "Paperclip" — minimal geometric symbol, dark background, warm amber accent, square 512×512, no animation.

**Warm start — turn existing brand into an SVG:**
> I have brand colors `#1a1a2e` / `#e8c547` — use `pn-image-creator` to create a favicon and an icon set (16, 32, 64) that matches.

**Format-specific:**
> Make an animated loading spinner SVG using `pn-image-creator` — SMIL pulse, brand primary color, 48×48, prefers-reduced-motion safe.

**Iterate:**
> The monogram feels flat — add a subtle drop shadow filter and a gradient on the letterform.
> Change the accent color from amber to teal and regenerate.

### Integration

- **Diagrams:** If purpose type is diagram, stop and load `pn-diagram-design` / `pn-diagram`. This skill stays logos, icons, illustrations, favicons.
- **Used by:** `pn-assets` SVG route, `svg_create` workflow.
