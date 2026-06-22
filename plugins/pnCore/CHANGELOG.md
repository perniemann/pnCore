# Changelog

## [Unreleased]

## [0.14.6] - 2026-06-16

### Added

- **`pn-prompt-optimize` command:** canonical `content/commands/pn-prompt-optimize.md` now exists (previously documented in the changelog but missing on disk); visible `/pn-prompt-optimize` palette entry that drives the `prompt_optimize` workflow / `pn-prompt-optimize` skill.
- **`prompt-provider-knobs.md` reference** (`pn-core://reference/prompt-provider-knobs.md`): model-specific prompting knobs (OpenAI `reasoning.effort`, Anthropic adaptive thinking, Gemini `thinking_level`) for `pn-prompt-optimize`; registered in `content.ts` `resourceDefs`.

### Changed

- **`pn-prompt-optimize` skill:** defined the previously-undefined **4-Block layout** (Role and goal / Context and inputs / Instructions and constraints / Output contract) referenced by the `prompt_optimize` workflow; added questionnaire **§8 Loop / harness design** (stop condition, iteration cap, verifier, error handling, memory, eval plan) for agent and tool-using prompts; linked `pn-context-engineering` and the provider-knobs reference.
- **`best-practices.md`:** new **§10 Prompt → Context → Loop** — the 2026 three-layer stack (prompt / context / loop), "loops in code, prompts in content," prompts-as-versioned-code, maker ≠ checker, bounded loops, and the behavioral-eval gap.
- **`DECISION_LOGIC.md`:** clarified the dangling "severity 3 → loop builder fixes" line to reference the real mechanism (`pn-review-optimize-loop`, escalating to `pn-loop`).
- **Learning friction reductions:** `/pn-retro` now offers `pn-continual-learning` immediately after findings; `CONTINUAL_LEARNING_TRIAL_MODE` documented in `agents-md-guide.md`; `install-to-project.mjs` verifies hooks and prints Windows hook reliability notice; `pn-review`, `pn-deliver`, `pn-strategy` gain explicit `When to use` carve-out rows for off-contract invocations; `pn-build-gate.mdc` gains a gitignored-sibling-repo search rule.

## [0.14.5] - 2026-06-04

### Added

- **SkillSpector gate:** `scripts/validate-skill-security.mjs` and `npm run validate:skill-security` (static `block_dni`; requires `pip install skillspector` or `SKILLSPECTOR_SKIP=1`). Triage policy: `pn-writing-skills` § SkillSpector hygiene.
- **`pn-review-optimize-loop`:** Health-regression Blocker (complexity displacement, net duplication from the PR, thin wrappers without a named seam, large-file growth without deletion or carry-forward note); appeal path and 3-attempt cap aligned with `pn-skeptic-challenge`. `pn-legacy-modernizer` cross-references the canonical paragraph.
- **PStack adoption review:** Cursor official plugin stack (PStack); skeptic revisions applied in-tree (doc removed in pnCore debloat).

### Changed

- **Skill hygiene:** 13 skills reworded so SkillSpector static scan reports SAFE (166/166); `pn-writing-skills` points to triage doc instead of inlining trigger patterns.
- **CONTRIBUTING.md:** Skill security scan step after skill edits.
- **Dependencies:** `actions/checkout` v6.0.2 (pinned SHA); root and `packages/pn-core-mcp` devDependency minor-patch group bumps.

## [0.14.4] - 2026-05-20

### Added

- **Skeptic gate audit trail:** `workflow_confirm` extended with `gate_type`, `verdict`, Goodhart guard, and append to `.pncore/gate-log.jsonl` via `gate_log_append`. `/pn-skeptic` and `pn-skeptic-challenge` mandate structured gates (`AskQuestion` or `workflow_confirm`); free-text-only "Reply yes" endings are forbidden. Optional strict skeptic state checks via `PNCORE_FEATURES`; validators `validate-skeptic-gates.mjs` and `npm run report:gates` for transcript compliance. See `reference/conventions.md` (Skeptic gate), `reference/DECISION_LOGIC.md`.

### Changed

- **`fsi_analyst_draft` workflow dedupe:** Steps 1–4 now carry an explicit `Do NOT call get_skill('pn-fsi-analyst-discipline')` prohibition (skill loads once at step 0). Static estimate: ~6,000 input tokens saved per run. Live confirmation pending — measure with `npm run measure-tokens`.
- **`pn-budget-cost-monitor`:** Tool output hygiene ordering — collapse/truncate first, LLM-summarize only on overflow, never re-paste tool results. Provider prompt cache guidance — stable prefix (rules, skills, tool schemas) first; volatile tail (chat, tool results) last.

### Fixed

- **`workflow-gate-log` path check on Linux:** Gate log append uses the same `normalizedBase` + separator prefix check as `resolveSafePath`; tests use POSIX traversal paths so CI does not treat backslashes as literals.

## [0.14.3] - 2026-05-17

### Changed

- **Slash palette consolidation (v1):** The Cursor `/pn-…` palette is now ~21 user-entry commands. **17 surgical commands** were demoted via frontmatter `slash: false` and are no longer copied into `plugins/pnCore/.cursor/commands/`. They remain canonical in `packages/pn-core-mcp/content/commands/` and are fully reachable via `get_command("<id>")`, MCP prompts, and as substeps of the visible umbrellas. Rationale: COMMAND-MISMATCH evidence #1 (slash palette consolidation); see `pn-build-gate` § Command-contract acknowledgement.
- **`pn-build-gate` rule:** added § **Command-contract acknowledgement** — agents must name a `/pn-*` ↔ user-ask mismatch in their first response before re-routing. Same bullet added to `AGENTS.md`.
- **Sync + validate:** new shared helper [`scripts/command-slash-filter.mjs`](../../scripts/command-slash-filter.mjs) drives both `sync-content-to-plugin.mjs` (filters demoted files) and `check-content-plugin-sync.mjs` (skips them during parity check). `validate-plugin-lib.mjs` enforces a soft cap of 21 visible commands (hard cap 25).
- **`content.ts`:** `slash` added to `KNOWN_FRONTMATTER_KEYS`.

**Migration:** if you were typing the slash form, switch to `get_command("<id>")` or the umbrella; the markdown content is unchanged.

| Old slash form | Replacement |
|---|---|
| `/pn-audit-typography`, `/pn-audit-layout`, `/pn-audit-design-tokens`, `/pn-audit-a11y`, `/pn-audit-performance-fe` | `/pn-frontend-audit` (chains all five) or `get_command("pn-audit-typography")` etc. |
| `/pn-audit-api`, `/pn-audit-security`, `/pn-audit-data`, `/pn-audit-errors`, `/pn-audit-performance` | `/pn-backend-audit` (chains all five) or `get_command("pn-audit-api")` etc. |
| `/pn-typeset`, `/pn-colorize`, `/pn-arrange` | `/pn-design` (Typography / Color / Layout substeps), or `/pn-visual-tweak`, or `get_command("pn-typeset")` etc. |
| `/pn-bolder`, `/pn-quieter`, `/pn-delight`, `/pn-distill` | `/pn-visual-tweak` or `/pn-polish`, or `get_command("pn-bolder")` etc. |

## [0.14.2] - 2026-05-17

### Added

- **`suggest_model_tier` MCP tool** and **`suggestedModelTier`** on `workflow_step` results, with a one-line markdown hint when the tier is non-default; centralized model tier vocabulary (`fast`, `standard`, `premium`, `premium_thinking`) and exemplars in `model-tiers.ts`; `PNCORE_FEATURES.modelTierOverrides` (per-step) and `tierAliases` (global remap, e.g. accounts without MAX Mode).
- **`feature_program` workflow (preview):** behind `featureProgram`; `/pn-program` for multi-slice hierarchical orchestration (discovery → decomposition/contracts → parallel worktrees → verifier/merge → program review); skills `pn-program-orchestration`, `pn-slice-contracts`; reference `program-decomposition.md`; ADR `docs/adr/0001-feature-program-workflow.md`. `pn-build` / `pn-new` route when ≥2 vertical slices and the flag is on; single-slice programs redirect to `/pn-build`.
- **`pn-session-retro` v1** and **`/pn-retro`:** manual session retros with blameless reports under `docs/refs/retros/`; v2 exit criteria documented in the skill (stop-hook auto-trigger deferred).
- **`docs/refs/retros/`:** README and `_template.md`.

### Changed

