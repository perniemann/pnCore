# Orchestrator runbook (quick reference)

One-page reference for full_dev and design flows. For full detail see FLOW.md and DECISION_LOGIC.md.

## Plan accuracy

Whenever a plan needs user input, ask before locking. See `pn-build-gate` and `reference/conventions.md`.

## When to use what

| Goal | Use | Notes |
|------|-----|--------|
| **New project from scratch** | `get_command("pn-new")` | (1) References yes/no; (2) intent: full auto, design focused, or involved (with optional full doc set). |
| **Configure existing project** | `get_command("pn-setup")` | Codebase analysis, design context, stack context — pick what you need. |
| **Create project docs** | `workflow_step("project_kickoff", 0, {})` | New project, no refs. **8 steps:** discovery → PRD/DESIGN/DOMAIN (optional) in **`docs/refs/`** → prior art → optional stack/MCP/UI in **`docs/refs/`** → **`docs/refs/README.md`** index → project context. Not included: implementation plan / `docs/WORKFLOW.md` (those follow in `full_dev` or via `pn-writing-plans`). Also via pn-new Involved. |
| Full dev (discovery → prior art → plan → skeptic → specialists → review → summary) | `workflow_step("full_dev", step, state)` or `get_command("pn-build")` | Prefer workflow_step; state is validated per step. |
| Design-only | `workflow_step("design", step, state)` or `get_command("pn-design")` | Same: prefer workflow_step. |
| Frontend audit | `workflow_step("frontend_audit", step, state)` or `get_command("pn-frontend-audit")` | Chains 5 surgical commands: `pn-audit-typography`, `pn-audit-layout`, `pn-audit-design-tokens`, `pn-audit-a11y`, `pn-audit-performance-fe`. Each is also usable standalone. |
| **Frontend redo (existing app, sequential UI slices)** | `get_command("pn-frontend-redo")` | Audit → plan → S1–Sn with slice-verify artifacts + Task checker. **Not** `feature_program` (no worktrees). |
| Targeted visual tweak | `workflow_step("visual_tweak", step, state)` or `get_command("pn-visual-tweak")` | Bounded layout/color/type/motion change; not full pn-design. |
| Static HTML preview | `get_skill("pn-html-preview")` | Extract fenced **html** code block → save under `html_outputs/` → open in browser; optional evidence. |
| Create image or SVG | `get_command("pn-assets")` — routes to `workflow_step("svg_create", ...)` or `workflow_step("image_create", ...)` | Single entry for image and SVG creation. |
| Generative media (ComfyUI, T2V, DOP-style prompts) | `workflow_step("media_director", 0, {})` for the gated deep flow; `get_agent("pn-generative-media-director")` for ad-hoc reference — skills: `pn-comfyui-workflows`, `pn-generative-video-pipelines`, `pn-cinematography-lighting`, `pn-grill` | 7 steps: intent → topics+inline-grill → brief → plan+pipeline+skeptic → produce → review → delivery. **Opt-in only**: listed in `specialists.json` under `optInOnly` (parallelGroup 1 when included). `full_dev` includes the agent and dispatches to this sub-flow only when `state.includeGenerativeMedia === true` (captured at the discovery step — no prompt-sniffing). Use pn-assets-manager alone for standard UI placeholders. |
| Game feature (5 steps) | `workflow_step("game_feature", step, state)` | spec → plan+skeptic → build → **skeptic-on-output (human gate)** → summary. |
| Unreal / Godot feature | `workflow_step("engine_feature", 0, { engine: "unreal"\|"godot" })` | Requires `state.engine`; public API entry for UE and Godot builds |
| Ad-hoc review pass | `get_command("pn-review")` or pn-reviewer agent | One review+optimize pass. |
| **Verify + package delivery** | `get_command("pn-deliver")` | Validates acceptance criteria then packages results. Replaces separate verify/package commands. |
| **Stress-test a plan** | `get_command("pn-grill")` | Socratic one-Q-at-a-time interrogation with recommended answers. |
| **Pressure-test a startup idea** | `get_command("pn-pressure-test")` | Strong/Weak/Pivot, scorecard, fatal flaws, MVP wedge; optional playbooks under skill `references/`. |
| **Explore design options** | `get_command("pn-design-variants")` | Parallel sub-agents generating radically different approaches. |
| **Competing implementations (best-of-N)** | `get_command("pn-best-of-n")` or `workflow_step('implementation_tournament', …)` when `bestOfN.enabled` | 2–3 worktree-isolated paths, objective gates, premium judge. Not auth/security. |
| **Full involvement (MCP-only)** | `get_command("pn-new")` → choose Involved, or `workflow_step("full_dev", 0, { intent: "involved" })` | Maximum gates at every step. |
| **FSI analyst draft** (comps, DCF, earnings note, IC memo, GL recon, …) | `workflow_step("fsi_analyst_draft", 0, {})` | 6 steps: scope → sources → draft → QC → sign-off gate → deliver. Steps 0, 3, 4 are human-gated. Step 4 is the mandatory delivery sign-off (non-advice boundary). All outputs require professional review before use. |

