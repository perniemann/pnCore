# Changelog

All notable changes to pnCore are documented in this file.

## [Unreleased]

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