- **Visual indicator:** `[pn-command] 🔺` on every assistant response touched by pnCore (red triangle emoji); `pn-visual-indicator.mdc` and `pn-indicator-styling.md` updated; `pn-new` / `pn-setup` generated project rules aligned.
- **`pn-grill`:** orchestrator-only `parallel-objects` mode when multiple objects run in sequence (one load-bearing question per object per round).
- **`pn-business-strategy-orchestration`:** mechanical gates — surviving angles need ≥1 `kind: skeptic` evidence before delivery; step 7 defaults to `audit` when no market-data MCP companion; honesty contract expanded.
- **`/pn-strategy` and AGENTS.md:** camelCase `workflowType` / `step`; orchestration-skill-only fallback for stale MCP installs documented.
- **AGENTS.md:** disambiguates delivery tier, context tier, and model tier.
- **CONTRIBUTING.md:** session retros section linking `pn-session-retro` and ADR-0002.

## [0.14.1] - 2026-05-15

### Added

- **`business_strategy` workflow (9 steps):** Evidence-led strategy flow — intake → prior-art research → grill → evidence logging → pressure-test routing (Strong / Weak / Pivot) → conditional skeptic → verdict lock → HTML + markdown delivery (`docs/strategy/<slug>.html` + `.md`). Invoke via `workflow_step("business_strategy", 0, {})`.
- **`media_director` workflow (7 steps, opt-in):** Gated generative-media flow for campaigns, film, and ComfyUI/T2V pipelines. Steps: intent → adaptive grill → creative brief (`docs/media/<slug>-brief.md`) → plan + pipeline + skeptic → produce → human review → delivery. Grill fires on blank, <10-char, single-word, or contradictory inputs; `grillTopics: false` bypasses with an audit log entry. Invoke via `workflow_step("media_director", 0, {})`.
- **9 public agents:** `pn-backend-developer` (APIs, DB, auth, Stripe/webhooks), `pn-cultural-researcher` (art history, provenance, museum citations; uses `pn-cultural-heritage-research`), `pn-frontend-developer` (UI, layout, a11y, React/Astro/Next/vanilla), `pn-mobile-builder` (native iOS/Android, React Native, Flutter), `pn-skeptic` (single-pass plan challenge — for interactive dialogue use `pn-grill`), `pn-testing-specialist` (TDD, smoke/e2e, CI triage; works with `pn-reviewer` as final gate), `pn-visionos-engineer` (spatial UI, SwiftUI volumetrics, Liquid Glass, RealityKit), `pn-webxr-developer` (WebXR, Three.js / A-Frame / Babylon, cross-device), `pn-generative-media-director` (updated: text-to-image/video, ComfyUI JSON, cinematographic direction, reproducibility).
- **6 internal agents:** `pn-assets-manager` (SVG/raster/logos/placeholders, asset taxonomy for UI builds), `pn-game-developer` (Three.js/Babylon/Godot/Unity scenes, shaders, game loop), `pn-project-builder` (full orchestration: discovery → prior art → plan → skeptic → specialists per `config/specialists.json` → review), `pn-reviewer` (quality gate + verification; final pass before `pn-testing-specialist`), `pn-scaffolder` (new plugin or web app from discovery; runs post-scaffold review), `pn-security-auditor` (OWASP-style pass, secrets, deps, input validation, auth — dedicated audits only).
- **36 `.cursor/commands/`:** Design-surgery cluster (`pn-arrange`, `pn-bolder`, `pn-colorize`, `pn-delight`, `pn-distill`, `pn-polish`, `pn-quieter`, `pn-typeset`, `pn-visual-tweak`); audit family (`pn-audit-a11y`, `pn-audit-api`, `pn-audit-data`, `pn-audit-design-tokens`, `pn-audit-errors`, `pn-audit-layout`, `pn-audit-performance`, `pn-audit-performance-fe`, `pn-audit-security`, `pn-audit-typography`, `pn-backend-audit`, `pn-frontend-audit`); workflow entry-points (`pn-assets`, `pn-build`, `pn-deliver`, `pn-design`, `pn-design-dna`, `pn-design-variants`, `pn-document`, `pn-grill`, `pn-guide`, `pn-new`, `pn-pressure-test`, `pn-review`, `pn-setup`, `pn-strategy`, `pn-video-lint`).
- **32 `.mdc` rules:** Aesthetics (`pn-aesthetics-baseline`), agent authoring (`pn-agents-md`), stacks (`pn-astro`, `pn-babylon`, `pn-blender`, `pn-go-backend`, `pn-godot`, `pn-nextjs`, `pn-node-backend`, `pn-php-backend`, `pn-python-backend`, `pn-react`, `pn-ruby-backend`, `pn-rust-backend`, `pn-three-game`, `pn-unreal`, `pn-unreal-python`, `pn-vanilla-web`), gates (`pn-build-gate`, `pn-discovery-gate`, `pn-plugin-quality-gates`), integrations (`pn-ci`, `pn-figma`, `pn-mcp-proactive`, `pn-n8n`), tooling (`pn-current-date`, `pn-design-system`, `pn-no-cursor-commit-trailers`, `pn-shader`, `pn-tool-risk-policy`, `pn-visual-indicator`, `pn-web3-security`).
- **`config/stacks.json`:** Stack → rule/scaffold/agent routing map covering plugin, three, godot, unity, react, next, astro, vanilla, node, python, go, rust, ruby, php, and babylon.
- **`config/specialists.json`:** Specialist roster with `optInOnly` map, `onDemandAgents` (mobile, visionOS, WebXR, cultural, security), `parallelGroups` (numeric execution groups for parallel specialist phases), and `scaffolds` (stack → scaffold skill).
- **`hooks/hooks.json`:** Stop hook running `plugins/pnCore/scripts/pn-continual-learning-stop.mjs` on session end.
- **Reference docs:** `DECISION_LOGIC.md` (skeptic intensity matrix — strict/standard/light by risk/domain/scope; review-family routing table), `FLOW.md` (end-to-end `pn-build` pipeline: kickoff → discovery → prior art → plan → skeptic → specialists → review+optimize → skeptic-on-output → summary; subagent/`parallelGroup` notes for Cursor 2.5+), `delivery-tier-criteria.md` (MVP vs Full verification matrix: functionality, assets, tests, polish, a11y/perf, docs), `embedded-studio-dna.md`, `best-practices.md`, `conventions.md`, `parallel-rules.md`, `aesthetics-baseline.md`, and contract schemas (`builder`, `delivery_pack`, `fix_tasks`, `orchestrator`, `skeptic`, `verifier`).
- **Docs:** `docs/starting-new-project.md` (new project → `project_kickoff` → `docs/refs/` → `full_dev` / `design` sequence), `docs/templates/pncore-design.example.md`, `docs/reference/discovery-and-plan-format.md`, `docs/pn-indicator-styling.md`, `docs/agents-md-guide.md` (AGENTS.md vs rules vs skills routing guide), `reference/workflow-runs-schema.md`.
- **`specialists.json` `optInOnly` map:** Agents listed here remain enumerable in `specialists[]` but are not auto-included by orchestrators. Currently lists `pn-generative-media-director`.

### Changed

- **`full_dev` generative-media gate:** Step 0 captures `includeGenerativeMedia` from a pinned discovery question ("Does this run involve generative media beyond standard UI placeholders — campaigns, film, ComfyUI/T2V pipelines?"). Step 3 includes `pn-generative-media-director` only when `state.includeGenerativeMedia === true`; step 4 hands off to `workflow_step("media_director", 0, {})` when the specialist is active. **Breaking:** runs relying on implicit prompt sniffing will stop including the specialist — set `includeGenerativeMedia: true` to restore.

## [0.14.0] - 2026-05-15

### Added

