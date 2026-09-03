# AGENTS.md

Persistent memory for this workspace. Updated from transcript deltas by pn-continual-learning.

## Learned User Preferences

- Never add trailer "Co-authored-by: Cursor <cursoragent@cursor.com>" or any "Made-with: Cursor" (or similar IDE) line to commits
- Contributors: run `git config core.hooksPath .githooks` so `prepare-commit-msg` strips those lines automatically (see `docs/commits.md`); workspace rule `.cursor/rules/pn-no-cursor-commit-trailers.mdc` (`alwaysApply`) reduces agent-injected trailers; canonical copy ships as MCP rule `pn-no-cursor-commit-trailers` for other projects (pn-setup / pn-new)
- Always terminate running servers before starting a new one
- Avoid hedging: "possibly", "should", "could", "might" are not acceptable; use definitive statements
- Prefer plans before implementation; implement plans as specified without editing the plan file
- Commit when work is done; push only when the user explicitly asks
- When user asks for verification, confirm everything works before claiming completion
- On Windows PowerShell: use `;` for command chaining (not `&&`); use `Get-ChildItem -Force | Select-Object Mode,Name,Length` instead of `ls -la`; use `Test-Path` + `Get-Item .FullName` to verify paths; use `Where-Object` and `-match` (case-insensitive by default) for filtering. Do not blindly translate Unix shell snippets — check the cmdlet first
- When a `/pn-*` command is invoked but the user's actual request does not match that command's contract, **state the mismatch in plain prose in the first response** ("You invoked `/X` but the ask is `Y`; I'll re-route to `Z` unless you'd rather I run `X` as written") before re-routing. Silent re-routing is a `RULE-MISS:acknowledge-command-mismatch` per `pn-build-gate` § Command-contract acknowledgement; the `[pn-command] ▲` start marker still applies during the re-route. Canonical rule: `pn-build-gate` § Command-contract acknowledgement

## Learned Workspace Facts

