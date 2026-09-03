---
title: pnCore plugin reference
updated: 2026-07-03
---

# pnCore plugin reference

Orientation for **pnCore**: stacks, agents, commands, hooks, and contribution paths. **Authoritative ids** for rules, skills, agents, and commands come from MCP **`list_rules`**, **`list_skills`**, **`list_agents`**, and **`list_commands`** (then **`get_*`** by id)—not from static lists in this file, which drift. For install and quick start see the [repo README](../README.md) and [plugin README](../plugins/pnCore/README.md). For MCP tools, resources, prompts, and workflows, see [MCP usage guide](mcp-usage-guide.md) and [packages/pn-core-mcp/README.md](../packages/pn-core-mcp/README.md).

---

## Terminology: pnCore agents vs Paperclip agents

| Term | Meaning |
|------|---------|
| **pnCore agents** | Specialist prompts (markdown in `content/agents/`). Used as reusable prompts in workflows; invoked when the orchestrator routes work. Examples: pn-project-builder, pn-skeptic, pn-reviewer. |
| **Paperclip agents** | DB entities in [Paperclip](https://github.com/paperclipai/paperclip) with adapter config, org chart, budgets. External runtimes (OpenClaw, Cursor, Codex) that Paperclip invokes via heartbeats. |

When integrating with Paperclip, pnCore workflows run inside Cursor; use `paperclip_issue_checkout` before work when governance requires it, `paperclip_issue_comment` for updates, and `paperclip_issue_update` (e.g. `status: done`) when a workflow completes. Set `PAPERCLIP_ISSUE_ID` when the issue id is not in chat. See skill `pn-paperclip`.

---

## Supported stacks

| Domain | Supported | Not supported |
|--------|-----------|---------------|
| **Frontend** | React, Astro, Next.js, vanilla HTML/CSS/JS | Vue, Svelte, Angular, Qwik |
| **Backend** | Node.js, Python, Go, Rust, Ruby, PHP | — |
| **3D/Gaming** | Three.js, shaders, Blender (Python), Unreal, Godot, Babylon.js | Unity (gamedev skills and agents only; no dedicated stack rule—same “limited first-class” band as README) |
| **Other** | n8n, web3, Figma, CI | — |

The orchestrator and full dev loop route work to specialists. n8n and web3 have rules and skills but no dedicated agents.

---

## Rules and skills (inventory)

Rules live as `.mdc` files under `content/rules/` (always-apply or glob-scoped for stacks, CI, n8n, web3, gamedev, design, and tooling). **pn-aesthetics-baseline** is always-apply: enforces the non-generic UI floor and `.pncore-design.md` / `pn-core://reference/aesthetics-baseline.md` alignment for user-facing surfaces. Skills live under `content/skills/<category>/` with categories: **frontend**, **media**, **backend**, **ci**, **review**, **gamedev**, **orchestration**, **pm**, **plugin**, **discipline**, **integrations**, **learning**, **marketing**, **support**, **fsi**. Backend skills ship a shared reference layer at `skills/backend/reference/` (`api-design.md`, `database-patterns.md`, `security-patterns.md`, `error-handling.md`).

Use **`list_rules`** / **`get_rule`** and **`list_skills`** / **`get_skill`** for exact ids and full text. **Note:** **`pn-design-system`** exists as both a rule (CSS/SCSS token enforcement) and a skill (establish or audit design systems). See [agents-md-guide](agents-md-guide.md) for hard constraints vs learned preferences.

Orchestration includes **pn-cultural-heritage-research** for tiered museum and art-history source discipline before period-specific UI, games, or copy. **pn-render-verify** and **pn-api-probe** support design and build flows (visual artifact verification and live API/version probes). **pn-context-engineering** curates what agents load (rules → spec → task files → errors); **pn-deprecation-and-removal** covers API/feature sunsets and zombie code (distinct from **pn-migration-planning** for framework version jumps). **Discipline** adds **pn-source-driven-implementation** (vendor docs for locked versions). **Review** adds **pn-browser-runtime-verify** (runtime DOM/console/network/perf vs screenshot **pn-evidence-qa**). **CI** adds **pn-ship-checklist** (composable pre-ship gate). **Integrations** adds **pn-rag-evaluation** (golden sets, automated RAG metrics, human rubrics, CI regression gates). **Support** expands **pn-budget-cost-monitor** (hidden token drivers: tools, RAG k, duplicated context, multimodal). **pn-unreal-mcp** (orchestration skill) compares and recommends UE 5.7-compatible MCP servers (ChiR24, remi, Sallah, kangnam, jim, StraySpark) at discovery time; used by the `unreal_feature` workflow step 0.

**Embedded studio DNA:** MCP resource **`pn-core://reference/embedded-studio-dna.md`**; skill **pn-embedded-studio-dna**; command **pn-design-dna** (DNA preamble then **`pn-design`** / `workflow_step("design")`). For cinematic portfolio, reel, studio, and lab surfaces.

**Human-facing workflow artifacts:** MCP resource **`pn-core://reference/human-facing-artifacts.md`** — **SHOULD**-level guidance for HTML (shareable) vs Cursor canvas (IDE-bound) vs markdown on a **subset** of orchestration outputs (exploration, plans, PR explainers, reports); **dual digest** when automated handoffs follow. RUNBOOK summarizes and links here.

---

## Agents (15)

- **pn-scaffolder** — Discovery-driven plugin, web (React, Astro, Next, vanilla), backend (Node, Python, Go, Rust, Ruby, PHP), or 3D (Babylon.js) scaffold; pn-discovery-questionnaire; pn-writing-skills when creating skills; post-scaffold review.
- **pn-assets-manager** — SVG, raster images, logos, diagrams, placeholders; routes to workflow_step("svg_create")/inline SVG, workflow_step("image_create")/inline image, `pn-diagram` for architecture/flow visuals, or placeholder URLs.
- **pn-generative-media-director** — Text-to-image and text-to-video pipelines, ComfyUI workflow design and debugging, checkpoint and conditioning choices, cinematic shot design, lighting and camera grammar, delivery specs. In `config/specialists.json` (parallelGroup 1); `full_dev` requires this agent when discovery or plan treats generative media as first-class; omit for UI-only placeholder assets.
- **pn-frontend-developer** — UI components, layout, a11y, user flows, visual design (React, Astro, Next, vanilla web); post-change review.
- **pn-game-developer** — Three.js, Babylon.js, Godot, Unity scenes; shaders; game logic; post-change review.
- **pn-backend-developer** — Event handlers, API, state, backend (Node, Python, Go, Rust, Ruby, PHP); API/state/error review after changes.
- **pn-testing-specialist** — TDD, smoke tests, CI, pn-verification-before-completion; run smoke/CI after tests and loop back if fail.
- **pn-reviewer** — Quality review loop with deslop, pn-verification-before-completion, and performance optimization; repeat until pass.
- **pn-skeptic** — Questions the proposed approach; used after planning, before specialists run (orchestrator and full dev loop).
- **pn-security-auditor** — Security-focused review; OWASP, auth, dependencies, secrets, input validation.
- **pn-project-builder** — Discovery → user confirms → prior art → pn-writing-plans → **pn-skeptic-challenge** on plan → routes to specialists → pn-reviewer for final review+optimize loop.
- **pn-mobile-builder** — Native iOS/Android and cross-platform (React Native, Flutter); mobile-specific features. Manual routing only; not in config/specialists.json.
- **pn-visionos-engineer** — visionOS spatial computing, SwiftUI volumetric interfaces, Liquid Glass. Manual routing only; not in config/specialists.json.
- **pn-webxr-developer** — WebXR, browser AR/VR, Three.js/A-Frame. Manual routing only; not in config/specialists.json.
- **pn-cultural-researcher** — Art history, movements, museum citations, period-accurate visual or copy grounding via **pn-cultural-heritage-research**. Manual routing only; listed in `onDemandAgents` in `config/specialists.json`.

---

## Commands

Roughly **25** user-entry commands ship under **`plugins/pnCore/.cursor/commands/`** (the Cursor slash palette). Another **18** surgical commands live canonical-only under **`packages/pn-core-mcp/content/commands/`** with frontmatter `slash: false` — reachable via **`get_command("<id>")`** but not shown in the `/` palette. Static counts drift; use **`list_commands`** for the canonical inventory (returns all 43) and `Get-ChildItem plugins/pnCore/.cursor/commands/*.md | Measure-Object` for the live palette count. The split is enforced by [`scripts/command-slash-filter.mjs`](../scripts/command-slash-filter.mjs) and capped by the soft limit in [`scripts/validate-plugin-lib.mjs`](../scripts/validate-plugin-lib.mjs).

### Core workflow (12)

- **pn-new** — Start a new project. Refs (yes/no), intent (full auto | design focused | involved). Involved mode optionally runs full doc set (PRD, DESIGN, prior art, workflow roadmap, refs index) then builds.
- **pn-setup** — Configure pnCore for an existing project. Choose: (1) Everything, (2) Project integration only (codebase analysis, project-context.mdc, project skill, file-glob rules), (3) Design context only (`.pncore-design.md`; optional house philosophy, primary reference URL, diagram tokens, CLAUDE.md aesthetics block), (4) Stack context only (.pncore-stack.md). Git trailer hooks: `pn-core://reference/consumer-gating.md`. Template: `.cursor/docs/templates/pncore-design.example.md` after install.
- **pn-build** — Full dev cycle: discovery → prior art → plan → skeptic-on-plan → specialists → review+optimize → skeptic-on-output. For new features or large changes. Prefer `workflow_step("full_dev", …)` when MCP available.
- **pn-design** — Design-first build: checks `.pncore-design.md` → discovery → optional **`pn-api-probe`** before plan when the runtime may have moved → plan → skeptic → assets → build (pn-typeset → pn-colorize → pn-arrange substeps) → **`pn-render-verify`** then skeptic-on-output for visual deliverables. Failed skeptic-on-output can loop to build with **`iterationCount`** / **`approval_checkpoint`** when using `workflow_step("design", …)`. Prefer `workflow_step("design", …)` when MCP available.
- **pn-design-dna** — Same as design flow after loading **embedded studio DNA** (`pn-core://reference/embedded-studio-dna.md`) and **pn-embedded-studio-dna**; for portfolio / reel / lab editorial structure. Prefer chaining `workflow_step("design", …)` with DNA summary in context when MCP available.
- **pn-review** — One review+optimize pass: quality gates, deslop, pn-reality-check, pn-react-next-perf / pn-systematic-debugging where relevant.
- **pn-deliver** — Strict delivery gate. Phase 1: verify against acceptance criteria and quality gates. Phase 2 (only if Phase 1 passes): package results (summary, file list, how-to-test, checklist, residual risks, followups).
- **pn-assets** — Single entry for any visual asset. Routes to SVG flow (`workflow_step("svg_create")` or inline), image flow (`workflow_step("image_create")` or inline), **diagram** (`pn-diagram` / `pn-diagram-design`), or placeholder URLs. Content discussed before generation.
- **pn-diagram** — Architecture, flowchart, sequence, state, loop, quadrant, layers, process, data-flow, or org-chart as Mermaid-in-docs or editorial HTML/SVG. Import-redraw with a fidelity ledger (no draw.io extractors). Skill `pn-diagram-design`; no `workflowType`.
- **pn-strategy** — Business-strategy entry point: framing → grill → pressure-test → HTML + markdown brief. Prefer `workflow_step("business_strategy", …)` when MCP available.
- **pn-document** — Format or validate project docs; loads pn-documentation for discovery, plans, prior-art, SVG specs, README, CHANGELOG.
- **pn-guide** — Routing reference for the command and skill catalog (clusters, when-to-use guidance, surgical-audit map).
- **pn-video-lint** — Lint and review generated video / motion deliverables for spec, pacing, and pipeline drift.

### New capabilities (6)

- **pn-grill** — Socratic plan stress-test: one question at a time, recommended answer per question, walks every branch of the decision tree until resolved. Use before building when you want dialogue, not a single-pass report.
- **pn-design-variants** — Parallel sub-agents each constrained to a radically different design approach, then compare. Based on "Design It Twice." Use before committing to a UI layout, component API, module interface, or architecture choice.
- **pn-pressure-test** — Startup idea pressure-test (verdict, scorecard, fatal flaws, competition-as-behavior, first-customer moves, ~2-week MVP test). Not for implementation plans; use pn-skeptic / pn-grill for those.
- **pn-program** — Multi-slice hierarchical orchestration (`feature_program` workflow; preview behind `featureProgram: true`). Prefer `workflow_step("feature_program", …)` when MCP available.
- **pn-best-of-n** — Competing implementations tournament (2–3 isolated worktrees, objective gates, premium judge). Skill-only when `bestOfN.enabled` is false; prefer `workflow_step("implementation_tournament", …)` when the flag is on.
- **pn-handoff** — Session handoff at `.pncore/handoff.md` plus two reflection questions before close.
- **pn-retro** — Manual session retrospective; blameless reports under `docs/refs/retros/`.
- **pn-prompt-optimize** — Refine and stress-test a prompt or instruction. Prefer `workflow_step("prompt_optimize", …)` when MCP available.

### Full audits (2)

- **pn-frontend-audit** — Scope → 5 surgical passes (typography → layout → design-tokens → a11y → performance-fe) → scorecard + fix roadmap. Prefer `workflow_step("frontend_audit", …)` when MCP available.
- **pn-backend-audit** — Stack context, then five passes: `pn-audit-api` → `pn-audit-security` → `pn-audit-data` → `pn-audit-errors` → `pn-audit-performance`. Uses `.pncore-stack.md` when present (create via **`pn-setup`** option 4). Prefer `workflow_step("backend_audit", …)` when MCP available.

### Backend surgical (5) — `pn-audit-*` — palette-hidden (`slash: false`); reach via `get_command("<id>")` or as substeps of `pn-backend-audit`

- **pn-audit-api** — REST convention review: resource naming, HTTP semantics, status codes, response shapes, input validation, schema leaks, pagination. Standalone or substep of `pn-backend-audit`.
- **pn-audit-security** — OWASP-guided security review: injection, JWT config, password hashing, IDOR, secrets hygiene, CORS allowlist, security headers, rate limiting. Standalone or substep of `pn-backend-audit`.
- **pn-audit-data** — Database schema design or review: normalization, FK constraints, indexing strategy, money as integer cents, soft delete partial indexes, migration immutability, expand-contract. Standalone or substep of `pn-backend-audit`.
- **pn-audit-errors** — Standardize error handling: centralized middleware, consistent shapes, requestId propagation, structured logging, stack trace removal, graceful shutdown. Standalone or substep of `pn-backend-audit`.
- **pn-audit-performance** — Backend performance pass: N+1 queries, missing indexes, caching opportunities, blocking I/O, connection pool configuration, unpaginated collections. Standalone or substep of `pn-backend-audit`.

### Frontend surgical (5) — `pn-audit-*` — palette-hidden (`slash: false`); reach via `get_command("<id>")` or as substeps of `pn-frontend-audit`

- **pn-audit-typography** — Type system review: font stack choices, scale, hierarchy, line-height/measure, loading strategy.
- **pn-audit-layout** — Layout review: spatial rhythm, grid anti-patterns, container queries, responsive breakpoints, overflow.
- **pn-audit-design-tokens** — Design-token review: OKLCH/HSL palette, semantic naming, dark-mode coverage, contrast ratios.
- **pn-audit-a11y** — Accessibility review: WCAG AA, keyboard navigation, focus management, ARIA usage, prefers-reduced-motion.
- **pn-audit-performance-fe** — Frontend performance review: hydration cost, image optimization, bundle splitting, render-blocking assets, LCP/CLS/INP.

### Design surgical (9) — palette-hidden except the two routers

**Visible (slash palette):**

- **pn-visual-tweak** — Targeted visual change via `workflow_step("visual_tweak", …)`; bounded layout/color/type/motion pass. Routes to the surgical commands below.
- **pn-polish** — Pre-ship quality pass across typography, color, spacing, copy, a11y, and interaction states.

**Palette-hidden (`slash: false`); reach via `get_command("<id>")` or as substeps of `pn-visual-tweak` / `pn-polish` / `pn-design`:**

- **pn-typeset** — Surgical typography pass: font choices, type scale, hierarchy, and font loading.
- **pn-colorize** — Surgical color pass: OKLCH palette, tinted neutrals, WCAG contrast, dark mode token system.
- **pn-arrange** — Surgical layout pass: spatial rhythm, asymmetric composition, grid anti-patterns.
- **pn-bolder** — Amplify a timid or generic design; replaces safe defaults with visual character.
- **pn-quieter** — Reduce visual noise; removes decorative excess, overused animations, competing elements.
- **pn-delight** — Add purposeful motion and personality; justifies each delight point before implementing.
- **pn-distill** — Strip design to its essence; removes everything that doesn't earn its place.
- ~~pn-html-preview~~ — Demoted to skill `pn-html-preview` (invoke via `get_skill("pn-html-preview")`). Save fenced HTML, open in browser.

> Game-feature work uses the **`game_feature`** workflow type directly — there is no `/pn-game` slash command; say "Use the game feature workflow" or call `workflow_step("game_feature", 0, {})`.

**Workflow engine:** When MCP is available, prefer the `workflow_step` tool for all types returned by `list_workflow_types` (including `project_kickoff`, `prompt_optimize`, `visual_tweak`, and asset flows). Control flow is deterministic; the model cannot skip steps. See [mcp-usage-guide](mcp-usage-guide.md) for workflow types and step flow.

---

## Hooks

The only Cursor hook used by pnCore is **stop**: it runs `scripts/pn-continual-learning-stop.mjs` for continual learning and may refresh AGENTS.md. Requires Node.js. Cursor runs the hook with the plugin root as cwd. If AGENTS.md does not auto-update, run the pn-continual-learning skill manually. See [agents-md-guide](agents-md-guide.md) for hard constraints vs learned preferences and retrieval policy.

**Strict-mode flow** is implemented as an optional step inside the full dev loop and orchestrator: after the review+optimize loop, run **pn-deliver** when you need contract-grade validation and packaging. Phase 1 verifies; Phase 2 packages (only if Phase 1 passes). See reference/FLOW.md.

---

## Adding rules, skills, or commands

Edit in `packages/pn-core-mcp/content/` then run `npm run sync:content`.

- **Commands:** Add `pn-name.md` in `content/commands/` with frontmatter (`name`, `description`).
- **Rules:** Add a `.mdc` file in `content/rules/` with YAML frontmatter (`description`, `alwaysApply` or `globs`).
- **Skills:** Add `skills/<category>/<skill-name>/SKILL.md` in `content/skills/` with frontmatter (`name`, `description`) and "When to use" + "Instructions". Categories: frontend, backend, ci, review, gamedev, orchestration, pm, plugin, discipline, integrations, learning, marketing, support. Skills that assert "best practice" must cite Tier 1 sources per [source-tiers.md](source-tiers.md).
- **Specialists:** Edit `config/specialists.json` only; agents and commands use it as source of truth.
- **Stacks:** Add entry to `config/stacks.json`, create rule and scaffold skill, update discovery questionnaire.

---

## Single source of truth (plugin vs MCP)

**`packages/pn-core-mcp/content/` is the canonical source.** Run `npm run sync:content` from repo root to copy content into `plugins/pnCore/`. Edit content in the MCP package; sync before testing or release. See [folder-structure](folder-structure.md) and [sync-content-to-plugin.mjs](../scripts/sync-content-to-plugin.mjs). Open `plugins/pnCore/` as workspace to use commands.

---

## Paths: docs/ and config/

- **docs/:** Paths `docs/discovery/`, `docs/plans/`, `docs/research/`, and `docs/reference/` are relative to the **plugin root** when the Cursor workspace is the plugin (`plugins/pnCore`). Save discovery specs to `docs/discovery/`, plans to `docs/plans/`, prior-art research to `docs/research/`. The canonical format reference is `plugins/pnCore/docs/reference/discovery-and-plan-format.md`.
- **config/:** `config/specialists.json` and `config/stacks.json` live under the plugin at `plugins/pnCore/config/`. When using the MCP package in another workspace, copy the default config from that package's `content/config/` into your project's `config/` so these paths exist in the workspace.
- **reference/:** Strict-mode flow and contract schemas live under `plugins/pnCore/reference/`: `FLOW.md`, `DECISION_LOGIC.md`, and `schemas/*.contract.json` (orchestrator, builder, skeptic, verifier, delivery_pack, fix_tasks). Use for a contract-driven pipeline; command `pn-deliver` follows these contracts.

---

## Validation

From repo root: `npm run validate` (includes Prettier **format:check** on MCP `src` and `scripts`). Plugin only: `node scripts/validate-plugin-lib.mjs plugins/pnCore`. Exit 0 = pass.