- **`engine_feature` workflow:** New workflow type that unifies `unreal_feature` and `godot_feature` behind a single entry point. Pass `state.engine: 'unreal'|'godot'` when calling `workflow_step("engine_feature", 0, { engine: "unreal"|"godot" })`. Old types remain as 2-release deprecation aliases — they still work and emit a visible deprecation note in the instruction.
- **5 frontend surgical audit commands** (`pn-audit-typography`, `pn-audit-layout`, `pn-audit-a11y`, `pn-audit-performance-fe`, `pn-audit-design-tokens`) — mirror the backend `pn-audit-*` pattern. `pn-frontend-audit` and the `frontend_audit` workflow now chain all five.
- **`scripts/validate-skill-schema.mjs`:** Schema validator for all SKILL.md files. Errors on missing `name`, `description`, or `## When to use`; accepts any instruction-section alias (`## Instructions` / `## Workflow` / `## Approach` / `## Overview` / `## Usage`); warns on missing optional sections for ci/review/orchestration/discipline categories. Wired into `npm run validate`.
- **T0 measurement baselines:** retrieval eval harness and per-step token capture methodology (regenerate with `npm run measure-tokens` / `npm run bench:write`). Provides evidence basis for future Tier 2 trim and Tier 3 retrieval fixes.
- **`## When to use` added to 20 skills** previously missing the primary retrieval anchor: `pn-writing-plans`, `pn-ci-fix`, `pn-tdd`, `pn-create-prd`, `pn-job-stories`, `pn-security-audit`, `pn-config-review`, `pn-test-generation`, `pn-continual-learning`, `pn-smoke-tests`, `pn-user-stories`, `pn-pressure-test`, `pn-merge-conflict-fix`, `pn-writing-skills`, `pn-css-styling`, `pn-landing-page`, `pn-create-design-doc`, `pn-release-notes`, `pn-dependency-audit`, `pn-docs-sync`.
- **`## Example prompts` added to 7 creative/visual skills:** `pn-landing-page`, `pn-image-creator`, `pn-typography`, `pn-color-system`, `pn-ui-component-libraries`, `pn-css-styling`, `pn-figma-design-to-code`.
- **`pn-grill`, `pn-design-variants`, `pn-pressure-test` enriched:** All three were ~9-line thin wrappers; each now includes a comparison table (vs. similar commands), input format guidance, expected output, and guardrails.
- **`pn-guide` command:** Command family clusters documented (frontend audit family, backend audit family, design surgery cluster); new surgical audit commands listed; routing table updated.
- **Rule co-activation notes:** `pn-unreal.mdc` and `pn-unreal-python.mdc` document precedence for overlapping Python file globs.

### Changed

- **`full_dev` step 1 gate: `model` → `human`.** The instruction says "after user confirms" — the gate type now matches. Human-gate tickets can attach when `PNCORE_REQUIRE_APPROVAL_FOR_WORKFLOWS` includes `full_dev`.
- **`workflow-state-schema.md` corrected:** `full_dev` table rows 0–4 were off-by-one (each row showed the wrong `requiredFromState` and `State keys produced`). `svg_create` steps 4–5 added (table was truncated at step 3).
- **`workflow_step` annotations:** `readOnlyHint: false`, `idempotentHint: false`. The tool consumes single-use gate tickets and appends to run logs; retries are not benign when approval is required.
- **Paperclip annotations:** `destructiveHint: true` on `paperclip_issue_comment` and `paperclip_issue_update` — both mutate remote state.
- **`get_agent`, `get_command`, `get_rule`:** Handlers now log to `.pncore/skill-load-log.jsonl` with `tool` and optional `run_id` (parity with `get_skill`). The `run_id` arg was previously accepted but ignored.
- **MCP capabilities:** `listChanged: true` removed from `prompts` and `resources` declarations. The server does not watch the filesystem; advertising push notifications it cannot deliver was misleading clients.
- **`fsi_analyst_draft` token economy:** `pn-fsi-analyst-discipline` was loaded at the start of steps 0–4 (5× redundant loads). Now loaded once at step 0; steps 1–4 reference it by name. Estimated saving: ~6,000 input tokens per `fsi_analyst_draft` run.
- **`workflow_state_save`:** Compact JSON output (no `JSON.stringify(state, null, 2)` pretty-print).
- **`backend_audit` security phase (step 2):** `gate: "human"`. Security findings now require human triage before the data/error/performance phases proceed.
- **`game_feature` workflow:** Post-implementation skeptic challenge added as step 3 (human gate). Summary moves to step 4. Workflow is now 5 steps (was 4).
- **`support/pn-financial-analysis`:** Rescoped to product/operational analytics (KPIs, unit economics, A/B test ROI, engineering cost estimates). Redirects to the FSI skill stack for investment-grade or compliance-adjacent work.
- **`pn-node-backend.mdc`:** `**/lib/**` glob removed (too broad; would attach to frontend utility dirs). Replaced with `**/backend/**`.
- **`skills/README.md`:** `## When to use` documented as strictly required for retrieval. Accepted instruction-section aliases (`## Instructions`, `## Workflow`, `## Approach`, `## Overview`, `## Usage`) formally listed as canonical.

### Security

- **`approval-checkpoint.ts`:** Token comparison upgraded from `===` to `crypto.timingSafeEqual`. Length is checked first to prevent short-circuit timing differences on mismatch.
- **`PNCORE_REQUIRE_APPROVAL_FOR_WORKFLOWS` validation:** Unknown workflow type values now emit a debug warning and are dropped rather than silently cast to `WorkflowType`, preventing typos from silently disabling enforcement on intended workflows.

### Performance

- **`PNCORE_SKILL_LOG_SAMPLE_RATE=N`:** New env flag. When set to an integer N > 1, `get_skill` writes 1-in-N entries to `.pncore/skill-load-log.jsonl`. Reduces synchronous `appendFileSync` I/O on high-frequency skill loading.

## [0.13.4] - 2026-05-12

### Added

- **Human-facing workflow artifacts:** MCP resource `pn-core://reference/human-facing-artifacts.md` — when to use HTML vs Cursor canvas vs markdown for exploration, plan packaging, PR/review explainers, and reports; dual digest for orchestrated handoffs. RUNBOOK gains a "Human-facing workflow artifacts" section pointing here. Registered in `packages/pn-core-mcp/src/content.ts`; `content.test.ts` covers `getResource` for the URI.

### Changed

- **Docs:** MCP usage guide, `packages/pn-core-mcp/README.md`, `docs/plugin-reference.md`, and `docs/refs/README.md` list the new resource URI and cross-links.

## [0.13.3] - 2026-05-04

### Added

- **`pn-pressure-test`:** Slash command + skill (`skills/pm/pn-pressure-test/SKILL.md`) for startup idea pressure-testing—Strong / Weak / Pivot, scorecard, fatal flaws, competition-as-current-behavior, first-customer moves, ~2-week MVP slice. Optional depth: `references/playbooks.md`. Distinct from plan stress-tests (`pn-grill`, `pn-skeptic`). Wired in `pn-guide`, `pn-mcp-proactive`, RUNBOOK, `pn-idea-miner` integration; docs updated in repo README and how-to / MCP usage guides.
- **Workflow skills (lifecycle discipline):** `pn-context-engineering` (curate rules/spec/files/error context), `pn-source-driven-implementation` (lockfile versions → official docs → cite), `pn-browser-runtime-verify` (DOM / console / network / perf for browser apps; complements screenshot-oriented `pn-evidence-qa`), `pn-deprecation-and-removal` (API/feature sunset vs `pn-migration-planning` for stack upgrades), `pn-ship-checklist` (composable pre-production gate). `skills/README.md` documents optional rationalization / red-flag / verification sections for gate-style skills.
- **`pn-rag-evaluation`:** Golden sets, automated metrics (RAGAS-style and alternatives), human rubrics, regression gates for RAG pipelines. Integrations category; wired from `pn-cx-agent-patterns`, `pn-prompt-optimize`, `pn-budget-cost-monitor`, and **best-practices** §6.
- **Token / cost story:** `pn-budget-cost-monitor` expanded — billable context components, hidden drivers (tool schemas, duplicated context, RAG top-k, multimodal), `measure-tokens.mjs` baseline, links to `pn-context-engineering` and `pn-rag-evaluation`. **best-practices.md** §6 tightened for metering, budgets, context cost, RAG eval.

### Changed

- **`pn-review-optimize-loop`:** Review comment severity (Blocker / Nit / Optional / FYI), change-size norms, approval bar; optional `pn-browser-runtime-verify` when runtime behavior is in scope.
- **`pn-migration-planning` / `pn-evidence-qa`:** Integration cross-links for the new skills above.

### Security

- **Transitive `ip-address`:** npm `overrides` force `ip-address@10.2.0` at the repo root and in `packages/pn-core-mcp` (addresses GHSA-v2v4-37r5-5v8g via `express-rate-limit` → `@modelcontextprotocol/sdk`).

## [0.13.2] - 2026-04-24

### Added

