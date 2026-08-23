# Contributing to pnCore

## Repo layout

- **Canonical content:** `packages/pn-core-mcp/content/` (skills, commands, rules, reference). **Do not** edit the copies under `plugins/pnCore/` by hand; run `npm run sync:content` after changing canonical content.
- **MCP server:** `packages/pn-core-mcp/`
- **Cursor plugin:** `plugins/pnCore/` (generated/synced from content)

## Setup

- **Node:** `engines.node >= 22` (see `.nvmrc`). Use `nvm use` or align your toolchain.
- **First-time setup:** run `npm run setup` once after clone — installs deps, builds the MCP package, and configures git hooks (strips IDE co-author trailers on commit, see `docs/commits.md`).
- **`prepare` lifecycle note:** `package.json` has a `prepare` script (`node scripts/sync-version.mjs && npm run build:mcp`). This runs automatically on `npm install` — it syncs the version and rebuilds the MCP package. This means a bare `npm install` takes ~10–15 s on first run. Run `npm install --ignore-scripts` if you only want to install packages without a full build.

## Before you PR

- Run `npm run format` if Prettier flags issues, then `npm run validate` (format check + plugin/workflow validators).
- For content changes: edit `packages/pn-core-mcp/content/` only, then `npm run sync:content` so the plugin stays in sync.

## Resource lifecycle (publish, assess, rollback)

Canonical skills, rules, agents, commands, and reference live under **`packages/pn-core-mcp/content/`**. Treat changes like versioned product artifacts:

1. **Edit** only the canonical tree; **do not** hand-edit `plugins/pnCore/` to change shipped content—update `packages/pn-core-mcp/content/` and run `npm run sync:content`.
2. **Assess** locally: `npm run format` as needed, then `npm run validate`. For MCP package, root scripts, or broad content changes, prefer `npm run test:full` before push (matches CI depth). Merge gates include `npm run check:evals` and `npm run check:links` (escapes: `PNCORE_STRICT_EVALS=0` / `PNCORE_STRICT_LINKS=0` for local WIP only).
3. **Publish** by merging through normal review; **lineage** is git history; **rollback** is `git revert` or restoring from a tag.
4. **Workflows** (orchestrated runs) use **skeptic gates** on plans and outputs; optional **hard HITL** uses `approval_checkpoint` when MCP env requires it—see MCP README and RUNBOOK.
5. **New skills:** a sibling `EVAL.yaml` is **required** in CI (`npm run scaffold:eval -- <id>`; schema in `pn-core://reference/eval-convention.md`). Optional frontmatter `owner:` names a maintainer. We do **not** use GitHub `CODEOWNERS` here — without real teams it blocks PRs; ADR-0001 also rejected fragile ownership-glob validators (see [ADR-0010](docs/adr/0010-skill-evals-and-link-checking.md)).
6. **Backfill existing skills (local agents):** ranked batches via `npm run list:eval-backfill` and `/pn-backfill-evals` — contract in `pn-core://reference/eval-backfill.md`. Do not mass-stub.

Product stance: we borrow **lifecycle and governance discipline** from agent-protocol research **without** adopting a second in-repo protocol (see [ADR-0003](docs/adr/0003-governance-without-agp-protocol.md)).

## Knowledge map (bus factor)

