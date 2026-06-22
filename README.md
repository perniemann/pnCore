<p align="center">
  <img src="plugins/pnCore/assets/pn-logo.svg" width="256" alt="pnCore" />
</p>

# pnCore — v0.14.6

Orchestration pack and MCP server for Cursor. Structured workflows for discovery, planning, skeptic challenge, design, audits, asset creation, and delivery — not a generic prompt pack.

**Catalog:** 166 skills, 9 listed agents + 6 internal orchestration agents, ~24 visible slash commands + ~17 palette-hidden surgical commands (41 total command markdown files), 24 MCP tools, 17 workflow types, plus `pn-core://` resources and prompts. Use `list_skills`, `list_agents`, `list_commands`, `list_rules`, and `list_workflow_types` for the live inventory. Surgical commands (`pn-audit-*`, `pn-typeset`/`pn-colorize`/…) are hidden from the `/` palette via frontmatter `slash: false`; reach them via `get_command("<id>")` or as substeps of the visible umbrellas (`pn-frontend-audit`, `pn-backend-audit`, `pn-visual-tweak`, `pn-polish`, `pn-design`). Palette entries added since consolidation: `/pn-program`, `/pn-retro`, `/pn-prompt-optimize`.

**Best fit:** Teams using Cursor for React, Astro, Next.js, vanilla web, Node backends, Three.js / Babylon / gamedev, n8n, and web3. **Not a fit** for Vue, Svelte, Angular, or Unity — limited or no first-class support. See [docs/plugin-reference.md](docs/plugin-reference.md) for what exists today.

---

## Install

**Prerequisite:** Node.js 22+.

<a id="mcp-any-mcp-client"></a>

### Cursor — MCP (one-click)

