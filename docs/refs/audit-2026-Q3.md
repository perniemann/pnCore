---
title: "Quarterly audit — 2026 Q3"
updated: 2026-09-17
---

# Quarterly audit — 2026 Q3

First audit pass per [ADR-0002](../adr/0002-skill-rule-audit-cadence.md). Scope: inventory counts, workflow/command coverage, Tier-1 guides, reference schemas, ADR accuracy. Not a per-skill body rewrite.

## Method

1. Filesystem walk of `packages/pn-core-mcp/content/` (skills, commands, rules, agents)
2. `workflowTypeEnum` in `packages/pn-core-mcp/src/index.ts` vs user-facing workflow tables
3. `npm run test:full` + new `check-doc-inventory.mjs` validator
4. 10-artifact spot-check (random skills/commands vs guide mentions)

## Canonical inventory (2026-07-03)

| Artifact | Count |
|----------|-------|
| Skills | 167 (15 categories) |
| Commands | 43 (25 palette-visible, 18 `slash: false`) |
| Rules | 32 |
| Public agents | 9 |
| Internal agents | 6 |
| Workflow types | 18 |
| MCP tools | 24 |

## Findings (pre-0.15.0)

| Area | Drift | Resolution |
|------|-------|------------|
| README catalog | 166→167 skills, 41→43 commands, 17→18 workflows | Updated in 0.15.0 |
| README workflow table | Missing `implementation_tournament` | Row added |
| `docs/mcp-usage-guide.md` | Missing `feature_program` + `implementation_tournament` in workflow table and `list_workflow_types` prose | Updated |
| `docs/plugin-reference.md` | Stale command counts; missing media/fsi/learning categories; no `pn-best-of-n` | Updated |
| `docs/how-to-use-guide.md` | No best-of-N / tournament prompts | Updated |
| `pn-guide.md` | "21 visible" vs 25; missing palette commands | Updated |
| `workflow-state-schema.md` | Missing `prompt_optimize`, `engine_feature`, `godot_feature`, `feature_program`, `implementation_tournament` | Sections added |
| `index.ts` tool desc | `visual_tweak (5)` vs 4 steps in workflows.ts | Fixed to 4 |
| ADR-0006 | Decision still says skill-only until P2 | Amended: P2 shipped, flag-gated |
| `context-index.json` | `last_reviewed` stale (2026-04-07) | Updated 2026-07-03 |
| No prior audit file | ADR-0002 policy unfulfilled | This document |

## Spot-check (10 artifacts)

| Id | Type | Result |
|----|------|--------|
| `pn-best-of-n` | command | Documented in README workflow table + plugin-reference (was missing) |
| `pn-prompt-optimize` | command | Listed in pn-guide visible palette (was missing) |
| `pn-skeptic` | command | Listed in pn-guide visible palette (was missing) |
| `implementation_tournament` | workflow | Added to mcp-usage-guide + workflow-state-schema |
| `feature_program` | workflow | Added to mcp-usage-guide + workflow-state-schema |
| `pn-program-orchestration` | skill | Referenced by feature_program schema |
| `pn-business-strategy-orchestration` | skill | Already in RUNBOOK; no drift |
| `pn-generative-media-director` | agent | Already in plugin-reference specialists |
| `pn-fsi-analyst-discipline` | skill | fsi category now in plugin-reference |
| `pn-cultural-heritage-research` | skill | Already in plugin-reference orchestration note |

No description-level drift found in spot-check samples beyond missing doc coverage.

## Verification commands

```bash
npm run check:doc-inventory   # via validate
npm run check:context-index
npm run check:ac-traceability
npm run test:full
```

## Resolution

All findings remediated in release **0.15.0**. Regression guard: `scripts/check-doc-inventory.mjs` wired into `npm run validate`.

---

## Q3 closeout (2026-09-17)

Second pass in the same quarter, after catalog growth through **v0.19.4**. Scope per ADR-0002: philosophy skills, always-apply rules, main reference set, plus inventory/CI health. Not a per-skill rewrite. Remediations land in **0.19.5**.

### Method

1. Disk inventory vs README catalog (`check-doc-inventory`) and `list_workflow_types`
2. Body read of nine `alwaysApply` rules, five philosophy skills, and `best-practices.md`
3. Offline link check, content↔plugin sync, `context-index` / artifact status
4. Zod vs TypeBox schema parity for `suggest_model_tier.role`
5. Session retro folder and EVAL.yaml coverage (recorded, not backfilled here)

### Canonical inventory (2026-09-17)

