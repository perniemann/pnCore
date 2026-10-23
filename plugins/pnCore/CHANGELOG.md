# Changelog

All notable changes to pnCore are documented in this file.

## [Unreleased]

## [0.19.13] - 2026-10-23

Fixes from an independent review of 0.19.10–0.19.12.

### Changed

- **`workflow_state_save` overwriting another run's file needs `overwrite_run: true`.** `expected_revision` alone no longer acknowledges it, because the engine asks for `expected_revision` on every save.
- An unparsable prior state file returns `PARSE_ERROR` unless `expected_revision: 0` acknowledges replacing it; with `history: true` its raw bytes are kept in `<state>.history.jsonl`.
- Plain-mode saves take the same `<state>.lock` as commit mode and drop a caller-supplied `_pncore` envelope.
- `workflow_verify` passes the variables named in `env_required` to the command on every backend, through the spawn environment (never argv). Previously the check ran against the server's environment while the command never saw the variable. `owner` is recorded, not checked. A spawn `EACCES` is classified `missing_input`, like exit 126.
- full_dev step 6 earns verify only when `state.run_id` is set (reason `run_id_missing` otherwise); `run_id` is trimmed before matching attestations.
- `npm run check:context-index` also rejects duplicate artifact ids, `superseded_by` on an artifact that is not `superseded`, self-references, and `superseded_by` cycles. `npm run check:artifact-status` skips `historical` / `superseded` artifacts, matching `project_context`.

### Fixed

- `workflow_state_save` / `workflow_state_load` / `project_context` reject the workspace root or a directory as the state path; a save could previously write its temp file outside the workspace.
- Two writers could both take over a stale checkpoint lock, and release deleted whatever lock was present. The lock now holds a token, a stale lock is kept only if it is still the file judged stale, and release checks the token.
- The `project_context` trail read the hardcoded handoff log while `active_run` honoured `PNCORE_HANDOFF_LOG`. An empty `PNCORE_HANDOFF_LOG` or `PNCORE_RUN_EVENTS_PATH` now falls back to the default instead of resolving to the workspace directory. A log override outside the workspace is reported as `trail_path_rejected` (warn).
- A `current_checkpoint` pointing at a historical artifact could become `next_incomplete`; a run that also owns the current checkpoint was flagged `historical_entry_selected`.
- `resume_run_bound` matched `run-1` inside `run-10`. `modelMismatches` compares trimmed, case-folded names. `counts.historical` is always present.
- Preflight no longer accepts a directory as the command and no longer echoes the actual hash on a sha256 mismatch. `workflow_run_query` loads preflight events only when `kinds` asks for them.

### Internal

- `project-context.ts` split into `active-run.ts` (run selection, consistency) and `context-index.ts` (index shape, lifecycle): 911 → 465 lines. Commit-arg validation, plain save, and the handoff line writer moved into `checkpoint.ts`; preflight event building and the spawn-failure receipt left `handlers.ts` (1202 → 1162 lines).
- Root `@modelcontextprotocol/sdk` floor raised to `^1.32.1`.

## [0.19.12] - 2026-10-22

### Added

- **full_dev step 6 delivery ledger.** The terminal step asks for `{ accepted[], implementedUnaccepted[], open[], remainingGates[], evidenceReuse[], nextAction }`. Every item is `{ item, scope, evidence }` with scope `source`, `static`, `runtime`, or `product`, never wider than the evidence observed. `Acceptance.scope` reports the strongest scope the server earned; it earns at most `static`.
- **Context-index schema 1.4.0.** `pointers.current_checkpoint` names the artifact id of the current checkpoint. `artifacts[].lifecycle` is `current`, `historical`, or `superseded` (with `superseded_by`). `npm run check:context-index` validates both, and `npm run migrate:context-index` upgrades a 1.3.0 index.
- `project_context` treats `historical` / `superseded` artifacts as evidence only: they are excluded from drift and `next_incomplete` and counted under `counts.historical`. `active_run.declared_current` reports the run of the declared checkpoint. `consistency` gains `state_vs_declared_current` (the state file holds a different run than the declared checkpoint) and `historical_entry_selected` (the selected run belongs to a historical or superseded artifact), both warnings.
- **`report_usage` requested vs observed model.** New optional fields `requestModel`, `responseModel`, `reasoningEffort`, `workerId`, and `observedBy` (`agent_claim` / `unavailable`; `hook` is reserved for lines a harness hook writes). `observedBy: "unavailable"` with `responseModel` is `INVALID_STATE`.
- The `workflow_run_query` timeline carries per-step `models` and `modelMismatches` (usage lines whose `responseModel` differs from `requestModel`).