[![Install MCP](https://cursor.com/deeplink/mcp-install-dark.svg)](https://cursor.com/en/install-mcp?name=pn-core&config=eyJjb21tYW5kIjoiY21kIiwiYXJncyI6WyIvYyIsIm5weCIsIi15IiwiLS1wYWNrYWdlPWdpdCtodHRwczovL2dpdGh1Yi5jb20vcGVybmllbWFubi9wbkN1cnNvci5naXQjbWFpbiIsIi0tIiwibm9kZSIsInBhY2thZ2VzL3BuLWN1cnNvci1tY3AvZGlzdC9pbmRleC5qcyJdfQ==)

Or add manually to `~/.cursor/mcp.json`:

```json
{
  "mcpServers": {
    "pn-core": {
      "command": "cmd",
      "args": ["/c", "npx", "-y", "--package=git+https://github.com/perniemann/pnCore.git#main", "--", "node", "packages/pn-core-mcp/dist/index.js"]
    }
  }
}
```

**Mac/Linux:** replace `"command": "cmd"` with `"command": "npx"` and drop `"/c"` from `args`. Full config options, path parameters, and the Windows `'pn-core' is not recognized` fix: [packages/pn-core-mcp/README.md](packages/pn-core-mcp/README.md).

### Cursor — Plugin

From your **target project** directory:

```bash
npx github:perniemann/pnCore install
```

Copies commands, rules, skills, agents, config, and hooks into `.cursor/` and `.cursor-plugin/`. Reload Cursor, then run `/pn-new`.

> **MCP or plugin?** pnCore is one product on two surfaces sharing the same content. The **MCP server** holds all executable logic — the `workflow_step` engine plus the other tools — and runs in any MCP client. The **Cursor plugin** adds Cursor-only UX the MCP cannot: the `/` command palette, file-glob rules, the agent selector, and the continual-learning stop hook. Use the MCP for cross-client orchestration; add the plugin for the native Cursor experience. Details: [Plugin vs MCP](packages/pn-core-mcp/README.md#plugin-vs-mcp).

### Claude Code

Use the same MCP JSON above. In Claude Code, open Settings → MCP Servers, paste the block, and enable it. See [Anthropic's MCP documentation](https://docs.anthropic.com/en/docs/claude-code/mcp) for the exact steps.

### Terminal / headless

```bash
git clone https://github.com/perniemann/pnCore.git
cd pnCore
npm run setup           # install deps + build MCP
npm run mcp-config      # write ~/.cursor/mcp.json with absolute node path
```

Reload Cursor after `mcp-config`. After any upgrade, re-run `npm run build:mcp` and reload. The server uses stdio transport only.

---

## Workflows

| Workflow type | When to use | Cursor phrase | MCP entry |
|---------------|-------------|---------------|-----------|
| `project_kickoff` | New project: refs, discovery, PRD, design doc | `/pn-new` → Involved | `workflow_step("project_kickoff", 0, {})` |
| `full_dev` | Build a feature, app, or product end-to-end | `/pn-build` | `workflow_step("full_dev", 0, {})` |
| `design` | Design-first UI: discovery → plan → skeptic → build | `/pn-design` | `workflow_step("design", 0, {})` |
| `frontend_audit` | Scored frontend quality diagnosis + fix roadmap | `/pn-frontend-audit` | `workflow_step("frontend_audit", 0, {})` |
| `backend_audit` | API, security, data, errors, performance audit | `/pn-backend-audit` | `workflow_step("backend_audit", 0, {})` |
| `game_feature` | Three.js / Babylon / Unreal game feature loop | `/pn-build` with game context | `workflow_step("game_feature", 0, {})` |
| `svg_create` | Generate SVG assets or icon sets | `/pn-assets` | `workflow_step("svg_create", 0, {})` |
| `image_create` | AI-image pipeline, placeholders, hero images | `/pn-assets` | `workflow_step("image_create", 0, {})` |
| `visual_tweak` | Bounded design edits (color, type, layout, motion) | `/pn-visual-tweak` | `workflow_step("visual_tweak", 0, {})` |
| `prompt_optimize` | Refine and stress-test a prompt or instruction | `/pn-prompt-optimize` | `workflow_step("prompt_optimize", 0, {})` |
| `feature_program` | Multi-slice hierarchical build (≥2 independent vertical slices in parallel worktrees) | `/pn-program` (preview; requires `featureProgram: true`) | `workflow_step("feature_program", 0, {})` |
| `engine_feature` | Unified UE / Godot feature loop — routes to `unreal_feature` or `godot_feature` via `state.engine` | — | `workflow_step("engine_feature", 0, { engine: "unreal" \| "godot" })` |
| `unreal_feature` | UE 5.7 feature build (deprecation alias for `engine_feature` with `engine: "unreal"`) | — | `workflow_step("unreal_feature", 0, {})` |
| `godot_feature` | Godot 4.x feature build (deprecation alias for `engine_feature` with `engine: "godot"`) | — | `workflow_step("godot_feature", 0, {})` |
| `fsi_analyst_draft` | Financial-services analyst deliverable (DCF, comps, IC memo, model audit) with mandatory human sign-off | — | `workflow_step("fsi_analyst_draft", 0, {})` |
| `business_strategy` | Evidence-led strategy: discovery → grill → pressure-test → HTML + markdown brief | `/pn-strategy` | `workflow_step("business_strategy", 0, {})` |
| `media_director` | Gated generative-media flow: brief → plan → ComfyUI/T2V → human review → delivery | — | `workflow_step("media_director", 0, {})` |

Call `list_workflow_types` for live step counts and current descriptions.

---

## 10-step example: full app or dashboard

This maps the `full_dev` workflow tool steps (0-based) plus your replies to a concrete sequence.

| # | Who | Action |
|---|-----|--------|
| 1 | You | Run `/pn-new` (Cursor) or ask "Start a new project, use the full dev workflow." Choose intent: **full auto**, **design focused**, or **involved**. |
| 2 | Agent | `workflow_step("full_dev", 0)` — discovery questionnaire: purpose, users, stack, references, existing code. Answer each question. |
| 3 | Agent | Prior-art and research pass. Summarizes comparable products and patterns relevant to your stack. |
| 4 | Agent | `workflow_step("full_dev", 2)` — produces roadmap, dev phases, architecture decisions, and a plan document under `docs/plans/`. |
| 5 | You | Review the plan. For **involved** intent, a skeptic challenge runs automatically and you approve before proceeding. |
| 6 | Agent | `workflow_step("full_dev", 3)` — specialist routing. Frontend, backend, testing, and any other specialists are assigned tasks. |
| 7 | Agent | `workflow_step("full_dev", 4)` — specialists build in parallel or sequence. Assets (SVGs, placeholders, images) are created automatically when the build includes UI. |
| 8 | Agent | Optional merge phase (when `mergePhaseFullDev` is enabled): parallel work reconciled, build passes, one integrated summary — still on tool step 5. |
| 9 | Agent | `workflow_step("full_dev", 5)` — review + optimize loop. Quality, performance, and design checked against the plan. |
| 10 | You | Run `/pn-deliver` for contract-grade verification and handoff pack, or `/pn-frontend-audit` for a scored quality gate before ship. |

> Tool steps are 0-based. This table mixes tool steps and your replies — the actual `workflow_step` index is in parentheses. To resume after a disconnect: `workflow_state_save` after any step, then `workflow_state_load` in the new session.

### Variant: design-first web app

Follow the same sequence but start with `workflow_step("design", 0)`. The design workflow runs discovery → plan → skeptic → pn-typeset + pn-colorize + pn-arrange substeps → skeptic-on-output, then hands off to `full_dev`. When MCP is used, step 4 can loop back to build if skeptic-on-output fails: state may include `iterationCount` and, after two failed cycles without resolution, `approval_checkpoint` plus `iterationCapApproved` (see `pn-core://reference/workflow-state-schema.md`). Skills **pn-api-probe** (runtime facts before plan) and **pn-render-verify** (structured read of visual artifacts before skeptic) support `pn-design`. Load `.pncore-design.md` via `/pn-setup` (design context) to ground the agent in your house style.

### Variant: 3D game or interactive experience

Use `workflow_step("game_feature", 0)` for individual feature loops (4 tool steps). For the full build, start with `full_dev` and include your stack (Three.js, Babylon, Unreal) in the discovery answer — the orchestrator routes to `pn-game-developer` automatically. List skills filtered to `gamedev` for available domain skills: `list_skills` with `category: "gamedev"`.

---

## Best practices

Before starting, load the best-practices reference and the aesthetics baseline so the agent has them in context:

- `pn-core://reference/best-practices.md` — a11y, security, performance, orchestration, mobile, WebXR
- `pn-core://reference/aesthetics-baseline.md` — distinctive UI checklist; add the `<frontend_aesthetics>` block to your project's `CLAUDE.md` to enforce it across sessions
- Call `health` first for the current UTC date and capability summary
- `suggest_model_tier` / `workflow_step` **`suggestedModelTier`** — pnCore uses three distinct **tier** concepts: **delivery tier** (MVP/Full), **context tier** (1–4 reading depth), and **model tier** (`fast` / `standard` / `premium` / `premium_thinking`). See `pn-core://reference/delivery-tier-criteria.md` and [packages/pn-core-mcp/README.md](packages/pn-core-mcp/README.md#tools).

Full checklist and companion MCPs: [docs/mcp-usage-guide.md](docs/mcp-usage-guide.md#best-practices).

---

## Documentation

| Guide | What's in it |
|-------|-------------|
| [docs/how-to-use-guide.md](docs/how-to-use-guide.md) | Copy-paste prompts, example flows, MCP-only bootstrap |
| [docs/mcp-usage-guide.md](docs/mcp-usage-guide.md) | MCP tools, resources, workflow patterns, state/handoff/usage |
| [docs/plugin-reference.md](docs/plugin-reference.md) | Rules, skills, agents, commands, hooks, flow reference |
| [packages/pn-core-mcp/README.md](packages/pn-core-mcp/README.md) | MCP config, all 24 tools, env vars, error codes, resources |
| [docs/companion-mcp-catalog.md](docs/companion-mcp-catalog.md) | Companion MCPs (Octocode, Stripe, n8n, etc.) |
| [docs/pitch-to-app-example.md](docs/pitch-to-app-example.md) | Full pitch-to-app example: every feature end-to-end |
| [packages/pn-core-mcp/content/docs/starting-new-project.md](packages/pn-core-mcp/content/docs/starting-new-project.md) | New project kickoff and reference doc setup |
| [CONTRIBUTING.md](CONTRIBUTING.md) | Workspace map, contribution workflow, ADR policy |
| [plugins/pnCore/CHANGELOG.md](plugins/pnCore/CHANGELOG.md) | Release history |

---

## Scripts

From repo root (Node 22+):

| Script | Description |
|--------|-------------|
| `npm run setup` | Install deps, build MCP, install git hooks |
| `npm run build:mcp` | Compile `packages/pn-core-mcp` |
| `npm run sync:content` | Copy canonical `content/` into `plugins/pnCore/` |
| `npm run validate` | Format check + plugin/workflow/skill validators |
| `npm run test:full` | CI-parity: lint, sync, build, coverage, script tests, validate |
| `npm run mcp-config` | Write `~/.cursor/mcp.json` with absolute `node` path |
| `npm run mcp-pin` | Rebuild MCP and refresh global MCP config |

Canonical content lives under `packages/pn-core-mcp/content/` — run `npm run sync:content` after edits there. Layout: [docs/folder-structure.md](docs/folder-structure.md).

---

## Developing pnCore

For contributors: [CONTRIBUTING.md](CONTRIBUTING.md), [docs/commits.md](docs/commits.md), and architecture decisions in [docs/adr/](docs/adr/). Skill categories and authoring conventions: [packages/pn-core-mcp/content/skills/README.md](packages/pn-core-mcp/content/skills/README.md). Session retros: `/pn-retro` → reports under `docs/refs/retros/`.

---

## License

MIT — see [LICENSE](LICENSE).