- pnCore: plugin and MCP for Cursor IDE (orchestration, skills, agents, commands, rules)
- Canonical content source: packages/pn-core-mcp/content/; run npm run sync:content to update plugin
- Plugin at plugins/pnCore/; MCP server at packages/pn-core-mcp/
- Octocode used as companion MCP for code research (prior-art, tracing, LSP tools)
- Open repo root for plugin + MCP; open plugins/pnCore for plugin-only workspace
- npm run validate runs Prettier **format:check** first, then all plugin/workflow validators (run **`npm run format`** to fix TS/scripts style before commit)
- `npm run test:full` matches CI **Sync MCP content** (lint, `sync:content`, `build:mcp`, test coverage, script tests, and full `validate`); use it before push when you change the MCP package, root scripts, or content sync
- install-to-project.mjs: when run from repo root, writes root manifest pointing at plugins/pnCore
- Context handoff manifest: docs/refs/context-index.json (+ schema, optional `artifacts` array since 1.3.0); npm run check:context-index; npm run check:artifact-status; npm run check:ac-traceability (in validate); see docs/refs/README.md
- Cold-session packet: MCP tool `project_context` (modes operator|agent) — call at session start per `pn-mcp-proactive`; do not rely on Cursor sessionStart inject (optional fail-open canary only)
- Hard HITL MCP: approval_checkpoint tool + PNCORE_APPROVAL_TOKEN in MCP server env (see packages/pn-core-mcp/README.md)
- Current date for dated output: MCP **`health`** returns **`calendarDateUtc`** and **`timestampUtc`** (server clock, UTC). Best-practices reference: **`pn-core://reference/best-practices.md`**. Rule **`pn-current-date`** (always apply) encodes this for the plugin
- House UI context for this repo: **`.pncore-design.md`** at the workspace root; global aesthetics stance in **`CLAUDE.md`**. Aesthetics checklist resource: **`pn-core://reference/aesthetics-baseline.md`**. Rule **`pn-aesthetics-baseline`** (always apply) ships with the plugin for downstream projects
- `engines.node >= 22` (Node 20 EOL April 2026); `.nvmrc` = 22; CI uses Node 22
- `list_skills` without filters returns category index (total + counts + top-3 per category), not the full skill list; use `category`, `filter`, or `limit` to drill in; `limit=0` for full list
- Knowledge distribution: see `CONTRIBUTING.md` for the workspace map; architecture decisions live in `docs/adr/NNNN-*.md` (Nygard format). Bus-factor mitigation: every non-obvious decision gets an ADR
- Skill/rule rot guard: ADR-0002 sets a quarterly audit cadence (Lehman's Laws). Outputs land in `docs/refs/audit-YYYY-Qn.md`. Pairs with `pn-continual-learning` (transcript-side) for full-loop maintenance
- Root `.gitignore` entry `.pncore/*` only ignores the **repository root** `.pncore/` tree; if the MCP or tests use CWD `packages/pn-core-mcp/`, add `packages/pn-core-mcp/.pncore/` (or a broader `**/.pncore/*` policy) so local logs and test state are not committed by mistake
- Validators that scan `packages/pn-core-mcp/src/index.ts` for tool registration must use the real helper name: tools are registered with `regTool(` (not `server.tool(`), so scripts such as `validate-workflow-enums.mjs` must search for the same string or CI can fail with “missing tool block”
- MCP tool responses use compact JSON (no pretty-print); Paperclip workflow hint in terminal workflow steps is conditional on `PAPERCLIP_API_URL` + `PAPERCLIP_API_KEY`
- Session retros: invoke `/pn-retro` (skill `pn-session-retro` under `content/skills/learning/`) for blameless session retrospectives; reports land under `docs/refs/retros/` and feed the quarterly audit per ADR-0002; v1 is manual-only (no stop hook, no auto-diffs), v2 exit criteria documented in the SKILL's `## Deferred to v2` section
- Business-strategy market evidence: when `host_websearch` / `host_webfetch` is the only market-evidence source (no FRED, Alpha Vantage, or Tavily MCP companion bound), spot-check at least 3 random citations before locking the verdict — the `audit` option at `pn-business-strategy-orchestration` step 7 exists for exactly this case and is now pre-selected as the default in that configuration; treat it as mandatory, not optional
- `/pn-strategy` and any `workflow_step` call use **camelCase params**: `workflowType` and `step` (not `workflow_type` / `workflow_step`); the workflow-type enum is defined at `packages/pn-core-mcp/src/index.ts` `workflowTypeEnum` and includes `business_strategy`; if `list_workflow_types` on a downstream MCP install does not list it, the install is stale — fall back to the orchestration-skill-only path documented in `commands/pn-strategy.md`
- Consumer-project gating (ADR-0015): MCP gates `workflow_step` in chat only — it never owns the GitHub Merge button. `/pn-setup` / `/pn-new` in git repos write the trailer Cursor rule **and** portable `.githooks` (optional trailer-only Actions workflow, ask first). They set `core.hooksPath` only when it is unset or already `.githooks`; an existing Husky/Lefthook path is left in place (compose, or `--replace-hooks-path` after a yes). They do **not** copy this repo’s `pn-gates` / automerge / branch protection. Canonical: `pn-core://reference/consumer-gating.md`; installer `scripts/install-consumer-gating.mjs`
- pnCore uses **three distinct "tier" concepts** — do not conflate them: (1) **delivery tier** = MVP/Full (see `pn-core://reference/delivery-tier-criteria.md`), drives verifier strictness in pn-deliver; (2) **context tier** = 1–4 reading depth (see `pn-context-engineering`), drives how much code/docs to load; (3) **model tier** = fast/standard/premium/premium_thinking/long_horizon (see `packages/pn-core-mcp/src/model-tiers.ts`), drives LLM choice per workflow step and loop orchestration (`suggest_model_tier` role `orchestrator` → long_horizon / Fable). Loop patterns: `pn-core://reference/loop-orchestration-guide.md` and `pn-core://reference/loop-catalog/README.md`. The `suggest_model_tier` MCP tool and `WorkflowStepResult.suggestedModelTier` field surface the model tier; override via `PNCORE_FEATURES` keys `modelTierOverrides` (per-step) and `tierAliases` (global remap, e.g. `{"premium_thinking":"premium"}` or `{"long_horizon":"premium"}` when Fable is unavailable)
