---
name: pn-assets
description: Create a logo, icon, SVG, raster image, or diagram — questionnaire-driven so content is discussed before generation. Raster paths use pn-cinematography-lighting and pn-image-prompt-engineering for camera, lighting, and style. Routes to SVG, image, or pn-diagram internally.
---

# pn-assets

**Start every response with:** `[pn-command] 🔺`

Single entry point for creating any visual asset. Asks what you need, then runs the right questionnaire-driven workflow internally — content is always discussed before generation.

## Flow

1. **Clarify need:** "What do you need? **SVG** (logo, icon, illustration), **image** (PNG/raster, e.g. hero or product shot), **diagram** (architecture, flowchart, sequence, org-chart — Mermaid or editorial HTML), **placeholder**, or **generative campaign / film / pipeline** (involved, multi-shot, ComfyUI/T2V)?" Use ask_question when available.

2. **Route:**

   ### SVG
   When MCP `workflow_step` is available: call `workflow_step("svg_create", 0, {})` and follow each returned instruction.

   Otherwise run the SVG flow:
   1. Load `get_skill("pn-svg-creator")`. Present sections (Purpose, Identity, Style, Animation, Colors, Size, Constraints) using `ask_question` when available. Ask explicitly for each item not in the user prompt.
   2. Save spec to `docs/svg/YYYY-MM-DD-<slug>-spec.md`. Gate: confirm "SVG spec complete. Proceed with generation?" — do not generate until confirmed.
   3. Generate SVG per spec using pn-svg patterns. Write to path from spec (default: `assets/<slug>.svg`).
   4. Review output against spec — structure (defs, layering), animation quality, accessibility. Fix once if gaps.
   5. Run `get_skill("pn-skeptic-challenge")` in "Skeptic on output" mode. Gate before declaring done. Do not skip.
   6. Output: spec path, SVG path, skeptic verdict, brief confirmation.

   ### Diagram
   Architecture, flowchart, sequence, state, loop, quadrant, layers, process, data-flow, or org-chart. Do **not** send this through `svg_create` or `image_create`.

   Load `get_command("pn-diagram")` (or `get_skill("pn-diagram-design")`) and follow that command. Tokens from `.pncore-design.md`. Preview editorial HTML via `pn-html-preview`.

   ### Image (PNG/raster)
   When MCP `workflow_step` is available: call `workflow_step("image_create", 0, {})` and follow each returned instruction.

   Otherwise run the image flow:
   1. Load **`get_skill("pn-cinematography-lighting")`**, **`get_skill("pn-image-prompt-engineering")`**, and **`get_skill("pn-image-creator")`**. Present questionnaire (Subject/content, environment, **lighting**, **camera**, style, technical/output, constraints). Use `ask_question` when available.
   2. Produce image spec and output contract; spec must reflect grounded camera, lighting, and style (not vague mood only). Gate: do not generate until user confirms.
   3. On confirmation: for PNG use the two skills again to finalize the prompt, then Cursor image generation; for SVG fall through to SVG flow above. Save to `assets/` or user path.
   4. Run `get_skill("pn-render-verify")` on the saved file, then `get_skill("pn-skeptic-challenge")` in post-build mode. Gate before declaring done. Do not skip.
   5. Output summary, path, and skeptic verdict.

   ### Placeholder
   Use picsum.photos or placehold.co; add URLs to components; document as temporary in README.

   ### Generative campaign / film / pipeline
   When MCP `workflow_step` is available: call `workflow_step("media_director", 0, {})` and follow each returned instruction. The workflow runs the gated deep flow: intent → required topics + inline adaptive grill → creative brief (`docs/media/<slug>-brief.md`) → plan + pipeline + skeptic → produce → human review → delivery summary. Use this route when the work is **involved** — campaigns, film, ComfyUI/T2V pipelines — not a single hero image (use the **Image** route instead). Optional state: `grillTopics: true` to force Socratic interrogation on every required topic; `grillTopics: false` to skip even on weak answers (audit-logged).

   Otherwise (no `workflow_step`): load `get_agent("pn-generative-media-director")` for ad-hoc reference but honor the same required topics (Purpose / Audience-goal / Visual direction / Deliverable / Technical-pipeline / Licensing-policy) and grill trigger rules documented in the agent file.

3. **Output:** Asset path(s) and confirmation.
