---
name: pn-image-creator
description: Questionnaire-driven image creation for high-quality PNG or SVG. Always grounds prompts in pn-cinematography-lighting and pn-image-prompt-engineering (camera, lighting, visual style). Gates on user confirmation before generation. Use with Cursor image generation or SVG per pn-svg-creator.
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

- **Format:** PNG or SVG? (SVG → use pn-svg-creator skill for generation path.)
- **Dimensions:** For PNG: width × height (e.g. 1920×1080). For SVG: viewBox or size.
- **Quality bar:** Resolution, DPI if relevant, or "high-quality default."

### 4. Constraints

- **A11y:** Alt text or description for the asset?
- **Output path:** Default `assets/`; user may specify.

## Output contract

Before generating, gate: confirm "Image spec: [summary]. Output: [format] [dimensions]. Proceed?" (yes / correct) — see `reference/conventions.md`. Do not generate until user confirms. After generation, deliver the file at the agreed path and state the path and format.

## Integration

- **PNG/raster:** Use **`get_skill('pn-cinematography-lighting')`** and **`get_skill('pn-image-prompt-engineering')`** to craft the prompt; use Cursor image generation; save to assets/.
- **SVG:** Route to get_skill('pn-svg-creator') or workflow_step("svg_create", 0, {}). For narrative or scene SVGs, still apply **pn-cinematography-lighting** for composition and light in the brief.
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
