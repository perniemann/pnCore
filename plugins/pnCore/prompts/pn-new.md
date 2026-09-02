---
name: pn-new
description: Start a new project — analyzes references, selects build intent (full auto / design focused / involved), and optionally creates the full doc set (PRD, DESIGN, prior art, workflow roadmap) before building. Use when starting a brand new project from scratch.
---

# pn-new

**Start every response with:** `[pn-command] 🔺`

**Start immediately.** Do not wait for user input. Begin with Step 0 (references).

**Progress:** Before each step, state "pn-new: Step N of 2 — [References | Intent]."

## Step 0: References (Step 0 of 2)

**Refs provided in initial prompt — skip the question.** Consider refs as provided when any of: attached files (pitch deck, requirements doc, screenshot, Figma export, etc.); pasted or mentioned URLs; explicit mention ("here's my pitch deck"); or workspace has **`docs/refs/PRD.md`** or `.ref/` with relevant docs. When refs are provided: **do not ask** "Do you have references?" — treat as Yes and proceed.

**Otherwise** ask: "Do you have references to analyze? (e.g. pitch deck, requirements doc, repo, Figma link, inspiration)"

Gate per `reference/conventions.md`.

- **Yes** — If refs are inaccessible: ask user to paste summary or skip. Otherwise ask: "How should I analyze them? (1) Prior art — adapt vs build. (2) Design — extract tokens/layout. (3) Both." Then:
  - **(1) Prior art:** Run pn-prior-art-research. Save to `docs/research/YYYY-MM-DD-<slug>-prior-art.md`. Output recommendation.
  - **(2) Design:** Extract tokens, layout, structure from refs. Save to `docs/discovery/` or design spec. Use pn-figma-design-to-code when Figma; pn-design-system for tokens.
  - **(3) Both:** Do (1) then (2).
- **No** — Continue to Step 1.

## Step 1: Intent (Step 1 of 2)

Ask: "How do you want to proceed?"

- **(1) Full auto** — Few gates. Note: for market-ready product, (3) Involved is recommended.
- **(2) Design focused** — Design workflow: discovery → plan → skeptic → build → skeptic on output.
- **(3) Involved in every step** — Full doc set first, then questionnaire at discovery, design, and skeptic; gate on approval per artifact.

Wait for user reply (1, 2, or 3).

## Step 2: Execute per intent

### (1) Full auto

