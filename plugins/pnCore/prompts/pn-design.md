---
name: pn-design
description: UI and visual design build — discovery, plan, and implement with mandatory typography/color/layout substeps and skeptic gates. Use instead of pn-build when the deliverable is primarily visual.
---

# pn-design

**Start every response with:** `[pn-command] 🔺`

When **MCP workflow_step** is available, call `workflow_step("design", 0, {})` and follow each returned instruction. Otherwise follow the steps below.

Design loop: discovery (questions) → plan → skeptic on plan → assets → build → skeptic on output → iterate or done. Forces philosophy alignment and human gates.

## 1. Discovery

**Check `.pncore-design.md` first.** If it exists in the project root and contains audience, brand personality, and visual ambition, use it as the spec and skip to step 2 (Plan). Tell the user: "Using design context from `.pncore-design.md`." Only proceed with discovery if the file is missing or incomplete.

If context is missing, recommend running `pn-setup` (design context option) to set it up once. Then fall back to inline discovery:

**Invoke** `get_skill("pn-discovery-questionnaire")` and follow that skill for discovery. Use the **full Design section (3a through 3g)**: Direction, Structure and layout, Sections and pages, Colors and theme, Typography, Components and library, Design ambition. Omit technical, security, requirements, scope unless relevant.

Gate per `reference/conventions.md`. First output must be **questions only** — do not produce spec until user replies. Do not infer answers or apply defaults.

**Skip path:** Skip only if user explicitly says "skip discovery" OR has already provided complete Design answers (3a–3g) in the prompt. A single-sentence build request is not a complete spec.

**Gate:** Do not proceed to plan until user confirms spec.

## 2. Plan

**Phase 0 — API probe (when stack may have moved):** If the discovery spec references a runtime or library that is frequently updated (e.g. a specific Blender version, a JS framework release), invoke `get_skill("pn-api-probe")` to confirm live API availability before writing the plan. Surface any `version_gaps` with `impact: "blocking"` to the user before proceeding.

**Design intent (required — load before page mode):** Fetch **`pn-core://reference/design-intent.md`**. Emit the **Design Read** one-liner and three tuning dials (`DESIGN_VARIANCE`, `MOTION_INTENSITY`, `VISUAL_DENSITY`). If `.pncore-design.md` includes **Tuning dials**, use those values and state that in the plan. Follow **pn-frontend-design-philosophy** reference **Phase 0** then Phase 1–3.

**Narrative intent:** If the user asked for a scroll-told story, Design Read is **editorial scroll-story**, or the brief names a scroll narrative, load `get_skill("pn-scroll-narrative")` and emit a **Narrative Map** in the plan. Do **not** load it because `MOTION_INTENSITY` is ≥ 7.

Produce design plan: Design Read + dials, narrative-intent yes/no, page mode (Portfolio/Product/Editorial/Tool/Conversion/Catalog), 3-layer typography (display/reading/utility), tokens, components.

## 3. Skeptic on plan (MANDATORY — do not skip)

**Invoke** `get_skill("pn-skeptic-challenge")` on the plan. Question approach; list 2–3 alternatives and tradeoffs; simplicity check. Output: "Proceed as planned" or "Revise plan: [concrete changes]."

**Gate:** Do not build until skeptic pass is accepted (or user says proceed). Do not substitute a one-line "plan looks good."

## 4. Assets

**Invoke** **pn-assets-manager**. Pass discovery spec and plan. Run in autonomous (batch) mode: create logo, hero, icons per taxonomy. Do not invoke `workflow_step("svg_create")` or `workflow_step("image_create")` — they block. Output `ASSET_PHASE_FAILED` if nothing created.

**Gate:** Do not proceed to build if ASSET_PHASE_FAILED.

## 5. Build

When discovery specified a component library: enforce library-first — every UI element uses library components; create custom only when unavailable. Use pn-ui-component-libraries and its enforcement rules.

Implement using **pn-frontend-design**, **pn-frontend-design-philosophy**, **pn-frontend-scaffolding**, and **pn-ui-component-libraries** (per stack from config). For component installs, use shadcn MCP when available.

**Surgical build substeps (run in order, do not skip):**