- **Skill `pn-godot-mcp`:** Compare-and-pick skill for Godot 4.x MCP servers. Side-by-side matrix (Coding-Solo, gdai/3ddelano, ee0pdt, tugcantopaloglu, bradypp), external-CLI vs. live-editor-plugin decision tree, install snippets, tool-name mapping table, and structured `install_plan` output for `godot_feature` step 1.
- **`godot_feature` workflow (MCP):** 5-step deterministic workflow for Godot 4.x feature builds. Step 0 loads `pn-godot-mcp` (server comparison + pick); step 1 runs `pn-api-probe` with Godot 4.x targets (node renames, GDScript API changes, TileMapLayer migration, GDExtension compatibility); step 2 builds via the chosen Godot MCP server; step 3 runs `pn-render-verify` (Godot appendix) + skeptic-on-output with iteration cap. Entry: `workflow_step("godot_feature", 0, {})`.
- **`pn-godot-dev` skill (major expansion):** Rewritten from 68 to ~250 lines. New sections: GDExtension (C++, godot-cpp, `_bind_methods`, hot-reload), multiplayer (ENet/WebRTC, RPCs, MultiplayerSynchronizer/Spawner, lobby pattern), shaders (VisualShader, ShaderMaterial, `set_shader_parameter`, screen-space effects, includes), export and platform config (Android/iOS/Web presets, feature tags, headless export), autoloads and InputMap, Resource serialization (`user://` vs `res://`, duplicate vs. share), physics (CharacterBody3D pattern, collision layers, joints, PhysicsServer3D direct), procedural generation (TileMapLayer, ArrayMesh, FastNoiseLite, MultiMeshInstance3D), headless CI (GUT/gdUnit4, GitHub Actions), and performance (pooling, draw calls, profiler).
- **`pn-godot.mdc` rule (new):** Always-off coding rule (globs: `**/*.gd`, `**/*.tscn`, `**/*.tres`, `**/*.gdshader`, `**/project.godot`, `**/export_presets.cfg`, `**/.gdextension`). Covers GDScript typing, `@onready`/`@export` patterns, signal-over-direct-call, naming conventions, shader style, multiplayer RPC safety, GDExtension registration, and Godot 3→4 migration notes.
- **Godot 4.x section in `pn-api-probe`:** Structured probe targets for renamed/replaced nodes (`Spatial`→`Node3D`, `KinematicBody3D`→`CharacterBody3D`, `TileMap`→`TileMapLayer`), GDScript API changes (`yield`→`await`, `connect` style, `instance`→`instantiate`), GDExtension vs. GDNative, and physics changes (4.2+ `move_and_slide` signature). Probe query patterns included.
- **Godot appendix in `pn-render-verify`:** Runtime-specific assertion traps for SubViewport vs. game-window capture, shader compilation lag, AnimationPlayer vs. AnimationTree active state, TileMapLayer migration, headless exit codes, physics-driven placement, CanvasLayer z-ordering, and GLTF import scale.
- **Companion catalog:** Added `Coding-Solo/godot-mcp` (~3.2k stars, external CLI) and `3ddelano/gdai-mcp` (live editor plugin, 4.1+) entries to `docs/companion-mcp-catalog.md`.
- **Proactive routing:** Three new rows in `pn-mcp-proactive.mdc` — Godot MCP server selection → `pn-godot-mcp`; Godot development → `pn-godot-dev`; live editor automation → `godot` MCP tools. Companion pairing `godot MCP + pn-godot-dev` added.

## [0.13.1] - 2026-04-24

### Added

- **Companion MCP: ChiR24/Unreal_mcp** — added to `docs/companion-mcp-catalog.md` with install instructions (C++ `MCPBridge` plugin + `mcp.json` snippet). Proactive routing added to `pn-mcp-proactive`: UE MCP server selection → `pn-unreal-mcp`; Unreal development → `pn-unreal-dev`; live editor automation → `unreal-mcp` tools; companion pairing `unreal-mcp + pn-unreal-dev`.
- **Companion MCP: Blender MCP (official, Blender Foundation)** — added to `docs/companion-mcp-catalog.md` with drag-drop add-on install, pip server install, and VM security note (requires Blender 5.1+). Proactive routing added: Blender scripting → `pn-blender-scripting`; live session control → `blender` MCP tools; companion pairing `blender MCP + pn-blender-scripting`.

## [0.11.0] - 2026-04-15

### Added

- **`unreal_feature` workflow (MCP):** 5-step deterministic workflow for UE 5.7 feature builds. Step 0 loads `pn-unreal-mcp` (server comparison + pick); step 1 runs `pn-api-probe` with UE 5.7 targets (Python module, EditorScriptingUtilities, K2Node deprecations) + skeptic-on-plan; step 2 builds via the chosen UE MCP server; step 3 runs `pn-render-verify` (UE 5.7 appendix) + skeptic-on-output with iteration cap (mirrors `design` workflow step 4 pattern). Entry: `workflow_step("unreal_feature", 0, {})`.
- **Skill `pn-unreal-mcp`:** Compare-and-pick skill for UE MCP servers. Side-by-side matrix (ChiR24, remiphilippe, Sallah, kangnam, jim, StraySpark), decision tree by use case, install snippets (npm/pip/go), tool-name mapping table, and structured `install_plan` output.
- **UE 5.7 appendix — `pn-render-verify`:** New "Unreal Engine 5.7" subsection in Runtime-specific assertions covering Lumen GI quality, Nanite eligibility, Blueprint compile state, World Partition streaming, MetaSounds parameter binding, Niagara renderer mode, and PIE-vs-standalone capture traps.
- **UE 5.7 probe targets — `pn-api-probe`:** New "Unreal Engine 5.7" section with structured probe targets for the `unreal` Python module surface, `EditorScriptingUtilities` API drift, and deprecated `K2Node_*` names per 5.7 release notes.
- **Skills `pn-render-verify` and `pn-api-probe`:** Orchestration skills for structured verification of visual artifacts (`verifier.contract.json` shape) and live runtime/API/version probes before planning; referenced from `pn-design` for visual deliverables and stack-sensitive plans.
- **`design` workflow iteration cap (MCP):** `workflow_step("design", 4, state)` when `skepticOutputPassed` is false returns loop-back to step 3 with an instruction to increment `iterationCount`; when `iterationCount >= 2` without `iterationCapApproved`, returns an error requiring `approval_checkpoint` (aligns with the skeptic skillâ€™s 3-failed-attempts rule). Documented in `workflow-state-schema.md`.
- **Skeptic contract:** `skeptic.contract.json` includes optional `visual_evidence[]` (`artifact_path`, `observed`, `read_bytes`). **pn-skeptic-challenge** post-build guidance for visual artifacts requires reading files and emitting `must_fix` entries tied to that contract.

### Changed

- **Node 22:** Minimum engine bumped from `>=20` to `>=22` (Node 20 LTS reached EOL April 2026). `.nvmrc`, CI workflow, `@types/node` updated.
- **Compact JSON responses:** MCP tool responses (`health`, `list_workflow_types`, `list_skills`, `list_agents`, `list_commands`, `list_rules`) use compact JSON instead of pretty-printed, reducing token consumption 15-30% per call.
- **Progressive skill disclosure:** `list_skills` without filters now returns a category index (total count, per-category counts, top-3 skill IDs) instead of all full-list entries (~15x output reduction). Use `category`, `filter`, or `limit` params to drill in; `limit=0` for the full list.
- **Conditional Paperclip hint:** Terminal workflow step instructions only include the Paperclip reminder when `PAPERCLIP_API_URL` and `PAPERCLIP_API_KEY` are configured, saving ~86 tokens per step for non-Paperclip users.

## [0.10.0] - 2026-04-07

### Changed

- **Reference:** `best-practice-2026-03.md` renamed to **`best-practices.md`** (not calendar-versioned). MCP resource `pn-core://reference/best-practices.md`; legacy URI `pn-core://reference/best-practice-2026-03.md` still resolves to the same file.
- **MCP `health`:** Response includes **`calendarDateUtc`** (YYYY-MM-DD) and **`timestampUtc`** (ISO-8601) for server clock in UTCâ€”use when dating changelogs or â€œas ofâ€ lines.
- **Rule `pn-current-date`:** Always-on guidance to prefer `health` for current date when MCP is connected; otherwise user/environment date or ask once.

## [0.9.0] - 2026-03-30

### Changed