| Artifact | Count |
|----------|-------|
| Skills | 171 (15 categories) |
| Commands | 49 (31 palette-visible including `/pn` stub, 18 `slash: false`) |
| Rules | 35 (9 `alwaysApply: true`) |
| Public agents | 9 |
| Internal agents | 6 |
| Workflow types | 16 public (`godot_feature` / `unreal_feature` internal-only) |
| MCP tools | 29 |
| Skills with `EVAL.yaml` | 12 / 171 |

### High-leverage body pass

| Id | Type | Result |
|----|------|--------|
| `pn-build-gate` | always-apply | Aligned with structured skeptic gates and command-contract acknowledgement |
| `pn-mcp-proactive` | always-apply | Aligned (high-traffic map; full table still RUNBOOK) |
| `pn-orchestrator-lead` | always-apply | Aligned; documents `suggest_model_tier` role `orchestrator` |
| `pn-current-date` | always-apply | Aligned with MCP `health.calendarDateUtc` |
| `pn-agents-md` | always-apply | Aligned with harness-native hard constraints (ADR-0016) |
| `pn-aesthetics-baseline` | always-apply | Aligned with `pn-core://reference/aesthetics-baseline.md` |
| `pn-no-cursor-commit-trailers` | always-apply | Aligned with `docs/commits.md` |
| `pn-visual-indicator` | always-apply | Aligned; emoji `🔺` is canonical |
| `pn-tool-risk-policy` | always-apply | Aligned with 29-tool registry tiers |
| `pn-discipline-philosophy` | skill | Aligned (Lehman / Goodhart / TDD) |
| `pn-orchestration-philosophy` | skill | **Stale:** "Reply yes or add/correct." contradicted `conventions.md` / `pn-build-gate`. Fixed in 0.19.5 |
| `pn-frontend-design-philosophy` | skill | Aligned (page-mode / type-led structure) |
| `pn-backend-philosophy` | skill | Aligned; cites OWASP Top 10:2025 |
| `pn-gamedev-philosophy` | skill | Aligned (fixed timestep / disposal) |
| `best-practices.md` | reference | CWV / WCAG 2.2 / EAA 2026 / prompt-context-loop stack still current |

### Findings (closeout)

| Area | Drift | Resolution |
|------|-------|------------|
| TypeBox `suggest_model_tier.role` | Missing `orchestrator` (Zod had it; Pi native validation rejected the documented role) | Literal added; registry test asserts nested enum parity |
| `pn-guide.md` | 27/28 visible vs 30 submenu + stub = 31; missing `pn-backfill-evals` | Live headlines + map row; `check-doc-inventory` now requires those headlines |
| `docs/plugin-reference.md` | Embedded 25/43 counts; missing palette commands | Counts removed (point at README / `list_commands`); missing commands documented |
| `docs/how-to-use-guide.md` | "~21 user-entry commands" | Pointer to README catalog + `list_commands` |
| ADR-0006 | Status said P2 delivered; Consequences still said "P2 next" | Consequences amended; 0009/0012 counts left as decision-time snapshots |
| `pn-orchestration-philosophy` | Free-text "Reply yes" gate | Structured `ask_question` / `workflow_confirm` |
| `CONTRIBUTING.md` | Claimed `prepare` always runs `build:mcp` | Matches `prepare-root.mjs` (build only when dist missing) |
| `docs/readme/03_three_surfaces.svg` (now `03_four_harnesses.svg`) | "26 tools" | "29 tools" |
| `context-index.json` | `last_reviewed` 2026-09-02 | 2026-09-17 |
| EVAL.yaml | 159/171 skills missing (ADR-0010 advisory) | Recorded; next action `npm run list:eval-backfill` (5-skill local batches) |
| Session retros | Only template + README under `docs/refs/retros/` | Recorded; `/pn-retro` v1 unused, v2 rollup still blocked |
| ADRs since first pass | 0016–0021 landed (harness, Astra, stdio sessions, trajectory replay, step spans, context budget) | No body rewrite; listed for lineage |

CI/sync/offline links were clean on the 0.19.4 tree before remediations. `godot_feature` / `unreal_feature` remain internal engine types by design.

### Recurrence guard

`scripts/check-doc-inventory.mjs` still matches the README **Catalog:** line to disk. It now also requires `pn-guide.md` to contain the **live** submenu / visible / hidden headlines derived from disk (`visible - 1` submenu leaves). That is an assertion of current counts, not a denylist of last quarter's wrong numbers.

### Verification commands

```bash
npm run check:doc-inventory
npm run check:context-index
npm run check:content-sync
npm run check:evals
npm run test --prefix packages/pn-core-mcp
npm run test:full
```