- **Engineering discipline:** `packages/pn-core-mcp/content/skills/discipline/pn-discipline-philosophy/SKILL.md` (TDD, review, performance baselines).
- **Orchestration:** `packages/pn-core-mcp/content/skills/orchestration/pn-orchestration-philosophy/SKILL.md` (scope, prior art, plans, spec vs reality).
- **Skeptic / plan challenge:** `packages/pn-core-mcp/content/skills/orchestration/pn-skeptic-challenge/SKILL.md` (inversion, alternatives).
- **Context, docs, ship:** `pn-context-engineering`, `pn-source-driven-implementation`, `pn-browser-runtime-verify`, `pn-deprecation-and-removal`, `pn-ship-checklist` under `content/skills/` (see `content/skills/README.md` for categories and optional “gate skill” authoring patterns).
- **Skill security (SkillSpector):** After editing skills, run `npm run validate:skill-security` (requires `pip install skillspector`). CI enforces `block_dni` (no DO_NOT_INSTALL). See `pn-writing-skills` § SkillSpector hygiene and the CAUTION output from `validate-skill-security.mjs`.
- **RAG quality and token economics:** `packages/pn-core-mcp/content/skills/integrations/pn-rag-evaluation/SKILL.md`; `packages/pn-core-mcp/content/skills/support/pn-budget-cost-monitor/SKILL.md` (with `pn-context-engineering` for context cost).
- **Cross-cutting checklist:** `packages/pn-core-mcp/content/reference/best-practices.md` (resource `pn-core://reference/best-practices.md`).
- **Non-obvious product/architecture decisions:** `docs/adr/NNNN-*.md` (see the seed ADR `docs/adr/0001-record-architecture-decisions.md`).

## Session retros

After a session that felt off (user corrections, reverted work, skipped verification, hallucinated paths), invoke `/pn-retro` (skill: [`pn-session-retro`](packages/pn-core-mcp/content/skills/learning/pn-session-retro/SKILL.md)) to produce a blameless retrospective. Reports land under [`docs/refs/retros/`](docs/refs/retros/README.md) and feed the quarterly skill/rule audit per [ADR-0002](docs/adr/0002-skill-rule-audit-cadence.md).

## Scripts

From repo root (Node 22+):

| Script | Description |
|--------|-------------|
| `npm run setup` | Install deps, build MCP, configure git hooks |
| `npm run build:mcp` | Compile `packages/pn-core-mcp` |
| `npm run sync:content` | Sync canonical `content/` → `plugins/pnCore/` |
| `npm run validate` | Format check + plugin/workflow/skill validators |
| `npm run test:full` | CI parity: lint, sync, build, coverage, script tests, npx smoke, validate |
| `npm run mcp-config:portable` | Contributor convenience: write npx git entry to `~/.cursor/mcp.json` |
| `npm run mcp-config:dev` | DEV ONLY: local absolute `node` path for this clone |
| `npm run mcp-pin` | Rebuild MCP and refresh dev MCP config |
| `npm run check:mcp` | Validate pn-core MCP config (flags non-portable paths) |
| `npm run smoke:npx-mcp` | Smoke test npx git install connect + health |
| `npm run bench` | CPU baseline check (`bench:write` to persist) |
| `npm run measure-tokens` | Token budget capture (`measure-tokens:write` to persist) |
| `npm run dashboard` | Local metrics dashboard at `http://localhost:4173/` |

Repo layout: [docs/folder-structure.md](docs/folder-structure.md).

## Developing pnCore

Clone and develop locally (contributors only):

```bash
git clone https://github.com/perniemann/pnCore.git
cd pnCore
npm run setup              # install deps + build MCP
npm run mcp-config:dev     # DEV ONLY: local absolute node path (this machine)
```

For portable install on any machine, use the **one-click deeplink** or MCP JSON in the [root README](README.md#install) — not `mcp-config:dev`.

Reload Cursor after changing MCP config. After upgrades on a dev checkout, re-run `npm run build:mcp` and reload. The server uses stdio transport only.

Skill authoring: [packages/pn-core-mcp/content/skills/README.md](packages/pn-core-mcp/content/skills/README.md). Commits: [docs/commits.md](docs/commits.md). ADRs: [docs/adr/](docs/adr/). Session retros: `/pn-retro` → `docs/refs/retros/`.

After editing `packages/pn-core-mcp/content/`, run `npm run sync:content` before commit. CI runs `npm run test:full` on content changes.

## Escalation

- Open an issue or discussion on the project tracker with scope, spec vs observed behavior, and exact repro or verification command.

When in doubt, prefer small, reviewable changes and document decisions in ADRs for anything that would surprise the next maintainer.