- **Documentation:** User-facing READMEs and `docs/` guides aligned with shipped commands and MCP workflows; prose tightened. Prior 0.8.8â€“0.8.9 notes below corrected where they misnamed audit commands or implied separate `pn-teach-*` commands (stack/design context is **`pn-setup`** options (3) and (4)).

## [0.8.9] - 2026-03-27

### Fixed

- **Docs vs MCP engine:** Guides, `FLOW.md`, `RUNBOOK.md`, `starting-new-project.md`, `pn-new`, and related skills match **`workflow_step("project_kickoff")`** (8 steps, outputs under `docs/refs/`, index `docs/refs/README.md`). Plan and `docs/WORKFLOW.md` follow in **`full_dev`** / **`pn-writing-plans`**. **`docs/mcp-usage-guide.md`** and **`docs/how-to-use-guide.md`** workflow tables match **`list_workflow_types`**.

### Added

- **Backend reference layer:** `skills/backend/reference/` â€” `api-design.md`, `database-patterns.md`, `security-patterns.md`, `error-handling.md` (REST/schema/security/error patterns and named anti-patterns).
- **`pn-setup` stack context (option 4):** Writes `.pncore-stack.md`; backend audit commands read it first.
- **Surgical backend commands** (standalone or under `pn-backend-audit`): `pn-audit-api`, `pn-audit-security`, `pn-audit-data`, `pn-audit-errors`, `pn-audit-perf`.
- **`backend_audit` MCP workflow:** Seven steps (0 stack/scope â†’ five audit phases â†’ scorecard / `docs/audits/`).

### Changed

- **Backend skills expanded:** `pn-backend-architecture`, `pn-backend-scaffolding`, `pn-node-api`, and language scaffolds (Python, Go, Rust, Ruby, PHP) â€” deeper structure, examples, links to the four reference files.
- **Backend stack rules (`.mdc`):** Node, Python, Go, Ruby, Rust, PHP backend rules expanded with patterns and anti-patterns.
- **`pn-full-dev-loop`:** Review step includes backend quality substeps when scope includes backend: `pn-audit-security`, `pn-audit-errors`, `pn-audit-api`.

## [0.8.8] - 2026-03-27

### Added

- **Frontend reference layer:** `skills/frontend/reference/` â€” `color-and-contrast.md`, `typography.md`, `spatial-design.md`, `interaction-design.md`, `responsive-design.md`, `ux-writing.md` (linked from frontend skills).
- **`pn-color-system` skill:** OKLCH-first color tokens, dark mode, anti-patterns; links `reference/color-and-contrast.md`.
- **`pn-setup` design context (option 3):** Writes `.pncore-design.md`; design flows and skills read it first.
- **Surgical design commands:** `pn-typeset`, `pn-colorize`, `pn-arrange`, `pn-polish`, `pn-bolder`, `pn-quieter`, `pn-delight`, `pn-distill`.
- **Named anti-patterns catalog** in `pn-frontend-design-philosophy/reference.md` (13 AI UI fingerprints).
- **AI Slop Test** in `pn-frontend-design/SKILL.md`.

### Changed

- **pn-design-loop:** Respects `.pncore-design.md` before discovery; build step runs `pn-typeset` â†’ `pn-colorize` â†’ `pn-arrange`. Related: `pn-color-system`, `pn-typeset`, `pn-colorize`, `pn-arrange`.
- **pn-frontend-audit:** Fix roadmap maps categories to surgical commands; references the anti-pattern catalog.
- **pn-visual-tweak:** Routing table delegates to surgical commands and reference files.
- **pn-typography, pn-grid-systems, pn-css-styling, pn-ux-patterns:** Links to new reference files; expanded output/anti-patterns.
- **pn-frontend-design:** `.pncore-design.md` protocol; AI Slop Test checklist.
- **pn-color-system, pn-typography:** Recommend **`pn-setup`** (design context) if `.pncore-design.md` is missing.
- **pn-react.mdc, pn-nextjs.mdc, pn-design-system.mdc:** Expanded architecture, performance, a11y, and token guidance.

## [0.8.7] - 2026-03-17

### Added

- **pn-create-workflow-roadmap skill:** Generates `docs/WORKFLOW.md` after plan completion â€” maps phases to pn-core commands with model tier recommendations and per-step token cost estimates.
- **WORKFLOW document format:** Added to pn-documentation with full template (header, model guide, per-phase breakdown, session management, cost summary) and token cost reference table for 18 skills.

### Changed

- **Docs layout (intended for some flows):** Changelog originally described moving all project docs to flat `docs/` root and expanding **`project_kickoff`** to 10 steps. **The MCP `workflow_step("project_kickoff")` implementation retained 8 steps and `docs/refs/` paths** until a later release; documentation is now aligned with the engine (see **Fixed** under 0.8.9).
- **pn-writing-plans:** Execution handoff triggers pn-create-workflow-roadmap after plan save (produces **`docs/WORKFLOW.md`** outside `project_kickoff`).

## [0.8.6] - 2026-03-15

### Added

- **pn-animation skill:** GSAP timelines and scroll choreography, Motion (React) declarative animations, CSS keyframes, motion role taxonomy (Reveal/Orient/Confirm/Delight), motion tokens, prefers-reduced-motion patterns, per-page-mode budgets, and motion map output format.
- **14 new skills:** pn-database-migrations (Prisma/Drizzle, zero-downtime expand/contract), pn-openapi-design (OpenAPI 3.1, contract-first, zod-to-openapi), pn-graphql (schema, resolvers, DataLoader, Federation), pn-auth-patterns (JWT rotation, OAuth2 PKCE, NextAuth v5, Clerk, Supabase Auth), pn-caching (Redis, HTTP cache headers, Next.js fetch, SWR), pn-observability (OpenTelemetry, Pino, Sentry, health checks), pn-rate-limiting (sliding window, Upstash, 429 responses), pn-i18n (next-intl, react-i18next, ICU, RTL), pn-seo (meta, OG, JSON-LD, sitemap, Core Web Vitals), pn-docker (multi-stage builds, non-root, Trivy), pn-monorepo (Turborepo/Nx/pnpm workspaces, changesets), pn-testing-strategy (testing pyramid, Vitest/Playwright/MSW, contract testing), pn-supabase (RLS, realtime, Edge Functions, storage, auth helpers), pn-a11y-audit (axe-core, WCAG 2.2 AA, screen-reader testing).
- **Mobile and XR sections:** Added to `best-practice-2026-03.md` (iOS/Android native considerations, WebXR frame targets).
- **Playwright and Figma routing:** Added to `pn-mcp-proactive`; smoke-tests skill gains Playwright MCP block.

### Changed

- **pn-discovery-questionnaire:** Compact mode gains ref pre-read step (extract known answers from PRD/design refs before asking); one-section-at-a-time batching rule; session resume via `workflow_state_load`/`workflow_state_save`.
- **pn-init:** Involved step 6 references discovery spec instead of re-asking design questions.
- **pn-full-dev-loop:** Step 5.5 post-parallel merge check (pn-merge-conflict-fix) added before review.
- **pn-writing-plans:** Parallel Phase Conflict Rules â€” shared-file ownership table, parallel boundaries notation, mandatory post-parallel merge phase.
- **pn-mcp-proactive:** Prefer `workflow_step('full_dev')` when MCP available; fall back to pn-full-dev-loop command when MCP unavailable.
- **pn-reviewer:** Adds pn-orchestration-philosophy Red Flag Checklist.
- **3D/engine audit:** pn-unreal-dev (Motion Design UE 5.4+, MetaSounds, Niagara); pn-blender-scripting (Geometry Nodes); pn-babylon-dev (WebXR, NodeMaterial); pn-spatial-ux-patterns expanded with depth layers, ergonomic angles, interaction zones, text legibility tables; pn-gamedev-philosophy updated to device-native refresh rate (60/90/120Hz).
- **pn-astro:** Content collections, view transitions, server actions.
- **pn-reality-check:** Added scoring rubric (C+/B-/B/B+/A).

### Fixed

- **MCP error responses:** `isError: true` added to all 14 MCP tool error paths.
- **INP:** Added INP â‰¤200ms to pn-nextjs rule.
- **WebXR frame rate:** Corrected target from 60fps to 90/120fps in relevant skills and best-practice doc.
- **FLOW.md:** Mermaid cross-subgraph ID collisions, dead reference, step sync with current workflow.

## [0.8.4] - 2026-03-10

### Changed