1. **Typography** — run `get_command("pn-typeset")` inline: confirm fonts match brand personality and visual ambition; no Inter/Geist defaults unless explicitly chosen.
2. **Color** — run `get_command("pn-colorize")` inline: establish OKLCH token system, tinted neutrals, dark mode if required.
3. **Layout** — run `get_command("pn-arrange")` inline: confirm spatial rhythm, no identical card grids, asymmetric composition where appropriate.
4. **Interaction states** — all states covered: loading, error, success, empty (with action), hover + focus.
5. **Apply philosophy gate** and alignment checklist before declaring done.
5b. **Marketing preflight** — when plan page mode is **Portfolio**, **Product marketing**, or **Editorial** (not Tool/app, Conversion form, or Catalog), run `get_command("pn-preflight")` with **strict** tier. For `pn-design-dna` / embedded studio surfaces, preflight uses **studio** tier. When narrative intent is present, emit **N-01–N-04**. Do not declare done on `SHIP: NO-GO`.
5c. **Scroll narrative** — when narrative intent is present, implement via `get_skill("pn-scroll-narrative")` (not the `pn-landing-page` SaaS recipe) and run `pn-evidence-qa` timeline sampling.
6. **Self-contained HTML:** If the deliverable is a single HTML file (inline CSS/JS), run `get_skill("pn-html-preview")` first to save the fenced ` ```html ` block under `html_outputs/` (pn-html-preview is a chat-block-to-disk writer; earlier substeps don't guarantee a file on disk). Then run `get_skill("pn-render-verify")` on the saved path to produce a structured verdict; pass that verdict into step 6.

## 6. Skeptic on output (MANDATORY — do not skip)

**When the deliverable is a visual artifact (render, image, screenshot, HTML page):** First invoke `get_skill("pn-render-verify")` to read the artifact and produce a structured verdict. Pass that verdict as evidence into the skeptic invocation below.

**Invoke** `get_skill("pn-skeptic-challenge")` in "Skeptic on output (post-build)" mode. Challenge: Is it philosophy-aligned? Generic (Inter, purple gradients)? Could it be simpler? Output: "Proceed—output aligns" or "Iterate: [concrete changes]."

**Gate:** Do not declare done until skeptic pass is accepted. When discovery ambition is award-winning/distinctive: require iterate when generic fonts detected.

## 7. Iterate (if skeptic flags issues)

Return to plan (or build) and fix. Re-run skeptic on output. One retry unless user asks for more.

## 8. Summary

What was built, what skeptic caught, final pass. If discovery spec included success metrics, state whether they were met.

## Skills and rules to use

- **pn-discovery-questionnaire** — Design 3a–3g. Gate per conventions. Skip if `.pncore-design.md` exists.
- **pn-setup** — Recommend if `.pncore-design.md` is missing (design context option).
- **pn-frontend-design-philosophy** — Page mode, typography, layout, tokens
- **pn-frontend-design** — Implementation; philosophy gate and checklist
- **pn-assets-manager** — Step 4; autonomous mode. Logo, hero, icons per taxonomy.
- **pn-skeptic-challenge** — Steps 3 and 6. Do not skip; do not substitute inline review.
- **pn-render-verify** — Step 5 substep 6 and step 6 (visual artifacts). Reads artifact, emits `verifier.contract.json`-shaped verdict as evidence for the skeptic.
- **pn-api-probe** — Step 2 phase 0 (when runtime/library may have moved). Confirm live API availability before planning.
- **pn-typeset**, **pn-colorize**, **pn-arrange** — Build substeps 1–3 (typography, color, layout)
- **pn-preflight** — Build substep 5b (marketing page modes); `pn-core://reference/marketing-ship-gate.md` (N-01–N-04 when narrative intent)
- **pn-scroll-narrative** — Plan + build when narrative intent is present
- **pn-evidence-qa** — Timeline samples when narrative intent is present
- **design-intent** — `pn-core://reference/design-intent.md` (plan step 2)
- **pn-typography**, **pn-color-system**, **pn-design-system**, **pn-css-styling**, **pn-grid-systems**, **pn-ux-patterns**, **pn-ui-component-libraries** — Per stack
