---
title: How to use pnCore
updated: 2026-07-03
---

# How to use pnCore

## Overview

| Mode | What you get |
|------|----------------|
| **Plugin** | Slash commands, file-glob rules, hooks |
| **MCP** | 24 tools, `pn-core://` resources, prompts (agent/command templates); control flow via **`workflow_step`** — see [MCP usage guide](mcp-usage-guide.md) |
| **Together** | Run both when you want rules plus deterministic workflow tools |

Deeper orientation: [Plugin reference](plugin-reference.md).

**Prompt tips:** Name the workflow when you want discovery and skeptic ("Use the design workflow", "Use the full dev workflow"). For prompt optimization, say what "good" means (e.g. reliability, production). Examples: [Example prompts by command](#example-prompts-by-command) and [Best practices](#best-practices).

---

## Quick reference: prompts by category

### Orchestration and dev loops

- **Configure existing project** — `/pn-setup` or "Configure pnCore for this project" or "Run pn-setup". Choose: (1) Everything, (2) Project integration only (codebase analysis, project-context.mdc, project skill, file-glob rules), (3) Design context only (.pncore-design.md), (4) Stack context only (.pncore-stack.md).
- **New project or feature kickoff** — `/pn-new` or "Start a new project" or "Run pn-new". Strict first questionnaire: (1) references yes/no — if yes, choose prior-art / design / both analysis; (2) intent — full auto (short confirm then autonomous), design focused (workflow_step design), or involved in every step (with optional full doc set: PRD, DESIGN, prior art, workflow roadmap, refs index). Plugin: slash command. MCP only: "Start a new project."
- **Full dev flow with discovery and skeptic** — "Build [X]. Use the full dev workflow." MCP: `workflow_step` enforces discovery → prior art → plan → skeptic → specialists → review. Fallback: `/pn-build`.
- **Design-only UI build** — "Build [X]. Use the design workflow." Design discovery → skeptic-on-plan → build → skeptic-on-output. Fallback: `/pn-design`.
- **Orchestrator flow** — "Add this feature following the orchestrator flow"; "Run pn-project-builder for a full dev loop." Routes to specialists from `config/specialists.json`.
- **Discovery before planning** — "Use pn-discovery-questionnaire before we build." Gate on user answers before plan or scaffold.
- **Prior art before implement** — "Use pn-prior-art-research before implementing." Adapt vs build recommendation with comparison table.
- **Stress-test a plan** — `/pn-grill` or "Grill me on this plan before we build." One question at a time, recommended answer per question.
- **Pressure-test a startup idea** — `/pn-pressure-test` or `get_skill("pn-pressure-test")`. Single-pass verdict (Strong / Weak / Pivot), scorecard, fatal flaws, MVP wedge. Targets the **business thesis**, not a coding plan (`pn-skeptic` / `pn-grill` stay on implementation plans).
- **Explore design options** — `/pn-design-variants` or "Generate 3 radically different designs." Parallel sub-agents.
- **Competing implementations** — `/pn-best-of-n` or `workflow_step("implementation_tournament", 0, {})` when `bestOfN.enabled: true`. Not for auth/security — use review panel per `pn-build-gate`.
- **Multi-slice program** — `/pn-program` or `workflow_step("feature_program", 0, {})` when ≥2 independent vertical slices and `featureProgram: true`.
- **Optimize a prompt** — `/pn-prompt-optimize` or `workflow_step("prompt_optimize", 0, {})`.
- **Define domain vocabulary** — "Run pn-domain-language" or "Extract our ubiquitous language." DDD-style glossary.
- **Curate agent context** — `get_skill("pn-context-engineering")` when output drifts, you switch tasks, or you need a smaller, correct context window.
- **Vendor-doc-backed code** — `get_skill("pn-source-driven-implementation")` when framework or library behavior must match official docs for the versions in your lockfile.

### Design and frontend

- **Landing page or dashboard** — "Build a landing page. Use the design workflow." Discovery (including expanded Design 3a–3g when UI in scope: structure, layout, sections, colors, typography, components, ambition), skeptic, then build. For award-winning design, answer all Design subsections.
- **House design context** — Run **`pn-setup`** (design context) or maintain **`.pncore-design.md`** at the project root (house philosophy, primary reference URL). Template after install: **`.cursor/docs/templates/pncore-design.example.md`**. Root **`CLAUDE.md`** can include the `<frontend_aesthetics>` block from **`pn-core://reference/aesthetics-baseline.md`**.
- **Static HTML preview** — After a fenced **html** block, **`pn-html-preview`** saves to **`html_outputs/`** and opens the file in a browser.
- **React / Next / Astro UI** — "Create a React dashboard component with a11y." pn-frontend-developer agent applies.
- **Wireframe or layout** — "Create a wireframe for this feature"; "Use pn-grid-systems for layout."
- **Design system** — "Audit our design system"; "Establish a design system with tokens." pn-design-system skill.
- **Performance** — "Optimize React/Next.js data loading"; "Use pn-react-next-perf for this page."

### Assets (image, SVG, placeholders)

- **Assets when UI in scope** — Full dev and orchestrator flows automatically include pn-assets-manager when the build has UI (landing page, frontend, product page, components). Images must exist for all elements where they should exist (logo, hero, feature icons, subject icons, badge icons, empty-state illustrations per asset taxonomy). Run `validate:assets` before build or in CI. pn-deliver (verify phase) runs this check for UI projects.
- **Image or SVG (single entry)** — `/pn-assets` or "Create an image or SVG." Asks: SVG (logo, icon, illustration), image (PNG/raster), or placeholder? Then routes to questionnaire-driven svg_create or image_create workflow (or placeholder URLs). Content is discussed before generation.
- **Placeholder images** — Choose "placeholder" in pn-assets or "Create placeholder images for this component." Uses picsum, placehold.co, or SVG data-URI.

### CI, testing, and review

- **Fixing CI** — "My CI is failing, please fix it." AI loads pn-ci-fix or pn-ci-triage and follows the workflow.
- **Smoke tests** — "Fix my failing tests and run CI"; "Run smoke tests after changes." pn-testing-specialist agent, pn-smoke-tests skill.
- **Quality and performance pass** — `/pn-review`; "Review and optimize this codebase." One-shot review + optimization.
- **Plugin submission review** — "Review this Cursor plugin for submission." pn-review-plugin-submission skill.
- **Security audit** — "Audit this auth flow"; "Run pn-security-audit." OWASP, secrets, dependencies, input validation.
- **Deliver with verification** — "Validate this output against acceptance criteria, then package." `/pn-deliver` runs verify (Phase 1) then packaging (Phase 2 only if Phase 1 passes).
- **Pre-ship checklist** — `get_skill("pn-ship-checklist")` before production deploy or risky promotion (composes smoke tests, config review, rollback — not a full DevOps runbook).
- **Browser runtime checks** — `get_skill("pn-browser-runtime-verify")` when you need console, network, or live DOM evidence (screenshot-first flows stay on **pn-evidence-qa**).
- **Deprecate or remove a feature/API** — `get_skill("pn-deprecation-and-removal")` for sunsets and migration windows; stack upgrades stay on **pn-migration-planning**.

### Integrations (n8n, web3)

- **n8n workflows** — "Use pn-n8n-patterns for this workflow." (With an n8n workflow file open, "this" refers to it.) n8n-specific patterns and best practices.
- **Web3 / Solidity** — "Audit this web3 contract with pn-web3-security." Security review for contracts and integrations.

### Documentation and learning

- **Format or validate docs** — `/pn-document`; "Format this README per pn-documentation"; "Check format compliance for docs/discovery/." Loads pn-documentation skill.
- **Prompt optimization** — `/pn-prompt-optimize`; "Optimize this prompt for reliability" or "Optimize the prompt below." Questionnaire-driven; outputs optimized prompt with notes.
- **Continual learning** — "Update AGENTS.md from my transcripts"; "Run pn-continual-learning." Extracts preferences and facts from transcripts into AGENTS.md. Plugin: auto-runs on chat stop via hook; MCP only: on-demand.
- **Docs sync** — "Sync documentation with recent code changes." pn-docs-sync skill.

### Gamedev and 3D

- **Three.js scene** — "Add a Three.js scene with shaders"; "Use pn-game-developer for game logic."
- **Shader authoring** — "Create a custom shader for this effect." pn-shader-authoring skill.
- **Blender / Unreal / Godot** — "Use pn-blender-scripting for this export"; "Follow pn-unreal-dev for Blueprint logic."

---

## Example prompts by command

Copy-pasteable prompts for the main user-centric commands. When MCP is available, the AI uses `workflow_step` for flows that have a workflow type; otherwise it uses the slash command or `get_command` fallback.

> **Slash palette vs canonical inventory.** The `/pn-…` palette lists ~21 user-entry commands. Surgical `pn-audit-*` and design surgery commands (`pn-typeset`, `pn-colorize`, `pn-arrange`, `pn-bolder`, `pn-quieter`, `pn-delight`, `pn-distill`) are deliberately palette-hidden via frontmatter `slash: false`. Reach them via `get_command("<id>")` or invoke them through the visible umbrellas (`/pn-frontend-audit`, `/pn-backend-audit`, `/pn-visual-tweak`, `/pn-polish`, `/pn-design`). Full advanced index: see [`pn-guide` § Advanced](../packages/pn-core-mcp/content/commands/pn-guide.md#advanced--palette-hidden).

| Command | When to use | Example prompt(s) | Workflow (MCP) |
|---------|--------------|-------------------|----------------|
| **pn-setup** | Configure existing project | `/pn-setup` or "Configure pnCore for this project" or "Run pn-setup" | — (codebase analysis + design context + stack context) |
| **pn-new** | New project or feature kickoff | `/pn-new` or "Start a new project" or "Run pn-new" | — (questionnaire then routes to design/full_dev) |
| **pn-build** | Full stack with discovery and skeptic | "Build [X]. Use the full dev workflow." or `/pn-build` | `full_dev` (0→6) |
| **pn-design** | UI/build with discovery and skeptic | "Build [X]. Use the design workflow." or `/pn-design` | `design` (0→5) |
| **pn-frontend-audit** | Audit frontend (typography, layout, motion, perf) | "Audit this frontend." or "Use the frontend audit workflow." or `/pn-frontend-audit` | `frontend_audit` (0→2) |
| **pn-backend-audit** | Full backend audit (API, security, data, errors, perf) | "Run a backend audit." or `/pn-backend-audit` | `backend_audit` (0→6) |
| **pn-review** | One-shot quality and performance pass | `/pn-review` or "Review and optimize this codebase." | — (one-shot) |
| **pn-deliver** | Verify acceptance + package results (strict-mode) | `/pn-deliver` or "Verify then package for delivery." | — (two-phase) |
| **pn-grill** | Socratic plan stress-test | `/pn-grill` or "Grill me on this plan before we build." | — (interactive) |
| **pn-pressure-test** | Startup idea validation | `/pn-pressure-test` or "Pressure-test this startup idea before we write a PRD." | — (skill-backed report; optional playbooks in skill `references/`) |
| **pn-design-variants** | Parallel different designs to compare | `/pn-design-variants` or "Generate 3 radically different designs." | — (parallel sub-agents) |
| **pn-assets** | Image, SVG, or placeholder (single entry) | `/pn-assets` or "Create an image or SVG." | Routes to `svg_create` or `image_create` |
| **pn-document** | Format or validate project docs | `/pn-document` or "Format this README per pn-documentation." | — (one-shot) |
| **pn-prompt-optimize** | Structured prompt improvement | `/pn-prompt-optimize` or "Optimize this prompt for reliability." | `prompt_optimize` (0→2) |
| `game_feature` | Add incremental game mechanic | "Add a [mechanic] to this game." or "Use the game feature workflow." | `game_feature` (no slash command — use natural language) |

See [Detailed workflows (quick reference)](#detailed-workflows-quick-reference) for step counts. For pitch-to-app and MCP-only flows, see [Pitch-to-app](#pitch-to-app-full-pncore-flow) and [MCP-only flows](#mcp-only-flows-no-plugin).

---

## Pitch-to-app (full pnCore flow)

Start from a pitch idea; use every feature: discovery questionnaire (ask_question at every section; stack chosen via questionnaire, not assumed), prior art, roadmap with dev phases, skeptic in line (gate on user acceptance before specialists), design aligned with user (ask for purpose, tone, a11y, components; gate on approval after wireframes, user flows, design system), pn-assets-manager (SVGs + placeholders), Supabase and Stripe. User is gated at each step. Full example: [plugin README](../plugins/pnCore/README.md#example-prompts) or [MCP README](../packages/pn-core-mcp/README.md#example-pitch-to-app-full-pncore-flow).

---

## MCP-only flows (no plugin)

When you use only the pn-core MCP server (no plugin in the project):

- **Build with workflow** — "Build [X]. Use the full dev workflow." or "Build [X]. Use the design workflow."
- **Bootstrap rules** — Copy [mcp-only-bootstrap.mdc](mcp-only-bootstrap.mdc) to `<workspace-root>/.cursor/rules/` so the AI loads pn-build-gate and pn-mcp-proactive.
- **Commands** — Ask in natural language: "run pn-new", "use the design workflow", "run pn-review".

**Best prompt for full involvement:** `Run get_command("pn-new"). I want to build [project name]. Refs in .ref/. I want Involved — ask each discovery section, gate on plan, specialists, and review.` This ensures pn-new runs first, you choose Involved, and you get gates at every step. Avoid starting with only "Build [X]" for new projects; that can bypass pn-new and behave like full auto.

**Project rules:** pn-new, pn-setup, and full_dev create `.cursor/rules/project-context.mdc` with the triangle ([pn-default] ▲), project context, and MCP bootstrap. When missing: pn-build-gate routes to pn-new for new builds or pn-setup for existing repos. Use `/pn-new` with nothing else—the agent asks references and intent, then runs the flow. Use `/pn-setup` for existing repos with code.

---

## Multi-session and parallel work

Direction only; not a commitment to ship features in a given release.

### Today (patterns that already work)

- **Multiple Cursor chats:** Each chat is an independent session. Use `workflow_state_save` / `workflow_state_load` (pn-core MCP) and the resume guidance in `workflow-state-schema.md` and RUNBOOK to continue a workflow after disconnect or in a new chat.
- **Git worktrees:** Run parallel checkouts for parallel streams of work; keep one context index and clear ownership of branches.
- **full_dev parallel specialists:** `workflow_step` can return phased or single-shot parallel specialist tasks; see `workflow-state-schema.md` task contract and `pn-core://reference/best-practices.md`.

### Future (not implemented as first-class yet)

- **Shared durable orchestration:** A single control plane that tracks all active sessions, worktrees, and workflow tickets (beyond file-based `.pncore/` logs and state).
- **Cross-chat handoff:** Automated promotion of workflow state and gate receipts between sessions without manual copy-paste.
- **Daemon or long-running coordinator:** Optional background process for scheduling specialists or HITL; explicitly out of scope for the current "light outer-loop" design (file state + MCP tools only).

When a concrete product requirement appears (e.g. team queue, mandatory external HITL), prefer extending the append-only gate log and Paperclip integration before adding new infrastructure.

---

## Detailed workflows (quick reference)

Indices are **inclusive** (each row matches `list_workflow_types` step counts in [`packages/pn-core-mcp/src/index.ts`](../packages/pn-core-mcp/src/index.ts)).

| workflowType | Step indices | Purpose |
|--------------|--------------|---------|
| `project_kickoff` | 0–7 | Discovery → refs under **`docs/refs/`** (PRD, DESIGN-DOC, optional DOMAIN-DOC) → prior art → optional stack/MCP/UI in **`docs/refs/`** → **`docs/refs/README.md`** index → project context. **No** plan / **`docs/WORKFLOW.md`** here (those follow in **`full_dev`** or via **`pn-writing-plans`**). |
| `design` | 0–5 | Design discovery → Plan+Skeptic → Assets → Build → Skeptic on output → Summary |
| `full_dev` | 0–6 | Discovery → Prior art → Plan+Skeptic → Route specialists → Run specialists → Review+Skeptic → Summary |
| `prompt_optimize` | 0–2 | Questionnaire → Draft + user review → Final prompt |
| `frontend_audit` | 0–2 | Scope → Phase 1–6 audit → scorecard + summary |
| `backend_audit` | 0–6 | Scope + stack context → five audit phases → summary |
| `image_create` | 0–3 | Questionnaire → Spec confirmation → Generate image → Summary |
| `visual_tweak` | 0–3 | Clarify target → Plan confirmation → Implement → Summary |
| `game_feature` | 0–4 | Questionnaire → Plan+Skeptic → Implement → Skeptic on output → Summary |
| `svg_create` | 0–4 | Questionnaire → Spec save + confirmation → Generate SVG → Skeptic on output → Summary |
| `engine_feature` | 0–4 | Unified UE / Godot entry — routes to `unreal_feature` or `godot_feature` via `state.engine` |
| `unreal_feature` | 0–4 | UE 5.7 feature: MCP server pick → api-probe + plan → build → render-verify + skeptic on output (iteration cap) → Summary |
| `godot_feature` | 0–4 | Godot 4.x feature: MCP server pick → api-probe + plan → build → render-verify + skeptic on output (iteration cap) → Summary |
| `fsi_analyst_draft` | 0–5 | Scope → sources + assumptions → draft → QC + skeptic → mandatory analyst sign-off → delivery summary |
| `business_strategy` | 0–8 | Framing → codebase intake (conditional) → evidence → strategic frame → grill → pressure-test (Strong / Weak / Pivot) → conditional skeptic → verdict lock → HTML + markdown brief |
| `media_director` | 0–6 | Intent → adaptive grill → creative brief → plan + pipeline + skeptic → produce → human review → delivery |

**Usage:** Say "Build [X]. Use the design workflow." (or full dev, prompt optimize, visual tweak, game feature). Say "Audit this frontend" or "Use the frontend audit workflow." for audits. Say "Create an image or SVG" or use `/pn-assets`. Slash commands (e.g. `/pn-design`) or "run pn-[command]" load the command; the AI uses `workflow_step` when available for deterministic control flow.

---

## Best practices

- **Prompting:** Be specific; name the workflow ("Use the design workflow" or "Use the full dev workflow") when you want discovery and skeptic.
- **Gating:** Discovery and skeptic require your confirmation; do not ask the AI to skip them unless you explicitly say so.
- **Plugin vs MCP-only:** Slash commands for structured flows; MCP only: natural language + [mcp-only bootstrap rule](mcp-only-bootstrap.mdc).

See [mcp-usage-guide](mcp-usage-guide.md) for MCP tools, resources, prompts, and workflow patterns.

---

## Format reference

Discovery specs and plans follow a canonical format. See [discovery-and-plan-format](../plugins/pnCore/docs/reference/discovery-and-plan-format.md) for structure and save paths (synced from `packages/pn-core-mcp/content/docs/reference/` via `npm run sync:content`).