- **Docs validation:** Added project_kickoff to MCP README workflow_step list; consolidated pitch-to-app example into docs/pitch-to-app-example.md.
- **README:** Removed homeworki references (generic placeholder examples); removed git attribution line.

## [0.8.3] - 2026-03-10

### Added

- **Optional refs in project kickoff:** pn-create-stack-doc (STACK.md), pn-create-mcp-architecture (MCP-ARCHITECTURE.md), pn-ui-design-specs output to UI-DESIGN-SPEC.md when applicable. New step 5 in project_kickoff; refs index includes STACK, MCP-ARCHITECTURE, UI-DESIGN-SPEC.

### Changed

- **project_kickoff:** 8 steps (0â€“7); optional refs step between prior art and refs index.
- **pn-create-refs-index, pn-documentation:** Added STACK.md, MCP-ARCHITECTURE.md, UI-DESIGN-SPEC.md paths.
- **pn-mcp-proactive:** Registered pn-create-stack-doc, pn-create-mcp-architecture.

## [0.8.25] - 2026-03-10

### Added

- **Industry standards 2026:** Five new skills â€” pn-budget-cost-monitor, pn-risk-monitor, pn-tooling-mcp-maintenance, pn-workflow-reporter, pn-idea-miner.
- **3 failed attempts rule:** Added to pn-skeptic-challenge and pn-build-gate; stop and request human input after 3+ failures at same step.
- **INP (Interaction to Next Paint):** Added to pn-react-next-perf and pn-frontend-design-philosophy; Core Web Vitals INP â‰¤200ms.
- **Cost Control (optional):** New section in best-practice-2026-03 for token/API budget tracking with pn-budget-cost-monitor.

### Changed

- **pn-mcp-proactive:** Registered all 5 new skills in mapping table.

## [0.8.2] - 2026-03-06

### Added

- **Workflow run logging:** Each successful `workflow_step` call appends one JSON line to `.pncore/workflow-runs.jsonl`. Entry fields: ts, workflowType, step, nextStep, gate, done, stateKeys. Path configurable via `PNCORE_RUN_LOG`; set empty to disable. See `workflow-runs-schema.md`.

### Changed

- **MCP README:** Corrected content/sync direction (content is canonical; sync copies to plugin). Removed incorrect "Build copies" and "Do not edit content/" guidance.
- **mcp-usage-guide:** Renamed "What the plugin is" to "What pn-core MCP is" for clarity.
- **Docs:** Reduced slop phrases (ensure â†’ verify/check) and Best practices redundancy in how-to-use-guide.

## [0.8.0] - 2026-03-06

### Added

- **PM skills:** pn-create-prd, pn-user-stories, pn-job-stories, pn-release-notes for PRD and backlog flows.
- **MCP smoke test:** health tool test via StdioClientTransport.

### Changed

- **2026-03 standards audit:** Path validation, CI hardening, ESLint/Prettier, TS flags, .nvmrc.
- **Dependabot/GitHub:** Pin workflow actions to SHAs; MCP SDK 1.27.1.
- **Security Audit Necessity Review:** Applied simplifications.

### Fixed

- **Vitest 4:** Upgrade to resolve npm ci peer dependency conflict.
- **docs:** Correct 404 links in companion-mcp-catalog.

## [0.7.1] - 2026-03-03

### Changed

- **pn-init redesign:** Strict first questionnaire: (1) references yes/no with optional analysis (prior-art / design / both), (2) intent (full auto | design focused | involved). Context-dependent flow per intent. Progress indicators, uncertainty rule, references fallback, success criteria for full auto. 2026 compliance.

### Added

- **How-to-use guide:** docs/how-to-use-guide.md with example prompts by category. README "How to use" section with ~20 prompts. Pitch-to-app example (questionnaire, skeptic, design aligned, Supabase + Stripe) in plugin and MCP READMEs.
- **2026 compliance:** pn-init and pitch-to-app prompts aligned with prompt-engineering and onboarding UX standards (uncertainty rule, no guessing, success criteria, progress indicators).

## [0.7.0] - 2026-03-03

### Added

- **Version single source of truth:** Root package.json is canonical. sync-version.mjs now syncs to root .cursor-plugin/plugin.json; sync:version script added. validate-version.mjs checks consistency across all manifests and README.
- **2026 best practices:** Node >=20, MCP SDK ^1.27.0, OWASP Top 10:2025, Secure by Design and Agentic Applications 2026 refs, source-tiers compliance (discovery, n8n, backend, payment), MCP Deployment note.
- **Plugin/MCP audit fixes:** plugin-reference (source of truth, 10 agents, full skills, commands), mcp-usage-guide (14 tools, resources, counts), verifier/builder/fix_tasks in resourceDefs, agents-md-guide sync to docs/, godot/unity in stacks.json.

### Changed

