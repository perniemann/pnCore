---
title: "ADR-0024: Catalog consolidation, 0.22.0"
updated: 2026-11-21
---

# ADR-0024: Catalog consolidation, 0.22.0

## Status

Accepted

## Context

The catalog grew by addition. A review on 2026-11-21 measured it against the doctrine "one engine, retire rather than accumulate":

- **171 skills.** 14 had no inbound reference from any command, workflow, agent, rule or other skill, and 22 were under 40 lines. Several pairs did one job twice: CI triage and CI fix, test generation and TDD, Unreal MCP and Godot MCP selection, five backend scaffolds that differ only by language.
- **Skill descriptions totalled 36,342 characters.** That is 4.5 times the Codex catalog budget of about 8,000 (ADR-0017). Every skill costs description space in every harness that indexes it.
- **29 tools.** Three Paperclip tools wrapped three endpoints of one resource. `workflow_usage_totals` and `workflow_handoff_read` read trails that `workflow_run_query` already joins (ADR-0020).
- **16 workflow types.** `svg_create` and `image_create` were the same five steps with different state keys, and `image_create` already routed SVG to the SVG skill.
- **49 commands.** `pn-user-stories` and `pn-document` only loaded one skill.

## Decision

1. **Skills 171 → 142.**
   - Delete seven stubs with no references: `pn-analytics-reporting`, `pn-financial-analysis`, `pn-risk-monitor`, `pn-community-engagement`, `pn-growth-experiments`, `pn-workflow-reporter`, `pn-game-feature`. Their content repeats `pn-build-gate`, `workflow_run_query`, or a workflow's own steps.
   - Merge sixteen skills into an existing skill as a section, keeping their content: `pn-test-generation` into `pn-tdd`, `pn-ci-triage` into `pn-ci-fix`, `pn-job-stories` and `pn-sprint-prioritization` into `pn-user-stories`, `pn-ui-design-specs` into `pn-design-system`, `pn-placeholder` into `pn-frontend-scaffolding`, `pn-babylon-scaffolding` into `pn-babylon-dev`, `pn-trend-research` into `pn-idea-miner`, `pn-tooling-mcp-maintenance` into `pn-create-mcp-architecture`, `pn-domain-language` into `pn-create-domain-doc`, `pn-browser-runtime-verify` into `pn-evidence-qa`, `pn-compliance-check` into `pn-agent-governance`, `pn-content-strategy` into `pn-copywriter`, both Paperclip agent skills into `pn-paperclip`, and `pn-svg-creator` into `pn-image-creator` with its eval scenarios.
   - Fold `pn-go-`, `pn-php-`, `pn-python-`, `pn-ruby-` and `pn-rust-scaffolding` into `pn-backend-scaffolding`. Each language moves to `references/<lang>.md`, served as an MCP resource (for example `pn-core://skills/backend/pn-backend-scaffolding/python.md`), so a load pays for one language, not five. `pn-engine-mcp` is new and ships with its own `EVAL.yaml`.
   - Replace `pn-unreal-mcp` and `pn-godot-mcp` with `pn-engine-mcp`, one section per engine. `engine_feature` step 0 loads it for either engine.
   - Move `pn-budget-cost-monitor` to `orchestration/`; the `support/` category is empty and goes.
   - Wire the two orphans worth keeping: `pn-audit-api` loads `pn-graphql` for GraphQL APIs, and `pn-web3-security` points at `pn-web3-contracts`.
2. **Tools 29 → 25.**
   - `paperclip_issue` with `action: "checkout" | "comment" | "update"` replaces `paperclip_issue_checkout`, `paperclip_issue_comment` and `paperclip_issue_update`. `comment` requires `body`; `update` requires `status`. The handler refuses a missing field with `INVALID_STATE` before any HTTP call.
   - Retire `workflow_usage_totals` and `workflow_handoff_read`. `workflow_run_query` with `kinds: ["handoff"]` returns the handoff lines. With `kinds: ["usage"]` or `timeline: true` it returns a `usage` summary (lines, token sums, cost sum or null, and the `PNCORE_USAGE_WARN_INPUT_TOKENS` warning).
3. **Workflow types 16 → 15.** `image_create` absorbs `svg_create`. Step 0 asks the format and records `imageSpec.format` (`png` or `svg`); SVG writes its spec to `docs/svg/` at step 1 and hand-authors through `pn-svg` at step 2. Step 2 moves to the premium tier, because SVG authoring is reasoning. `workflow_step("svg_create", …)` returns an error that names the replacement.
4. **Commands 49 → 47.** Delete `pn-user-stories` and `pn-document`. Callers load the skill: `get_skill("pn-user-stories")`, `get_skill("pn-documentation")`.
5. **No aliases.** pnCore is pre-1.0, and this ships as a minor release (0.22.0) with the removals listed in the CHANGELOG. An alias layer would keep the old surface alive and cost the description budget this change exists to recover.

## Consequences

- A downstream prompt, rule or script that calls a removed tool, workflow type, command or skill id breaks. The CHANGELOG maps every removal to its replacement.
- Skill descriptions drop to about 31,000 characters. That is still about four times the Codex budget. This ADR does not fix discovery size; MCP-first packaging, a small set of router skills in harness skill folders with the rest behind `get_skill`, needs its own ADR.
- `workflow_run_query` reads the usage and handoff trails at their configured paths only (`.pncore/usage.jsonl`, `PNCORE_HANDOFF_LOG`). The per-call `path` override of the retired read tools is gone; `report_usage` and `workflow_handoff_append` still accept one, and a custom path is no longer summed.
- `image_create` step 2 runs on the premium tier for PNG too. The instruction sends PNG generation to the image tool, so the tier mostly pays for SVG authoring.
- The README Honest edges table now names what the catalog does not back: non-Node backends, web3, Unreal and Godot through third-party MCP servers, and the manually invoked mobile, visionOS and WebXR agents. web3 leaves the best-fit list.

## Alternatives rejected

- **Keep the old tool names as aliases for one release.** The tool count and descriptions stay inflated for that release, and nothing in the engine forces callers to migrate.
- **Inline all five backend languages into one `SKILL.md`.** About 1,200 lines on every load, most of it for languages the project does not use.
- **One `list_content` / `get_content` pair for all eight list and get tools.** Every workflow instruction calls `get_skill`; that change touches every step and earns its own ADR.
