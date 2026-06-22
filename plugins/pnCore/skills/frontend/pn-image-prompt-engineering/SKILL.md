---
name: pn-image-prompt-engineering
description: Craft detailed prompts for AI image generation (Midjourney, DALL-E, Stable Diffusion, Flux). Subject, environment, lighting, style, technical specs. Use with pn-assets-manager or pn-generative-media-director when generating raster imagery.
---

# Image prompt engineering

## When to use

- Crafting or refining prompts for Midjourney, DALL-E, Stable Diffusion, Flux, or similar generators.
- Pairing with **pn-assets-manager** when generating raster imagery in Cursor.

## Output

- Layered prompts (subject, environment, lighting, technical, style) with platform-specific syntax and negatives where supported.

## Workflow

1. **Layered structure:** Subject → environment → lighting → technical → style.
2. **Photography terminology:** Use correct terms (focal length, depth of field, lighting setup).
3. **Platform syntax:** Midjourney (--ar, --v), Flux natural language, etc.
4. **Negative prompts:** Include when platform supports to avoid unwanted elements.

## Guardrails

- Lighting direction must match shadows; effects must be physically plausible.
- Avoid vague descriptors ("nice lighting" → "soft golden hour side lighting, warm skin tones").

## Diffusion stacks vs closed APIs

- **Closed APIs** (e.g. hosted image endpoints): prompts are usually one or two text blobs; negatives may be unsupported or a separate field. Keep the layered structure; map to the fields the API exposes.
- **Local diffusion / ComfyUI:** The same creative layers are often **split across nodes**—e.g. CLIP-style vs T5-style positive inputs, separate negative encoding, or strength sliders on image conditioners. Short clauses beat one endless sentence; duplicate the wrong detail across encoders and the model may overweight it.
- **Encoders:** If the stack uses both CLIP-like and long-context text models, put **composition and literal subject** where the long-context encoder shines; put **style and lighting hooks** where the stack’s docs recommend—when unsure, A/B one change at a time.
- **Negatives:** Use when the runtime has a negative pass; mirror lighting and anatomy fixes there instead of contradicting the positive.

For graph layout, node order, and reproducibility, use **`get_skill('pn-comfyui-workflows')`** (see **pn-generative-media-director**).

## Integration

- **pn-assets-manager** — Use when generating custom raster via Cursor image gen; apply this skill to craft the prompt.
- **pn-generative-media-director** — Use for ComfyUI pipelines, T2V, and cinematic direction; combine with **pn-cinematography-lighting** for shot vocabulary.