- **pn-frontend-design-philosophy:** Added "Responsive and touch-first" principle, G) Responsive + Touch Rules (Do/Don't), updated Final Principle. Reference: Phase 3/6 responsive/touch checks; Red Flag additions (hover-only, touch targets, 320px scroll, zoom).
- **pn-ux-patterns:** New "Touch and responsive (WCAG 2.2)" sectionâ€”touch targets 44Ã—48px, hover alternatives, reflow, zoom, pointer gestures.
- **pn-react, pn-vanilla-web rules:** Added responsive/touch bullet (touch targets, no hover-only, zoom).
- **pn-landing-page, pn-grid-systems:** Touch-only testing; pointer: coarse for touch targets.
- **pn-n8n rule:** Added node choice, Error Trigger, retries with idempotency, version control; subflows â†’ Execute Sub-workflow.
- **pn-n8n-patterns skill:** Expanded with retries/idempotency, modular design (sub-workflows 5â€“10 nodes), observability, version control, webhook HMAC validation, production workflow pattern; references pn-backend-philosophy.
- **New skill:** pn-backend-philosophy â€” Authoritative backend rulebook. Resources over RPC, errors at boundaries, secrets never in code, defense in depth, document contracts, thin handlers. Aligns with OWASP, REST, idempotency, secrets management (2025+). Reference: workflow, templates, red flags.
- **New skill:** pn-gamedev-philosophy â€” Authoritative game/real-time 3D rulebook. Fixed timestep for physics, frame budget, disposal before allocation, explicit update order, hierarchy carries intent, state machines over flags. Aligns with Three.js disposal, LOD, performance practices (2025+). Reference: workflow, templates, red flags.
- **New skill:** pn-discipline-philosophy â€” Engineering discipline rulebook. Test before production code, root cause before fix, minimal change, evidence over assumption, plan before code, verify before claim. Unifies TDD, systematic debugging, RCA (2025+). Reference: workflow, templates, red flags.
- **New skill:** pn-orchestration-philosophy â€” Orchestration rulebook. Scope before build, prior art before invent, plan before code, confirm before proceed, zero-context handoff. Aligns with requirements elicitation, WBS (2025+). Reference: workflow, templates, red flags.
- **skills/README.md:** Added philosophy skills to category descriptions.

## [0.6.23] - 2026-02-24

### Added

- **New command:** pn-svg-creator â€” Questionnaire-driven SVG creation. Asks purpose, identity, style, animation, colors, size, constraints; gates on user confirmation; generates production SVG. Reference: assets/pn-logo.svg quality.

- **New skill:** pn-svg-creator â€” SVG-specific questionnaire and generation instructions. Uses pn-svg patterns, layering, SMIL animation, a11y. Output: spec at docs/svg/, SVG at assets/.
- **README:** Added pn-svg-creator to Commands and frontend skills.

## [0.6.22] - 2026-02-10

### Added

- **Skills:** Grouped into subdirectories: `frontend/`, `backend/`, `ci/`, `review/`, `gamedev/`, `orchestration/`, `plugin/`, `discipline/`, `integrations/`, `learning/`.
- **skills/README.md:** Documents category structure and how to add skills.

## [0.6.21] - 2026-01-27

- **README:** Added "Supported stacks" section clarifying frontend/backend/3D scope and what is not supported (Vue, Svelte, Python, etc.).
- **README:** Documented Node.js requirement for the continual-learning stop hook.
- **README:** Added maintenance notes for specialists (config/specialists.json), stacks (config/stacks.json), and optional skills grouping.
- **config/specialists.json:** Single source of truth for specialist agents and scaffold mappings. pn-orchestrator, pn-full-dev-loop, pn-init, pn-scaffolding reference this file.
- **config/stacks.json:** Stack manifest for extensibility; defines stack â†’ rule, scaffold, agent mappings. pn-discovery-questionnaire and pn-scaffolding reference for stack routing.

## [0.6.20] - 2026-01-13

- **New skill:** pn-copywriter â€” Brand-agnostic copy style system. Diagnose brand (ICP, offer maturity, positioning, price-tier); build style fingerprint (voice, tone sliders, lexicon); rhythm/formatting; offer and proof structure; conversion and CTA. Operating modes: strict mimic / adapted mimic / evolved style. Hard safety rules: no invented metrics, no overclaim, no copied phrasing.
- **pn-copywriter audit:** Added workflow (6-step order), input guidance, tone slider rubric (1â€“3), claim-safe definition, example ICP output, pn-landing-page cross-reference, mode declaration before rewrite.
- **pn-frontend:** Added pn-copywriter for landing pages, hero copy, CTAs.

## [0.6.19] - 2025-12-30

- **New skill:** pn-prompt-optimize â€” Turn goal + constraints into optimized prompt. Output: prompt block, notes, usage. Does not execute the task in the prompt.
- **New command:** pn-prompt-optimize â€” Invoke optimizer via `/pn-prompt-optimize`; user supplies prompt or goal.

## [0.6.18] - 2025-12-16

- **New skill:** pn-ci-dev-prod-split â€” Separate deploy-dev (auto on push) and deploy-prod (manual only). Adapts to FTP, Vercel, Netlify, Cloudflare. Use when scaffolding CI or refactoring merged workflows.
- **pn-ci rule:** Added dev/prod split bullet; reference pn-ci-dev-prod-split when scaffolding deploy workflows.
- **pn-ci-triage:** Recommend pn-ci-dev-prod-split when user asks for dev/prod or staging vs production CI.

## [0.6.17] - 2025-12-02

- **New skill:** pn-prior-art-research â€” Search GitHub, npm, boilerplates for existing solutions before scaffold or build. Includes design (component libraries, design systems), motion (Framer Motion, GSAP), and 3D (Three.js, R3F) when relevant. Evaluate candidates; recommend adapt vs build-from-scratch with justification. Save to `docs/research/`.
- **Flow integration:** pn-orchestrator adds step 0.5 (prior art research) between discovery and plan. pn-full-dev-loop adds research step between discovery and plan.
- **pn-init:** Scaffold, full dev loop, and plan-only paths now run pn-prior-art-research before scaffold or pn-writing-plans.
- **pn-discovery-questionnaire:** Added Prior art skip question to Technical section; Output notes next step.
- **pn-writing-plans:** Added **Prior art** header field; "Adapt-from-prior-art" section for clone/adapt first task.

## [0.6.16] - 2025-11-18

- **pn-react-next-best-practices** renamed to **pn-nextjs** projectwide.

## [0.6.15] - 2025-11-04

- **Rules split:** pn-react-astro replaced by **pn-react** (core React: .tsx/.jsx) and **pn-astro** (Astro: .astro, islands, client directives).
- **Skills split:** pn-react-astro-scaffold replaced by **pn-react-scaffold** (React, Next) and **pn-astro-scaffold** (Astro pages and islands).
- **References updated:** agents, commands, skills, README now reference pn-react, pn-astro, pn-react-scaffold, pn-astro-scaffold.

## [0.6.14] - 2025-10-21

- **pn-design-system rule/skill clarity:** Rule and skill descriptions clarified (rule = enforce on edit; skill = establish/audit). README note added.
- **pn-react-astro / pn-react-next overlap:** Both rules now document that they apply together for Next.js app/ or pages/; content is complementary.

## [0.6.13] - 2025-10-07

- **New command:** pn-init â€” Zero-prompt questionnaire entry for new projects or features. Start with /pn-init; answer Technical, Security, Design, Requirements, Scope; then choose: scaffold, full dev loop, plan only, or save and stop.
- **Removed:** pn-scaffold-with-questionnaire (replaced by pn-init; choice 1 provides scaffold flow).
- **README:** pn-init as first command; quick start note for new projects.

## [0.6.12] - 2025-09-23

- **Removed:** pn-scaffolding-questionnaire (superseded by pn-discovery-questionnaire; was unused).
- **plugin.json:** Version updated to 0.6.11 (was stale).
- **README:** Added "Install without marketplace" instructions (Settings â†’ Plugins â†’ Add plugin from folder).

## [0.6.11] - 2025-09-09

- **New skill:** pn-payment-integration â€” Stripe, PayPal, Square; checkout, subscriptions, webhooks, PCI compliance; idempotency, test-mode-first.
- **pn-actions:** Added pn-payment-integration for payments, billing, subscriptions.
- **README:** Listed pn-payment-integration under Backend / integrations.

## [0.6.10] - 2025-08-26

- **New skills (from pnTools/perniemann _agents):** pn-security-audit (OWASP, JWT/OAuth2, CORS/CSP, input validation), pn-config-review (connection pools, timeouts, memory limits; "prove it's safe" for config changes), pn-legacy-modernizer (strangler fig, tests before refactor, backward compatibility), pn-error-log-analysis (log parsing, stack traces, error correlation).
- **pn-reviewer:** Added pn-security-audit, pn-config-review, pn-error-log-analysis.
- **pn-actions:** Added pn-security-audit, pn-legacy-modernizer.
- **pn-testing:** Added pn-error-log-analysis for log-based debugging.
- **pn-review-optimize-loop:** Apply pn-config-review when changes include config/infra files.
- **pn-systematic-debugging:** Guardrail to use pn-error-log-analysis for log-based debugging.
- **README:** Listed new skills under Review / security.

## [0.6.9] - 2025-08-12

- **pn-frontend agent:** Reframed as framework-agnostic; supports React, Astro, Next.js, vanilla HTML/CSS/JS. Core skills (typography, CSS, grid, SVG, design, UX) apply to any stack; framework-specific scaffold skills applied per discovery.
- **New skill:** pn-vanilla-web-scaffold â€” Semantic HTML, progressive enhancement, a11y for vanilla web pages.
- **New rule:** pn-vanilla-web â€” Conventions for .html/.htm files (semantic HTML, BEM/kebab-case, CSS variables, a11y).
- **Discovery/scaffold routing:** Stack options include Next.js and vanilla HTML/CSS/JS. pn-scaffold-with-questionnaire routes to pn-react-astro-scaffold or pn-vanilla-web-scaffold by stack. pn-scaffolding-questionnaire updated for vanilla routing.
- **pn-scaffolding agent:** Added pn-vanilla-web-scaffold; workflow invokes scaffold per stack.
- **pn-frontend-design:** Stack section references pn-vanilla-web; Constraints include Next.js and vanilla.
- **README:** pn-vanilla-web rule, pn-vanilla-web-scaffold skill; agent descriptions updated.

## [0.6.8] - 2025-07-29

- **New skills:** pn-typography (font selection, type scale, variable fonts), pn-css-styling (layout, box model, selectors), pn-grid-systems (Grid, flexbox, responsive breakpoints), pn-svg (structure, gradients, filters, SMIL/CSS animation; references assets/pn-logo.svg).
- **pn-frontend:** Added pn-typography, pn-css-styling, pn-grid-systems, pn-svg to skills list.
- **README:** Listed new skills under Frontend.

## [0.6.7] - 2025-07-15

- **New rule:** pn-visual-indicator â€” Always applied when plugin is installed.
- **Agents:** Added first-message line to all agents for consistency when an agent is selected.
- **README:** User rule migration note (remove duplicate user rules if present).

## [0.6.6] - 2025-07-01

- **New skill:** pn-discovery-questionnaire â€” Comprehensive pre-build discovery (technical, security, design, requirements). Industry standard 2026, secure by design, custom design focused. Ask explicitly; never infer for security items. Gate: do not proceed until user confirms spec.
- **Orchestrator:** Step 0 (mandatory for builds): run pn-discovery-questionnaire first. Skip path: user may say "skip discovery" or provide complete spec.
- **pn-full-dev-loop:** Discovery step 1, plan step 2, then specialists and review.
- **pn-scaffold-with-questionnaire:** Replaced with pn-discovery-questionnaire (technical, security, design, requirements) then scaffold.
- **pn-scaffolding agent:** Uses pn-discovery-questionnaire (or discovery spec from orchestrator).
- **pn-writing-plans:** Consumes discovery spec; plan header includes Discovery ref and pulls security/design/scope from discovery.
- **New rule:** pn-discovery-gate â€” When planning or scaffolding, ensure discovery spec exists; security and design decisions documented before implementation.

## [0.6.5] - 2025-06-17

- **Orchestrator:** Step 2 now explicitly includes pn-gamedev in the specialist list.
- **Verification flow:** Documented in pn-testing and pn-reviewerâ€”testing fixes tests, reviewer is the final gate.
- **Skills:** Standardized section headings to "When to use" (replaced "Trigger" and "When to apply" in pn-fix-merge-conflicts, pn-verification-before-completion, pn-review-plugin-submission, pn-create-plugin-scaffold, pn-run-smoke-tests, pn-fix-ci).
- **Stack-aware reviewer:** Skip pn-react-next-perf for non-React/Next projects (Three.js, Node-only, Blender, Unreal). Updated pn-reviewer, pn-orchestrator, pn-full-dev-loop, pn-review-optimize-loop.
- **Continual learning:** Documented hook reliability limitations (platform/version issues) in pn-continual-learning skill and README.

## [0.6.4] - 2025-06-03

- **New skill:** pn-loop â€” Autonomous iteration until verification passes. Fix-until-green, migration completion, or any task with clear verification criteria. Uses pn-verification-before-completion as the completion gate (evidence-based, not self-declared). Inspired by Ralph Wiggum technique, aligned with pnCore's verification-first philosophy.
- **pn-testing agent:** Added pn-loop for fix-until-tests-pass / fix-CI-until-green flows.
- **pn-reviewer agent:** Added pn-loop for "fix until pass" or "repeat until clean" requests.

## [0.6.3] - 2025-05-20

- **Breaking change:** All skills, rules, agents, and commands now use the `pn-` prefix for clear identification as pnCore tools.
- **Slash commands:** Use `/pn-full-dev-loop`, `/pn-review-and-optimize`, `/pn-scaffold-with-questionnaire` instead of unprefixed versions.
- **Agents:** Select `/pn-orchestrator`, `/pn-frontend`, `/pn-gamedev`, `/pn-scaffolding`, `/pn-actions`, `/pn-testing`, `/pn-reviewer`.
- **Script:** `scripts/continual-learning-stop.mjs` renamed to `scripts/pn-continual-learning-stop.mjs`; skill reference updated to `pn-continual-learning`.
- **State paths:** `continual-learning.json` and `continual-learning-index.json` unchanged (no migration required).

## [0.6.2] - 2025-05-06

- **New skills (from Superpowers):** verification-before-completion, writing-plans, writing-skills.
- **verification-before-completion** â€” Run verification commands and confirm output before any completion claims; evidence before assertions.
- **writing-plans** â€” Bite-sized implementation plans with exact file paths and verification steps; use before multi-step work.
- **writing-skills** â€” TDD for process documentation; create/edit skills with baseline testing and compliance verification.
- **Testing agent:** Added verification-before-completion; use before claiming smoke/CI pass.
- **Reviewer agent:** Added verification-before-completion; use before claiming loop pass.
- **Orchestrator:** Added writing-plans (for multi-step features), verification-before-completion.
- **Scaffolding agent:** Added writing-skills for creating/editing skills.
- **review-optimize-loop:** Added verification-before-completion guardrail before claiming pass.

## [0.6.1] - 2025-04-22

- **New skill:** figma-design-to-code â€” design-to-code workflow, token extraction from Figma, component mapping, implementation patterns.
- **New rule:** figma â€” token extraction, component mapping, naming alignment, design-code sync.
- **Frontend agent:** Added figma-design-to-code skill and figma rule.

## [0.6.0] - 2025-04-08

- **Skills split:** three-game split into **threejs-core** (scene, camera, lighting, assets, animation, physics, R3F/Drei) and **game-logic** (game loop, state machines, input, collision, scoring, save state).
- **New skills:** shader-authoring, design-system, landing-page, web3-contracts, blender-scripting, unreal-dev.
- **New rules:** shader, design-system, web3-security, blender, unreal.
- **Rule updates:** three-game.mdc globs expanded for .glsl, .frag, .vert, r3f, drei, rapier.
- **New agent:** gamedev â€” owns Three.js, shaders, and game logic; uses threejs-core, game-logic, shader-authoring.
- **Frontend agent:** Removed three-game; added landing-page, design-system. Rules: design-system instead of three-game.
- **Orchestrator:** Routes to gamedev for 3D/game/shader work; full-dev-loop command updated.
- **Manifest:** Version 0.6.0; description and keywords updated; no MCPs bundled (per plan).

## [0.5.0] - 2025-03-25

- **Agents consolidated (9 â†’ 6):** Merged ui + ux + frontend-designer into **frontend**; merged auto-review-loop + optimize into **reviewer**. Kept orchestrator, testing, actions, scaffolding. All agent names now kebab-case with `model: inherit`.
- **plugin.json:** Added `displayName`, `logo`, `category`, `tags`, and component paths (`skills`, `rules`, `hooks`). Fixed `author`. Bumped to 0.5.0.
- **LICENSE:** Added MIT LICENSE file.
- **Logo:** Added `assets/pn-logo.svg`.
- **Rule globs fixed:** `node-backend.mdc` narrowed from `**/*.ts`/`**/*.js` to backend-specific paths. `react-next-best-practices.mdc` narrowed to `app/`/`pages/` to avoid overlap with `react-astro.mdc`.
- **Orchestrator and commands updated** to reference new consolidated agent names.

## [0.4.3] - 2025-03-11

- **Skill:** deslop (from Cursor Team Kit) â€” remove AI-generated code slop: unnecessary comments, defensive try/catch, `any` casts, deeply nested code, patterns inconsistent with codebase. Used in the review phase of the review-optimize loop.
- **Loop:** review-optimize-loop now includes deslop in the review phase; Auto review loop agent and Orchestrator both run deslop as part of their review+optimize loop. review-and-optimize command updated.
- **README:** CI/dev-loop skills list deslop.

## [0.4.2] - 2025-02-25

- **Skill:** frontend-design (distinctive aesthetics, design thinking, typography, color, motion, composition; anti-patterns for generic AI aesthetics; adapted for React/Astro).
- **Agent:** Frontend Designer â€” visual design and aesthetic direction; uses frontend-design, ux-patterns, react-astro; post-design review (cohesion, a11y).
- **README:** Skills and agents sections updated.

## [0.4.0] - 2025-02-11

- **Agents:** Eight agents added under `agents/`: Scaffolding (questionnaire-driven), UX, UI, Actions, Auto review loop, Optimize, Testing, and pnCore orchestrator. Each specialist runs a post-step review where applicable; the orchestrator runs one review+optimize loop on the overall result.
- **Commands:** review-and-optimize, scaffold-with-questionnaire, full-dev-loop (orchestrator flow + orchestrator review+optimize loop).
- **Skills:** scaffolding-questionnaire, ux-patterns, review-optimize-loop.
- **Manifest:** `agents` and `commands` paths added to plugin.json; version 0.4.0.
- **README:** What's included updated with agents, commands, and orchestrator loop; install step mentions agents and commands.

## [0.3.0] - 2025-01-28

- **Contextual learning:** continual-learning skill + `stop` hook (`scripts/continual-learning-stop.mjs`, Node) to optionally trigger AGENTS.md updates from transcript deltas.
- **Create Plugin:** create-plugin-scaffold and review-plugin-submission skills; plugin-quality-gates rule (globs for plugin manifests).
- **React/Next best practices:** react-next-best-practices rule (globs for .tsx, app/, pages/); react-next-perf skill unchanged (no deploy).
- **README:** Updated what's included; recommended companions no longer list Continual Learning or Create Plugin (included in pnCore); Vercel deploy called out as optional.

## [0.2.0] - 2025-01-14

- **Skills added (from Cursor Team Kit):** fix-ci, fix-merge-conflicts, run-smoke-tests.
- **Skills added (Superpowers-style):** tdd, systematic-debugging.
- **Skill added (Vercel-style):** react-next-perf (React/Next data loading and perf).
- **README:** Updated "What's included" and added "Recommended companions" (Continual Learning, Create Plugin, Prisma, Sentry, Vercel).

## [0.1.0] - 2024-12-31

- **Rules:** Node/backend, React/Astro, CI, n8n, Three.js/game (5 `.mdc` files with globs).
- **Skills:** node-api, react-astro-scaffold, ci-triage, n8n-patterns, three-game (5 skills).
- No commands, hooks, MCP, or agents in this version.