### Changed

- full_dev step 6 computes server acceptance only when `disposeVerify` or `strictSkepticGates` is on. Otherwise `acceptance` is `"unearned"` and no acceptance event is written, so default runs are no longer reported as not accepted.
- full_dev steps 0 and 5 surface only guidance that applies to this run and do not re-ask decisions already recorded in state or context-index pointers. Review and integration remain hard gates.

## [0.19.11] - 2026-10-22

### Added

- **`workflow_state_save` commit mode** (ADR-0022). Pass `run_id` + `step` + `summary` (optional `expected_revision`, `handoff_path`, `history`) and one call takes `<state>.lock`, checks the revision and bound run, appends the handoff line with revision N+1 and `stateHash`, writes the state atomically, and reads it back. The response carries `revision`, `previous_revision`, `stateHash`, `handoffHash`, and `readBack`. New error codes: `REVISION_CONFLICT`, `RUN_MISMATCH`, `LOCKED`.
- `workflow_state_load` returns `{ state, meta, path }`: `state` without the `_pncore` envelope, `meta` = `{ revision, run_id, step, savedAt, stateHash }` or `null`. `workflow_step` strips the envelope too.
- `project_context.consistency` gains `handoff_revision_ahead` (an interrupted commit's handoff line is ignored for `last_completed_step`) and `state_unversioned` (info). `active_run.state_revision` reports the committed revision.
- **`workflow_verify` failure classes and in-call preflight.**
  - `GateReport.failureClass` is `none`, `missing_input`, `infrastructure`, or `behavioral`. It is diagnostic only; gates still pass on exit 0 alone.
  - `inputs` (`path`, `sha256`, `access`), `env_required`, and `owner` are checked in the same call right before spawn, together with the command itself. A failed check records a `preflight` run event and launches nothing; `preflight_only` runs just the checks without `disposeVerify`.
  - Spawn errors produce a receipt instead of `IO_ERROR`.
  - `workflow_run_query` accepts `kinds: ["preflight"]`.

### Changed

- The engine's after-step instruction (`HANDOFF_AFTER_STEP`) asks for one `workflow_state_save` commit-mode call with `expected_revision`; `workflow_handoff_append` is the fallback.
- `workflow_state_save` is annotated `idempotentHint: false`, since commit mode advances the revision.

## [0.19.10] - 2026-10-22

### Added

- `project_context` returns **`active_run`** and **`consistency`** in both modes. `active_run` reports the workspace root, the resolved state path and its source (`state_path` argument > `PNCORE_STATE_PATH` > default), the selected `run_id`, last served step (run log) vs last completed step (handoff log), `step_status`, the newest handoff run, and whether `.pncore/handoff.md` names the run. `consistency` lists `state_path_rejected`, `state_path_diverged`, `newer_run_in_log`, `handoff_run_mismatch` (errors), and `workspace_root_suspect`, `default_state_shadowed`, `state_run_differs`, `handoff_skipped`, `handoff_foreign` (warnings). With an error, no run is selected silently: `run_id` is `null` until the caller passes one.
- `drift_scope: "indexed_files"` on the packet: drift covers context-index artifacts only and is not a run-freshness signal.
- `workflow_state_save` records each target in `.pncore/state-saves.jsonl`, so a save to a custom path is visible to readers of the default.

### Fixed

- `project_context` ignored `PNCORE_STATE_PATH` and custom save paths and read the hardcoded `.pncore/workflow-state.json`, so a stale default state surfaced as the active run. Save, load, and `project_context` now share one resolver, and `project_context` also honours `PNCORE_RUN_LOG` and `PNCORE_HANDOFF_LOG`.
- `workflow_state_save` writes atomically (unique temp file, fsync, rename; transient Windows `EPERM` / `EBUSY` / `EACCES` on rename are retried with bounded backoff), so an interrupted save leaves the previous state intact.
- `workflow-state-schema.md` no longer recommends an absolute `PNCORE_STATE_PATH` outside the workspace; such paths are rejected and now reported instead of silently falling back.

## [0.19.9] - 2026-09-17

### Changed

- Realigned the companion MCP catalog and root operator guides with the four-harness architecture, current workflow inventory, runtime diagnostics, hooks, and maintained install commands.
- Updated Unreal and Godot MCP selection guidance, including current ChiR24 transports and GDAI setup.
- Business-strategy companion detection recognizes Exa's published `*_exa` tool names.

### Fixed

- `workflow_step` schema guidance now reports all nine `business_strategy` steps.
- Documentation inventory checks guard high-risk companion URLs, workflow coverage, hook descriptions, and retired command/workflow names.

## [0.19.8] - 2026-09-17

### Changed

- User-facing docs and house diagrams: one MCP engine, four harness adapters. Live "29 tools" counts stay on the Catalog line only; `pn-project-builder` is internal orchestration. Diagram file `03_three_surfaces.svg` renamed to `03_four_harnesses.svg`.

## [0.19.7] - 2026-09-17

### Changed

- **Commit policy** (`pn-no-cursor-commit-trailers` + `check-commit-no-ide-trailers`): CI fails when Author or Committer is Cursor Agent / `cursoragent@cursor.com` / `cursor@cursor.com`, not only when a `Made-with:` or `Co-authored-by` trailer is present. Cloud Agent PRs stay red on `no-ide-trailers`; land them with squash + empty body as the human.

## [0.19.6] - 2026-09-17

### Changed

- GitHub / marketplace / plugin manifest description: MCP engine for named, gated delivery steps across Cursor, Claude Code, Codex, and Pi. Replaces the old frontend/3D kit blurb.

## [0.19.5] - 2026-09-17

### Added

- **Q3 closeout audit** (ADR-0002): `docs/refs/audit-2026-Q3.md` dated section (2026-09-17) with current inventory, high-leverage body pass, and follow-ups (EVAL backfill, unused `/pn-retro`).
- `check-doc-inventory` asserts **live** `pn-guide.md` slash-palette headlines against disk (submenu = visible minus `/pn` stub), not a denylist of last quarter's counts.

### Fixed

- Pi TypeBox `suggest_model_tier.role` includes `orchestrator` (parity with Zod); registry test checks nested literals.
- `pn-orchestration-philosophy` no longer tells agents to close gates with free-text "Reply yes"; it points at `ask_question` / `workflow_confirm`.
- Stale catalog copy in `pn-guide`, `plugin-reference`, and `how-to-use-guide`; ADR-0006 Consequences still said "P2 next"; CONTRIBUTING `prepare` description; README surfaces SVG tool count.

## [0.19.4] - 2026-09-17

### Added

- **Context budget packing, narrow** (ADR-0021): `project_context` gains `max_tokens` (chars ÷ 4). The packet is packed deterministically in a fixed order — trail oldest-first, settled artifacts' notes, settled artifacts, pointers, trail, artifacts, drift notes — and every packet (budgeted or not) now carries `budget: { maxTokens, estimatedTokens, chars, fits, steps[], hint? }` plus `artifacts_omitted` counts when artifacts were dropped. Drift, `next_incomplete`, `resume`, `counts`, `context_index` are never removed; `fits: false` is reported when the core alone is over.
- **Codex `AGENTS.md` cap honoured**: `plugin-install --harness codex --inline-rules` keeps the whole `AGENTS.md` under the 32 KiB chain cap (`PNCORE_AGENTS_MD_CAP_BYTES` overrides) by inlining always-on rules in priority order (`ALWAYS_ON_RULE_PRIORITY`) and listing the ones that do not fit as `get_rule` pointers; content outside the pnCore block is untouched; the installer prints bytes against the cap and warns when the file is over it on its own. `harness_scaffold` returns `instructionsBudget` for Codex (also in `dryRun`). `HarnessLayout.instructionsCapBytes` records the cap per harness.

## [0.19.3] - 2026-09-17

### Added

- **Step spans on the run log** (ADR-0020): every `workflow-runs.jsonl` entry now carries `stepIndex` (0-based, monotonic per `runId`, recovered from the log tail after a server restart), `sinceLastStepMs` (agent wall time since the previous step of the run; `null` on the first), and `engineMs` (time inside the engine). `get_skill` / `get_agent` / `get_command` / `get_rule` calls with `run_id` are tagged with the current `stepIndex` in `skill-load-log.jsonl`. No new files, no change to the `workflow_step` response.
- **`workflow_run_query` reads every trail**: `kinds` `step`, `usage`, `handoff`, `gate` (accepted before, never served) now return their `.pncore` records merged with verify/acceptance in time order; new kind `load` returns `get_*` loads. New `timeline: true` joins them per step — loads, tokens, handoff, gates, verify — with `totals`, `wallMs`, `slowest` step, `done`, `accepted`. Default `kinds` (verify + acceptance) are unchanged. Response gains `paths` (one per trail).

## [0.19.2] - 2026-09-17

### Added

- **Deterministic trajectory replay in CI** (ADR-0019): a recorded `workflow_step` run — the ordered calls one agent makes through a workflow, including same-step phases, parallel fan-outs, loop-backs, and iteration-cap errors — becomes a fixture under `packages/pn-core-mcp/src/fixtures/trajectories/` and is replayed through `getWorkflowStep` by `src/trajectory.test.ts` in `npm run test:full`. Any routing drift (`nextStep`, `gate`, `done`, `workflowPhase`, `parallel`, task ids, expected errors) fails CI with expected-vs-actual per step. Six fixtures ship (full_dev parallel + merge, full_dev phased specialists, design skeptic loop-back, project_kickoff, business_strategy Weak loop, authored design iteration-cap → approval). No LLM in the loop.
- **`npm run trajectory:record`** (`scripts/record-trajectory.mjs`): `--list` recorded runs; `--run-id <id> --name <kebab>` (or `--latest`) exports a fixture and replays it immediately. Refuses runs without state snapshots, non-continuous runs, and mixed workflow types.
- **`PNCORE_RUN_LOG_STATE=1`**: `workflow_step` adds a `state` snapshot to `.pncore/workflow-runs.jsonl` (strings capped at 240 chars, `pncoreHumanGateTicket` / approval tokens redacted, depth ≤ 6). Off by default.

### Changed

- `.pncore/workflow-runs.jsonl` entries now include `workflowPhase`, `parallel`, and `taskIds` when the step produced them. `pn-core://reference/workflow-runs-schema.md` documents the full entry and the replay flow; RUNBOOK and the MCP README point at it.
## [0.19.1] - 2026-09-16

### Added

- **ADR-0017 (Astra-era skill discovery):** MCP `list_skills` / `get_skill` is the progressive-disclosure path. Cursor plugin skill-index catalog size is a known gap (emptying `skills/` deferred). Response aliases stay agent-requested (ADR-0013): compact `responseAliases` on `project_context`, plus `/pn-guide`, `docs/how-to-use-guide.md`, and one `pn-mcp-proactive` row — not `alwaysApply`. New skills error if `description` exceeds 220 characters. Premium+ `renderTierHint` appends a router/local-tests sentence.
- **Chat shortcodes** in `/pn-guide`: whole-token `scr` / `eli` / `foc` / `ref` / `scp` expand via `get_skill("pn-response-aliases")`.
- `scripts/measure-tokens.mjs` reports skill-description catalog size against Codex’s ~8000-character initial-list budget.

### Changed

- Skill descriptions for `pn-prior-art-research`, `pn-context-engineering`, `pn-documentation`, `pn-trend-research`, `pn-program-orchestration`, and the longest catalog hits (`pn-html-to-video`, `pn-diagram-design`, `pn-agent-governance`, `pn-animation`, `pn-a2a-interop`) use a narrower WHEN.
- `pn-writing-skills` documents Astra WHEN tightness and treats `SKILL.md` as a router, not a full itinerary. Split skills with `reference.md` open with a one-line load-on-demand notice. `validate-skill-schema` **warns** on broad WHEN and on descriptions over 220 characters; **errors** only for newly added skills over that cap.
- `pn-mcp-proactive` always-on map is the high-traffic subset; full table stays in `RUNBOOK.md`.
- `prompt-provider-knobs.md` adds a GPT-6 Astra subsection. `agents-md-guide.md` adds “read what the task needs” vs read-everything-first.
- `project_context` includes `responseAliases` (`ref` keeps “Preserve codes for the rest of the session”). `renderTierHint` appends a router sentence on premium / premium_thinking / long_horizon.
- Sync MCP content CI sets `PR_BASE`/`PR_HEAD` (and `fetch-depth: 0`) so `validate-skill-schema` can error on newly added `SKILL.md` over 220 characters during `test:full`.

## [0.19.0] - 2026-09-14

### Added

- **Harness adapters** (ADR-0016): pnCore is one MCP engine with four surfaces — Cursor, Claude Code, Codex, Pi. `packages/pn-core-mcp/src/harness.ts` holds the single layout table (instructions file, rules dir + format, skills dir, commands dir, agents dir, MCP config, hooks) and detection (`PNCORE_HARNESS` > process env signals > workspace folders). Reference: `pn-core://reference/harness-matrix.md`.
- **MCP tools `harness_detect` and `harness_scaffold`** (29 tools): detect the active harness and write project-context / project skill / trailer rule / optional MCP config **only** into the folders that harness reads — `.cursor/rules/*.mdc`, `.claude/rules/*.md`, or a managed `<!-- pncore:start -->` block in `AGENTS.md` (Codex, Pi); `.cursor/skills`, `.claude/skills`, or shared `.agents/skills`. `dryRun` returns the plan with contents; existing files are skipped unless `overwrite`; managed blocks are replaced in place.
- **Installer `--harness <cursor|claude_code|codex|pi|auto|all>`** for `scripts/install-to-project.mjs` (`npx github:perniemann/pnCore plugin-install`): Claude Code gets `.claude/{skills,agents,rules,commands}` with `.mdc` → `.md` rule conversion (`globs` → `paths`, agent-requested rules stay MCP-only); Codex gets `.agents/skills` + an `AGENTS.md` pnCore block; Pi gets `.agents/skills` + `.pi/prompts` + the block. `--with-mcp-config` writes the harness-native server entry; `--inline-rules` inlines always-apply rules for Codex / Pi. `auto` falls back to Cursor and says so.
- Pi native extension sets `PNCORE_HARNESS=pi` on load so detection is authoritative on Pi.

### Changed

- `/pn-setup`, `/pn-new`, `project_kickoff` step 7, and `full_dev` step 1 no longer hardcode `.cursor/`; they call `harness_detect` → `harness_scaffold` and ask for the harness when detection is empty. `pn-mcp-proactive` adds a harness-aware-writes rule; `pn-tool-risk-policy` lists the new tools; RUNBOOK, FLOW, `starting-new-project`, `pn-build`, `pn-project-builder`, and `pn-agents-md` reference the harness-native project-skill / project-context locations.

## [0.18.10] - 2026-09-03

### Added

- **Consumer-project gating** (ADR-0015): `/pn-setup` and `/pn-new` write the trailer Cursor rule plus portable `.githooks`. Installer leaves an existing `core.hooksPath` (Husky/Lefthook) in place; `--replace-hooks-path` is ask-first. Canonical: `pn-core://reference/consumer-gating.md`.

### Changed

- **Fable 5.1 adapt (v1):** `long_horizon` exemplar is `claude-fable-5-1` (`claude-fable-5` remains an alternate). Prompt knobs teach effort, $0.25/MTok cache, append-only history, and anti-patterns. Opus remains the daily-driver premium.
- **`fast-uri` 3.1.7 override:** pin past GHSA-5jgf-p345-68v8 / GHSA-f65p-4m7j-42xc so Sync MCP content `npm audit --audit-level=high` passes.
- MCP package: `typebox` 1.3.19 and `@types/node` 26.4.0 (leftover from stale Dependabot #8).
- Plugin and MCP package versions stay in lockstep with the root package (0.18.10).

## [0.18.9] - 2026-08-27

### Added

- **MCP `project_context`:** dual-mode cold-session packet (operator counts / agent artifacts + handoff and run-events trail). Bootstrap via `pn-mcp-proactive` and `/pn-setup` project-context.mdc.
- **context-index 1.3.0:** optional typed `artifacts` array; `npm run check:artifact-status` for attested derived status (no checkbox truth).
- **sessionStart canary** (fail-open): `plugins/pnCore/scripts/pn-session-start-canary.mjs` — telemetry only; primary path remains `project_context`.
- **`/pn-setup` Section E:** scaffold `docs/refs/context-index.json` + artifacts for adopters.

### Changed

- Plugin and MCP package versions stay in lockstep with the root package (0.18.9).

## [0.18.8] - 2026-08-24

### Added

- **`pn-scroll-narrative` skill:** journey-first procedure for scroll-told marketing pages (Narrative Map, one peak, CSS scroll-driven or GSAP pin/scrub, timeline evidence). Trigger is narrative intent only — high `MOTION_INTENSITY` is not a load condition.
- Marketing ship-gate **N-01–N-04** (map present, one peak, timeline samples, reduced-motion readable).
- **ADR-0014:** original scroll-narrative procedure, prior-art attribution, and an explicit non-clone list.

### Changed

- Design workflow load-paths (`design-intent`, `pn-preflight`, `pn-design`, `pn-landing-page`, `pn-evidence-qa`) fork to the narrative skill when intent is present.
- Plugin and MCP package versions stay in lockstep with the root package (0.18.8).

## [0.18.7] - 2026-08-23

### Changed

- Plugin README MIT link now points at the repo-root `LICENSE`.
- Plugin `package.json` version is kept in lockstep with the root package (0.18.7).

### Security

- Added repo-root `SECURITY.md` (private vulnerability reporting).

## [0.18.6] - 2026-08-23

### Fixed

- **`pn-color-system` skill:** collapsed a duplicated `## Context Gathering` section and restored the missing intro sentence under `## Core Approach` (prior edit merge artifact).

### Changed

- **`pn-design-system` rule:** dedupe the OKLCH light/dark token code block against `pn-color-system`'s canonical example, replaced with a cross-reference to remove the two-file sync burden.

### Added

- **`pn-design-system` skill:** `EVAL.yaml` backfill (token-hierarchy authoring and consistency-audit scenario pairs) per the ADR-0002 quarterly audit convention.

## [0.18.5] - 2026-08-23

### Changed

- **User-facing README:** teaching structure (why it exists, four principles, user-only install, pain table, honest edges) and four house-styled diagrams under `docs/readme/`. Contributor scripts and local-dev steps live in [CONTRIBUTING.md](../../CONTRIBUTING.md#scripts).

## [0.18.4] - 2026-08-20

### Added

- **Communication contract** (agent-requested): rule `pn-communication-contract` (`alwaysApply: false`), reference `pn-core://reference/communication-contract.md`, skill `pn-response-aliases` (`scr`/`eli`/`foc`/`ref`/`scp`), and reference-point protocol in `pn-context-engineering`. Optional seed from pn-setup / pn-new. See [ADR-0013](../../docs/adr/0013-communication-contract-agent-requested.md).

## [0.18.3] - 2026-08-20

### Added

- **MCP dispose-verify:** `workflow_verify` runs catalog commands with no shell and returns a `GateReport`. `exitCode !== 0` is a completed verify. Tournament step 2 reads attested ids when `disposeVerify` is on; agent `passed` flags are ignored. `workflow_run_query` joins verify/acceptance events by `run_id`. See [ADR-0012](../../docs/adr/0012-mcp-dispose-verify.md).
- **Earned acceptance** on `workflow_step`: `accepted` is not `phasesPassed`. A red suite can finish verify and still be `accepted: false`.
- **Typed envelopes** (`typedEnvelopes`): `pn-*` `taskResults` must be specialist objects, not free strings.

### Changed

- MCP tool count is **26** (was 24). Flags default **off**. Jail is fail-closed (`bwrap`); `PNCORE_VERIFY_SANDBOX=restricted` is an explicit no-jail opt-in.

## [0.18.2] - 2026-08-18

### Changed

- Portable one-click MCP config sets `GIT_TERMINAL_PROMPT=0` and `GIT_ASKPASS=echo`. This checkout commits `.cursor/mcp.json` (`node` + `packages/pn-core-mcp/dist/index.js`) for Desktop clones. Cloud Agents still need that same entry in dashboard MCP JSON.

### Fixed

- **npx MCP install loading:** `pn-core` exits on a TTY after a stderr line (pre-warm no longer sits idle). Without the git fail-fast env, a private git package blocked Cursor on a hidden credential prompt.

## [0.18.1] - 2026-08-13

### Added

- **Diagram types:** state, quadrant, process, data-flow, and org-chart (`type-*.md`); remaining gallery names are a routing row (nearest grammar, no 27-type pack).
- **Import-redraw** on `/pn-diagram`: keep components/relationships, discard source layout/palette, emit a fidelity ledger. No draw.io/Python extractors.
- **Diagram tokens** (`paper` / `ink` / `muted` / `accent` / `link`) on `.pncore-design.md` (pn-setup + example template).

### Changed

- Rule `pn-diagrams` globs markdown, HTML, and `.mmd`/`.mermaid` (still not always-apply).
- Weave diagram quality through design-doc, workflow-roadmap, CX agent patterns, `pn-svg`, `pn-assets` / `pn-assets-manager` (fourth need: **Diagram**), human-facing artifacts, frontend-developer, best-practices, and the skills catalog.

### Fixed

- Doc-structure gate ignores ATX headings inside fenced code examples, so a `##` sample in a skill no longer flags a skip to the next `####`.

## [0.18.0] - 2026-08-13

### Added

- **Diagram quality layer:** skill `pn-diagram-design`, command `/pn-diagram`, rule `pn-diagrams` (narrow glob), and `pn-core://reference/diagram-baseline.md`. Mermaid-in-docs (`accTitle`/`accDescr`) or editorial HTML/SVG with tokens from `.pncore-design.md`. Types in v1: architecture, flowchart, sequence, loop, layers. **Ship gate D-01–D-10** plus skeptic (`pn-render-verify` on editorial HTML) so diagrams match `pn-preflight` / `svg_create`. See [ADR-0011](../../docs/adr/0011-diagram-design-native-layer.md).
- **EVAL.yaml** for `pn-diagram-design` (density, a11y, brand tokens, no import-redraw, D-table + skeptic), `pn-frontend-design` (slop test + `pn-preflight` GO/NO-GO), `pn-svg-creator`, and `pn-image-creator`.

### Changed

- `pn-svg-creator` routes `type: diagram` to `pn-diagram-design` instead of the logo questionnaire; skill-only path now requires skeptic on output (same as `svg_create`).
- `pn-writing-plans` and `pn-documentation` require type pick, Mermaid accessible titles, and the standard D-table when a diagram is warranted.
- `image_create` workflow is 0–4: generate is followed by `pn-render-verify` + `pn-skeptic-challenge` (parity with `svg_create`).

## [0.17.4] - 2026-08-05

### Added

- **Skill EVAL.yaml convention:** Schema and docs at `pn-core://reference/eval-convention.md`; `npm run scaffold:eval` / `check:evals`; pilot suites for `pn-writing-skills`, `pn-tdd`, `pn-discipline-philosophy`, `pn-orchestration-philosophy`, and `pn-context-engineering` (with/without skill + Accuracy×Efficiency tags). See [ADR-0010](../../docs/adr/0010-skill-evals-and-link-checking.md).
- **Offline doc link checker:** `npm run check:links` validates `pn-core://` URIs and relative markdown links (warning-first; skips fenced code examples). Scheduled lychee workflow covers external URLs without blocking PRs.
- **Skill authoring guidance:** Prefer remote MCP tools over CLI/API; optional `owner:` frontmatter; progressive-disclosure size advisory in `validate-skill-schema`.

### Fixed

- Corrected broken relative links in `pn-retro`, `docs/how-to-use-guide.md`, `docs/adr/0006`, and `docs/dashboard/README.md` surfaced by the offline link checker.
- **PR auto-merge timeout:** grant `checks`/`statuses`/`actions` read and fall back to commit check-runs when `gh pr checks` returns empty (labeled-trigger false negative).

### Changed

- **Link check is a merge gate:** `npm run check:links` fails on broken offline links (escape `PNCORE_STRICT_LINKS=0`).
- **EVAL gates tightened:** malformed `EVAL.yaml` fails CI; newly added skills must ship `EVAL.yaml` (escape `PNCORE_STRICT_EVALS=0`). Missing suites on existing skills stay advisory.

### Added

- **EVAL backfill kickoff:** `pn-core://reference/eval-backfill.md`, `/pn-backfill-evals`, and `npm run list:eval-backfill` for ranked local-agent batches (no mass stubs).

### Security

- Bump `ip-address` override to 10.4.0 (fixes high-severity SSRF/trust-boundary advisories via `express-rate-limit`).

## [0.17.3] - 2026-07-08

### Added

- **Orchestrator-lead mode:** `workflow_step` returns `orchestrationMode` and `subagentTierHints` on parallel fan-out when `leadModelTier` / `sessionModel` indicates `long_horizon` or premium + intent. New `orchestration-lead` module, always-apply rule `pn-orchestrator-lead`, loop catalog docs, `/pn-handoff`, and five-tier roadmap vocabulary (`long_horizon` Orchestration row).
- **Session model slug resolution:** boundary-safe `sessionModel` → tier matching (vendor prefix + display-name rules; no substring false positives).

## [0.17.2] - 2026-07-06

### Fixed

- CHANGELOG `[0.16.0]` section heading: `### Breaking` → `### Changed` (doc-structure gate).

## [0.17.1] - 2026-07-06

### Changed

- **Pi slash menu:** Single `/pn` extension command with selector UI (like `/model`); leaf workflows no longer flood the main slash menu. Removes flat `pi.prompts` registration; sync generates `pi-command-index.json`.

## [0.17.0] - 2026-07-05

### Added

- **Pi native tools:** `pi install git:…/pnCore` registers all 24 pn-core tools via `pi.registerTool()` (`packages/pn-core-mcp/extensions/pn-core.ts`). Shared handler registry extracted from the MCP server; stdio MCP unchanged for Cursor and other clients. See [ADR-0009](../../docs/adr/0009-pi-native-tools.md).

## [0.16.0] - 2026-07-04

### Changed

- Removed pnCursor-era local state: `.pncursor/` gitignore entries; use `.pncore/` only.
- **`run_id` only** — `pncoreRunId` state field no longer accepted.
- **`pn-core://reference/best-practices.md`** only — dated `best-practice-2026-03` URI no longer resolves.
- **`engine_feature` only** for UE/Godot — public `unreal_feature` / `godot_feature` workflow types removed from MCP enum.
- Human-gate tickets require **`run_id`** on issue (`approval_checkpoint`) and matching state on consume.
- Project doc discovery uses **`docs/refs/`** only (no flat `docs/PRD.md` fallbacks in rules/commands).

### Added

- **`scripts/check-no-legacy-names.mjs`** — CI guard against reintroducing pnCursor names and removed compat shims.

### Fixed

- **pi.dev git install:** root `package.json` now exposes `pi.prompts` / `pi.skills` pointing at `plugins/pnCore/` so `pi install git:github.com/perniemann/pnCore` loads slash prompt templates. Sync and `check-content-plugin-sync` enforce manifest + flat `prompts/` parity.

## [0.15.1] - 2026-07-04

### Added

- **`pn` command submenu** (ADR-0008): visible commands nested under `.cursor/commands/pn/{category}/` with top-level `pn.md` router.
- **Pi package delivery:** flat `plugins/pnCore/prompts/pn-*.md` + `package.json` `pi-package` manifest for [pi.dev](https://pi.dev) prompt templates.
- PM palette leaves: `/pn-create-prd`, `/pn-user-stories`.
- Recursive MCP `get_command` / `list_commands` with `menuPath`; `scripts/command-slash-filter.mjs` shared helpers.

### Changed

- Catalog: **28** visible palette files (27 submenu leaves + `/pn` stub), **46** commands total (18 palette-hidden).
- `pn-guide`, RUNBOOK, and companion catalog updated for submenu layout.

## [0.15.0] - 2026-07-03

### Added

- First quarterly documentation audit: [docs/refs/audit-2026-Q3.md](../../docs/refs/audit-2026-Q3.md) per ADR-0002.
- `scripts/check-doc-inventory.mjs` — README catalog counts validated against filesystem in `npm run validate`.
- `workflow-state-schema.md` sections for `prompt_optimize`, `engine_feature`, `godot_feature`, `feature_program`, and `implementation_tournament`.

### Changed

- Catalog alignment: **167** skills, **43** commands (25 visible + 18 palette-hidden), **18** workflow types, 24 MCP tools, 9 public + 6 internal agents.
- README workflow table, [docs/mcp-usage-guide.md](../../docs/mcp-usage-guide.md), [docs/plugin-reference.md](../../docs/plugin-reference.md), [docs/how-to-use-guide.md](../../docs/how-to-use-guide.md), and `pn-guide` updated for `implementation_tournament`, `feature_program`, and `pn-best-of-n`.
- ADR-0006 amended: P2 `implementation_tournament` shipped (flag-gated); skill-only path when `bestOfN.enabled` is false.
- `docs/refs/context-index.json` `last_reviewed` updated; `quarterly_audit` pointer added (schema 1.2.0).

### Fixed

- `workflow_step` tool description: `visual_tweak` step count 5 → 4 (matches `workflows.ts`).
- MCP one-click install deeplink: use `npx --package … -- pn-core` instead of `cmd` + relative `node` path (cross-platform).

## [0.14.6] - 2026-06-22

### Added

- **pnCore** public repository: MCP server (`packages/pn-core-mcp/`), Cursor plugin (`plugins/pnCore/`), and canonical content under `packages/pn-core-mcp/content/`.
- 166 skills, 17 workflow types, 24 MCP tools, 9 public agents + 6 internal orchestration agents, and `pn-core://` resources.
- Install paths: MCP one-click deeplink, `npx github:perniemann/pnCore plugin-install`, and local `npm run setup` / `npm run mcp-config`.

### Changed

- README rewritten as standalone product documentation: architecture (MCP + plugin), quick start, workflows, maintainer scripts.
- Repository scoped to the functional core — historical audit/eval artifacts removed; `bench`, `measure-tokens`, and `dashboard` scripts retained.

### Fixed

- MCP install deeplink base64 now targets `pnCore.git` and `packages/pn-core-mcp` (stale encoded config from an earlier copy).
