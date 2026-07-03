---
title: "Quarterly audit — 2026 Q3"
updated: 2026-07-03
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
