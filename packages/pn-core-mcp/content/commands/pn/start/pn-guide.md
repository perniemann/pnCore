---
name: pn-guide
description: Show all pnCore capabilities — commands, agents, and recommended starting points. Use when you don't know which command to run.
---

# pn-guide

**Start every response with:** `[pn-command] 🔺`

Show the user what pnCore can do and recommend the right starting point.

> **Slash palette:** Open **`/pn`** in Cursor IDE for the pnCore submenu (**27** leaves in start/build/design/pm/audit/challenge/ship). Top-level **`/pn`** stub routes on CLI. **28** visible palette files total. Another **18** palette-hidden surgical commands remain canonical-only.

## Step 1: Identify context

Ask: "What are you trying to do?"

Use `ask_question` when available:

1. **Start a new project from scratch**
2. **Set up pnCore for an existing project**
3. **Build a feature or make a large change**
4. **Design or redesign UI**
5. **Audit quality (frontend or backend)**
6. **Make a targeted design edit**
7. **Review, polish, or deliver**
8. **Something else — show me everything**

## Step 2: Route

| Answer | Recommendation |
|--------|---------------|
| 1 — New project | Run **`pn-new`** — guides you through references, intent, and build. |
| 2 — Existing project | Run **`pn-setup`** — creates project context, design context, and stack context so all commands work better. |
| 3 — Build a feature | Run **`pn-build`** — full dev cycle: discovery, plan, skeptic, specialists, review. For ≥2 independent slices: **`pn-program`**. |
| 4 — Design / redesign | Run **`pn-design`** — design-focused build with mandatory typography/color/layout substeps. For cinematic/editorial surfaces: **`pn-design-dna`**. Pre-ship marketing UI: **`pn-preflight`**. To explore alternatives: **`pn-design-variants`**. **Existing app, audit-driven UI redo:** **`pn-frontend-redo`** (sequential surfaces — not `/pn-program`). |
| 5 — Audit quality | **Frontend:** `pn-frontend-audit` (chains 5 surgical FE audits). **Backend:** `pn-backend-audit` (chains 5 surgical BE audits). Single dimension: `get_command("pn-audit-typography")` etc. — see Advanced index. |
| 6 — Targeted design edit | **Router:** `pn-visual-tweak` — picks the right surgical command. Pre-ship all-dimensions: `pn-polish`. Surgical ids (`pn-typeset`, `pn-colorize`, …) are palette-hidden; reach via the router or `get_command("<id>")`. |
| 7 — Review / polish / deliver | **`pn-review`** — code + performance review. **`pn-polish`** — pre-ship design pass. **`pn-deliver`** — verify against acceptance criteria and package. |
| 8 — Show everything | Print the full map below. |

## Step 3: Full map (for option 8 or when helpful)

### Visible slash commands (under `/pn` submenu)

**Start (`pn/start/`):**
- **pn-guide** — This orientation command
- **pn-new** — Start a new project from scratch
- **pn-setup** — Configure pnCore for an existing project

**Build (`pn/build/`):**
- **pn-build** — Full dev cycle with specialist routing
- **pn-program** — Multi-slice program (worktrees; `featureProgram: true`)
- **pn-best-of-n** — Competing implementations tournament
- **pn-deliver** — Verify against acceptance criteria, package for handoff

**Design (`pn/design/`):**
- **pn-design** — UI build with typography/color/layout substeps
- **pn-design-dna** — Cinematic studio DNA surfaces
- **pn-design-variants** — Explore divergent design approaches
- **pn-preflight** — Marketing UI pre-ship gate
- **pn-visual-tweak** — Bounded visual edit router
- **pn-polish** — Pre-ship design quality pass
- **pn-assets** — Create visual assets (SVG, raster, logos)

**Product management (`pn/pm/`):**
- **pn-create-prd** — PRD / product spec
- **pn-user-stories** — Backlog items (3 C's, INVEST)
- **pn-strategy** — Business strategy workflow
- **pn-pressure-test** — Startup idea verdict
- **pn-document** — Format or generate project docs

**Audit (`pn/audit/`):**
- **pn-frontend-audit** — Frontend audit umbrella
- **pn-backend-audit** — Backend audit umbrella

**Challenge (`pn/challenge/`):**
- **pn-grill** — Interactive Socratic plan stress-test
- **pn-skeptic** — Fast automated plan challenge
- **pn-prompt-optimize** — Refine a prompt or instruction

**Ship (`pn/ship/`):**
- **pn-review** — Code quality + performance review
- **pn-handoff** — Session handoff + two reflection questions (`.pncore/handoff.md`)
- **pn-retro** — Session retrospective (manual v1)
- **pn-video-lint** — Pre-render video checklist

**pi.dev:** Flat `/pn-build` etc. from `plugins/pnCore/prompts/` (no submenu — see ADR-0008).

### Advanced — palette-hidden

These commands are deliberately **not** in the `/` slash palette to keep it short. They remain fully addressable via `get_command("<id>")` and are invoked automatically by the umbrellas above.

**Frontend redo (existing app, sequential UI slices):**
- **pn-frontend-redo** — Audit → plan → S1–Sn with slice-verify artifacts + Task checker (not `pn-program`)

**Frontend audit surgical (invoked by `/pn-frontend-audit`):**
- **pn-audit-typography** — Type scale, font choices, hierarchy, loading strategy
- **pn-audit-layout** — Spacing tokens, grid consistency, component rhythm, responsive
- **pn-audit-design-tokens** — CSS variables, hardcoded value elimination, dark mode
- **pn-audit-a11y** — WCAG contrast, keyboard nav, ARIA, semantic HTML
- **pn-audit-performance-fe** — Core Web Vitals, bundle size, images, render-blocking

**Backend audit surgical (invoked by `/pn-backend-audit`):**
- **pn-audit-api** — REST conventions, status codes, response shapes
- **pn-audit-security** — OWASP review, auth, secrets, CORS
- **pn-audit-data** — Database schema, normalization, indexing, migrations
- **pn-audit-errors** — Error handling, logging, correlation IDs
- **pn-audit-performance** — N+1 queries, caching, blocking I/O, connection pools

**Design surgery (invoked by `/pn-design` substeps, `/pn-visual-tweak`, or `/pn-polish`):**
- **pn-typeset** — Typography: fonts, scale, hierarchy, loading
- **pn-colorize** — Color: palette, tokens, contrast, dark mode
- **pn-arrange** — Layout: spatial rhythm, grid, asymmetric composition
- **pn-bolder** — Amplify a timid or generic design
- **pn-quieter** — Reduce visual decoration without removing content
- **pn-delight** — Add purposeful motion and personality
- **pn-distill** — Remove content and features that don't earn their place

### Agents — specialists you invoke for focused work

- **pn-skeptic** — Fast automated plan challenge (use pn-grill for interactive dialogue instead)
- **pn-frontend-developer** — UI components, layout, a11y (React, Astro, Next, vanilla)
- **pn-backend-developer** — API, state, endpoints, database
- **pn-testing-specialist** — TDD, smoke tests, CI
- **pn-mobile-builder** — iOS, Android, React Native, Flutter
- **pn-visionos-engineer** — Apple Vision Pro, visionOS, SwiftUI volumetric
- **pn-webxr-developer** — WebXR, browser AR/VR, Three.js/A-Frame
- **pn-generative-media-director** — Text-to-image/video pipelines, ComfyUI, cinematic shot design
- **pn-cultural-researcher** — Art history, movements, museum citations, period-accurate grounding