## PM flows (optional, model-discretionary)

**Palette:** Cursor IDE → **`/`** → **`pn`** → **`pn/pm/`** leaves. pi.dev → flat `/pn-create-prd` etc. CLI → `/pn` stub or `get_command`.

| Need | Flow | When |
|------|------|------|
| PM routing | `get_command("pn")` or `pn-guide` | Unsure which PM workflow |
| Stakeholder alignment | PRD (`pn-create-prd`) → prior art → plan | User requests product spec |
| Backlog/sprint planning | `pn-user-stories` or `pn-job-stories` → plan | User requests backlog or sprint items |
| Release notes | `pn-release-notes` (before or after summary) | User wants release notes |

See ADR-0008 for Cursor vs pi.dev delivery differences.

Do not add PM skills as mandatory steps to full_dev or design.

## Human-facing workflow artifacts

Orchestrated steps that produce **long or spatial** deliverables (exploration, implementation plans, PR explainers, leadership-facing reports) **SHOULD** default to **human-optimized** output: **Cursor Canvas** when the user stays in the IDE (see workspace canvas skill); **single-file HTML** when the artifact must be **shared outside Cursor** (browser, attachment, static link). **Markdown remains fine** when the user declines or needs fast iteration.

**full_dev / automated handoffs:** For that subset, also emit a **short markdown or structured digest** (decisions, paths, next actions) for downstream specialists and resume — unless the run is **standalone** and no automated step consumes the output.

Tradeoffs: HTML is often slower to generate and **noisier in git diffs** than markdown; say so when steering the user.

**Canonical detail:** `pn-core://reference/human-facing-artifacts.md` — scope, canvas-vs-HTML table, and link to external example gallery.

## Project rules

- **project-context.mdc:** pn-new, pn-setup, and full_dev create `.cursor/rules/project-context.mdc` if missing. When absent: pn-build-gate routes to pn-new or pn-setup.
- **Design questionnaire:** When frontend/UI in scope, Discovery includes Design 3a–3g. Answer all subsections for award-winning design.
- **Assets when UI present:** Orchestrator flows include pn-assets-manager automatically; logos, icons, hero images, or placeholders are created even if not explicitly mentioned.

## Config

- **Specialists:** `config/specialists.json` (or `pn-core://config/specialists.json`). Do not hardcode.
- **Stacks:** `config/stacks.json` (or `pn-core://config/stacks.json`).
- **Features:** `pn-core://config/features.json` merged with env **`PNCORE_FEATURES`** (JSON object). Keys: `strictPlanSummary`, `mergePhaseFullDev`, `truncateSkills`, `modelTierOverrides`, `tierAliases`.
- **Subagent routing:** `pn-core://reference/subagent-routing.md` — Task `subagent_type`, model tier per role, parallel review panel on auth/RLS/payments slices.
- **Model tiers:** `workflow_step` returns `suggestedModelTier` (`fast` / `standard` / `premium` / `premium_thinking`). Exemplars: composer-2.5-fast, claude-4.6-sonnet-medium-thinking, claude-opus-4-8-thinking-high. Override via `PNCORE_FEATURES.modelTierOverrides` (`<workflowType>.<step>`) and `tierAliases`.

## Run correlation and budgets

- **`run_id`:** Every `workflow_step` response includes **`run_id`** when generated or echoed; put the same value in `state` on subsequent calls. Pass **`run_id`** into **`report_usage`**, **`gate_log_append`**, and **`approval_checkpoint`** (optional) for correlated JSONL lines.
- **`workflow_usage_totals`:** Sums tokens/cost for a **`run_id`** over `.pncore/usage.jsonl` (optional path). Env **`PNCORE_USAGE_WARN_INPUT_TOKENS`** adds a **`warn`** flag when input totals exceed the threshold.
- **Handoff:** **`workflow_handoff_append`** / **`workflow_handoff_read`** on `.pncore/workflow-handoff.jsonl` (override with **`PNCORE_HANDOFF_LOG`**). **`PNCORE_USAGE_SCAN_BYTES`** caps how much of a large usage file is scanned (default 786432).

## Large skill bodies