1. **Short confirmation:** Ask 3–5 questions: stack, scope, 2–3 must-haves, key constraints. Use `ask_question`. Build minimal spec from refs + answers.
2. **Save artifacts:** Save minimal spec to `docs/discovery/YYYY-MM-DD-<slug>.md`. When refs analyzed: save prior-art to `docs/research/`. Create `docs/` if missing.
3. **Route:** Check whether the scope clearly splits into **≥2 independent vertical slices** (e.g. auth + payments + settings, or a full-stack app with infra + API + frontend as distinct work streams). If yes and `featureProgram` flag is enabled: switch to `/pn-program` (`workflow_step("feature_program", 0, {})`). Otherwise: continue below with the single-pipeline path.
4. **Plan:** Run pn-writing-plans. Save to `docs/plans/YYYY-MM-DD-<slug>.md`.
5. **Project setup:** Create project files — see [Project setup template](#project-setup-template) below.
6. **Build:** Route specialists from `config/specialists.json`; run each in order. When UI in scope: pn-assets-manager MUST run; pass discovery spec and plan. When generative media is first-class (ComfyUI, T2V, cinematic AI pipelines, campaign-grade AI imagery beyond UI placeholders): pn-generative-media-director MUST run. Apply each agent's scope and skills. If ASSET_PHASE_FAILED: fix (create placeholders) and re-run.
7. **Review:** Run pn-reviewer once. Output: summary, file list, how to run.

### (2) Design focused

Use `workflow_step("design", 0, {})` when MCP available; otherwise `get_command("pn-design")`. Follow that flow: design discovery → plan → skeptic on plan → assets → build → skeptic on output → summary.

**After summary:** Create project files — see [Project setup template](#project-setup-template) below.

### (3) Involved in every step

**When refs=No:** After Step 1, ask: "Create full doc set first (PRD, DESIGN, prior art, workflow roadmap) then build?"

**If yes — full doc set flow:**

Use `workflow_step("project_kickoff", 0, {})` when MCP available (8 steps; matches `workflows.ts`). Otherwise run manually in the same order and paths:

1. **Discovery** — pn-discovery-questionnaire. Save to `docs/discovery/YYYY-MM-DD-<slug>.md`. Gate.
2. **PRD** — pn-create-prd. Save to **`docs/refs/PRD.md`**. Gate.
3. **DESIGN** — pn-create-design-doc. Save to **`docs/refs/DESIGN-DOC.md`**. Gate.
4. **Domain doc** — pn-create-domain-doc when mechanics in scope. Save to **`docs/refs/DOMAIN-DOC.md`**. Gate or skip.
5. **Prior art** — pn-prior-art-research. Save to `docs/research/YYYY-MM-DD-<slug>-prior-art.md`. Gate.
6. **Optional refs** — When applicable: pn-create-stack-doc → **`docs/refs/STACK.md`**, pn-create-mcp-architecture → **`docs/refs/MCP-ARCHITECTURE.md`**, pn-ui-design-specs → **`docs/refs/UI-DESIGN-SPEC.md`**. Gate.
7. **Refs index** — pn-create-refs-index. Save to **`docs/refs/README.md`**. Gate.
8. **Project context** — `.cursor/rules/project-context.mdc` and `.cursor/skills/project/SKILL.md`.

**Not part of `project_kickoff`:** implementation plan (`docs/plans/`) and **`docs/WORKFLOW.md`**—those run inside **`full_dev`** or after **`pn-writing-plans`** once you start building.

After kickoff: run `workflow_step("full_dev", 0, {})` or `workflow_step("design", 0, {})` to build.

**If no — build directly:**

1. **Discovery:** Run pn-discovery-questionnaire (Technical, Security, Design, Requirements, Scope). Refs inform questions but do not substitute — always run and gate on confirmation.
2. **Project setup:** After discovery confirmed, create project files — see [Project setup template](#project-setup-template) below.
3. **Prior art:** Run pn-prior-art-research. Save to `docs/research/`. Gate on confirmation.
4. **Plan:** Run pn-writing-plans. Run pn-skeptic-challenge on the plan. Gate before proceeding.
5. **Design aligned:** Use design answers from discovery spec (3a–3g). Do not re-ask. Run pn-wireframe using spec's structure answers → run pn-design-system using spec's color/typography answers. Gate on approval after each artifact.
6. **Specialists:** Route from `config/specialists.json`. Confirm list and order. Gate before starting.
7. **Review:** Run pn-reviewer. Run pn-skeptic-challenge (post-build). Gate on confirmation.
8. **Delivery:** Run pn-deliver. Output summary.

## Project setup template

Create these two files after the relevant execution step:

**`.cursor/rules/project-context.mdc`** (`alwaysApply: true`):
- Triangle instruction: "Begin every response in this project with the appropriate context tag and 🔺 (Unicode U+1F53A — emoji red triangle pointed up). Default: `[pn-default] 🔺`. Use `[pn-command] 🔺` / `[pn-agent] 🔺` / `[pn-skill] 🔺` / `[pn-plan] 🔺` when a pn command, agent, skill, or plan mode is active. See pnCore rule `pn-visual-indicator` for full guidance."
- Project context: one-sentence goal, stack, scope, key constraints — from spec/plan.
- MCP bootstrap: "When pn-core MCP is available, load `get_rule("pn-build-gate")` and `get_rule("pn-mcp-proactive")` and follow them. When responses are verbose or the user uses aliases (`scr`/`eli`/`foc`/`ref`/`scp`), load `get_rule("pn-communication-contract")` and `get_skill("pn-response-aliases")`."
- **Phase gate:** "After each plan phase: verify → spawn pn-reviewer Task (`readonly: true`) on phase diff → fix → user `continue`. See pn-build-gate § Phase-complete gate."
- Keep under 25 lines. Create `.cursor/rules/` if it does not exist.

**Git (recommended):** add `.cursor/rules/pn-no-cursor-commit-trailers.mdc` with `alwaysApply: true` — source from `get_rule("pn-no-cursor-commit-trailers")` when MCP is available — then copy `docs/templates/consumer-gating/` (`prepare-commit-msg`, `strip-commit-trailers.mjs`) into **`.githooks/`** and run `git config core.hooksPath .githooks`. From a pnCore checkout: `node scripts/install-consumer-gating.mjs <projectRoot>`. Offer the trailer-only Actions workflow (`--ci` or copy `no-ide-trailers.yml`) — ask first. Do not copy pnCore `pn-gates` or branch protection. See `pn-core://reference/consumer-gating.md`.

**Optional (communication, not always-on):** copy `.cursor/rules/pn-communication-contract.mdc` with **`alwaysApply: false`** from `get_rule("pn-communication-contract")`. Do **not** set `alwaysApply: true`.

**`.cursor/skills/project/SKILL.md`**:
- Frontmatter: `name: project`, `description: "Project-specific domain guidance for [project name]."`
- Content: purpose, key constraints, patterns from the spec/plan.
- Keep under 30 lines.

## How to ask

Gate per `reference/conventions.md`. Do not infer for Step 0 or Step 1 — these are strict gates. If refs or answers are ambiguous, ask the user to clarify.