- Env **`PNCORE_MAX_RESOURCE_CHARS`** (default 150000) truncates **`get_skill` / `get_agent` / `get_command` / `get_rule`** responses with a visible marker. Disable truncation via **`truncateSkills: false`** in features JSON/env.
- Env **`PNCORE_SKILL_LOG_SAMPLE_RATE=N`** — write 1-in-N entries to `.pncore/skill-load-log.jsonl` to reduce I/O on high-frequency skill loading. Default: 1 (log every call).

## Standard vs strict flow

See FLOW.md for standard and strict sequences.

## Skeptic gates

- **On plan:** Run pn-skeptic-challenge after pn-writing-plans; do not run specialists until user confirms.
- **On output:** Run pn-skeptic-challenge after build/review; gate before final summary.

## Resource lifecycle (canonical content and rollback)

For skills, rules, agents, commands, and reference shipped from the repo:

| Step | What to do |
|------|------------|
| **Canonical path** | Edit `packages/pn-core-mcp/content/` only; run `npm run sync:content` so `plugins/pnCore/` stays aligned. |
| **Assess** | `npm run validate` before PR; use `npm run test:full` when MCP, root scripts, or large content surface changes (CI parity). |
| **Lineage** | Git history, ADRs in `docs/adr/`, quarterly audit notes in `docs/refs/audit-YYYY-Qn.md` (see ADR-0002). |
| **Rollback** | `git revert` or checkout from a known-good revision; releases/tags as needed for downstream consumers. |
| **Cross-entity context** | **Repo-local:** project rules, `AGENTS.md`, `.pncore/*` state/logs. **MCP server:** tool surface, env (e.g. `PNCORE_REQUIRE_APPROVAL_FOR_WORKFLOWS`, `PNCORE_APPROVAL_TOKEN`). There is no single global “memory protocol”—document where each run stores state. |
| **Hard human gates** | Optional `approval_checkpoint` + `pncoreHumanGateTicket` in workflow state when env requires it; see workflow-state-schema and MCP README. |

**Policy:** Strengthen governance via repo + CI + workflows; do not treat external research protocols as in-product specs unless explicitly revisited in an ADR. See `docs/adr/0003-governance-without-agp-protocol.md`.

## Token and cost visibility

Token/cost reporting is client-side. Call `report_usage` after each `workflow_step` when possible; include **`run_id`** from `workflow_step`. Use **`workflow_usage_totals`** to aggregate per run. See `pn-core://reference/workflow-state-schema.md`.

### Token-efficient MCP usage

- Call `list_skills` / `list_commands` (etc.) once to pick ids, then `get_skill` / `get_command` once per artifact and reuse the text in-session instead of re-fetching the same id every step.
- Prefer `resources/read` for long static checklists (e.g. `pn-core://reference/best-practices.md`) over pasting full files into chat.
- Large skills often ship a `reference.md`; load the main `SKILL.md` first and only pull extra files if the task needs that depth.

## Workflow state and tasks

- **State schema:** See `pn-core://reference/workflow-state-schema.md` for required/optional keys per workflow and step.
- **Resume:** Call `workflow_state_load`, pass restored state to `workflow_step(type, step, state)`, continue. Call `workflow_state_save` after each step to persist.
- **Resume checklist:** See `workflow-state-schema.md` (outer loop): default path `.pncore/workflow-state.json` or `PNCORE_STATE_PATH`, reload before continuing, save after each completed step, use `workflow-runs.jsonl` if step number was lost. No background daemon—files only.
- **Parallel:** When `workflow_step` returns `parallel: true` and `tasks`, run those tasks in parallel; pass `taskResults` when advancing to the next step (full_dev step 5 needs one summary per specialist in `specialistList`). Each task has `id`, `instruction`, `agentId`. **Phased full_dev:** If step 4 says Phase A then Phase B, finish Phase A, call `workflow_step` on **step 4** again with `specialistSequentialComplete: true` and partial `taskResults`, then run Phase B tasks in parallel; merge all summaries before step 5.
- **Merge sub-phase (full_dev step 5):** When **`workflowPhase: "merge"`** appears with two or more specialists and full `taskResults`, complete merge/build checks, then call **`workflow_step("full_dev", 5, { ...state, mergeComplete: true })`** before the review instruction.
- **Run logging:** Each `workflow_step` appends to `.pncore/workflow-runs.jsonl` with **`runId`**. Set `PNCORE_RUN_LOG=` to disable.
- **Opt-in hard human gates:** Set MCP env `PNCORE_REQUIRE_APPROVAL_FOR_WORKFLOWS` (comma-separated workflow types, e.g. `full_dev`). Human-gate steps then require `approval_checkpoint` with `workflow_type` + `workflow_step` and passing `pncoreHumanGateTicket` in state. See MCP README and `workflow-state-schema.md`.
- **Gate audit:** Optional `gate_log_append` appends to `.pncore/gate-log.jsonl` for outcomes at gates.
