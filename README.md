<p align="center">
  <img src="plugins/pnCore/assets/pn-logo.svg" width="256" alt="pnCore" />
</p>

# pnCore — v0.17.0

**pnCore** is an orchestration pack and MCP server for AI-assisted software delivery in Cursor. It ships structured workflows — discovery, planning, skeptic challenge, design, audits, asset creation, and delivery — backed by skills, agents, rules, and a deterministic `workflow_step` engine. It is not a generic prompt pack.

One product, three surfaces:

- **MCP server** (`packages/pn-core-mcp/`) — executable logic: workflows, tools, resources (`pn-core://`), gates, and state. Runs in any MCP client.
- **Pi native extension** — same 24 tools via `pi.registerTool()` when you `pi install git:…/pnCore` (no subprocess MCP on Pi).
- **Cursor plugin** (`plugins/pnCore/`) — native Cursor UX: slash commands, file-glob rules, agent selector, hooks. Installed into your project with `npx github:perniemann/pnCore plugin-install`.

Canonical content lives in `packages/pn-core-mcp/content/` and syncs into the plugin via `npm run sync:content`. Edit canonical files only; never hand-edit the plugin copy.

**Catalog:** 167 skills, 9 public agents + 6 internal orchestration agents, 28 visible slash palette files (27 under **`pn`** submenu + **`/pn`** stub) + 18 palette-hidden surgical commands (46 command files total), 24 MCP tools, 16 workflow types, plus `pn-core://` resources and prompts.

**Best fit:** Teams building with Cursor on React, Astro, Next.js, vanilla web, Node backends, Three.js / Babylon / gamedev, n8n, and web3. **Limited support** for Vue, Svelte, Angular, and Unity. See [docs/plugin-reference.md](docs/plugin-reference.md) for the full inventory.

---

## Install

**Prerequisite:** Node.js 22+.

<a id="mcp-any-mcp-client"></a>

### Cursor — MCP (one-click)

[![Install MCP](https://cursor.com/deeplink/mcp-install-dark.svg)](https://cursor.com/en/install-mcp?name=pn-core&config=eyJjb21tYW5kIjoibnB4IiwiYXJncyI6WyIteSIsIi0tcGFja2FnZT1naXQraHR0cHM6Ly9naXRodWIuY29tL3Blcm5pZW1hbm4vcG5Db3JlLmdpdCNtYWluIiwiLS0iLCJwbi1jb3JlIl19)

Or add manually to `~/.cursor/mcp.json`:

```json
{
  "mcpServers": {
    "pn-core": {
      "command": "npx",
      "args": ["-y", "--package=git+https://github.com/perniemann/pnCore.git#main", "--", "pn-core"]
    }
  }
}
```

**Windows:** if `npx` fails from MCP settings, use `"command": "cmd"` with `"/c"` before `npx` in `args` (same trailing `-- pn-core`). Config options and troubleshooting: [packages/pn-core-mcp/README.md](packages/pn-core-mcp/README.md).

### Cursor — Plugin

From your **target project** directory:

```bash
npx github:perniemann/pnCore plugin-install
```

Copies commands, rules, skills, agents, config, and hooks into `.cursor/` and `.cursor-plugin/`. Reload Cursor, then run `/pn-new`.

> **MCP or plugin?** Use the MCP for cross-client orchestration and headless workflows. Add the plugin when you want the native Cursor experience (slash palette, rules, agents, stop hook). Details: [Plugin vs MCP](packages/pn-core-mcp/README.md#plugin-vs-mcp).

### pi.dev (Pi coding agent)

Install pnCore as a [Pi package](https://github.com/badlogic/pi-mono/blob/main/packages/coding-agent/docs/packages.md) for flat slash prompt templates (`/pn-build`, `/pn-design`, …), skills, and **native pn-core tools** (`health`, `get_skill`, `workflow_step`, …) via `pi.registerTool()`:

```bash
pi install git:github.com/perniemann/pnCore@main
```

From a local clone (contributors):

```bash
pi install .    # repo root — prompts, skills, and all 24 native tools (run npm run build:mcp first)
pi install ./plugins/pnCore    # prompts + skills only (no native tools)
```

**Note:** Pi has no nested `/pn` submenu — commands appear as a flat list. Type `/pn` for the orientation router, or `/pn-build` etc. directly. Native tools ship with `pi install git:…/pnCore` or `pi install .` from repo root; no separate MCP subprocess required on Pi. Cursor and Claude Code still use the stdio MCP server. See [ADR-0008](docs/adr/0008-command-palette-pn-submenu.md) and [ADR-0009](docs/adr/0009-pi-native-tools.md).

### Claude Code

Use the same MCP JSON above. In Claude Code, open Settings → MCP Servers, paste the block, and enable it. See [Anthropic's MCP documentation](https://docs.anthropic.com/en/docs/claude-code/mcp).

### Clone and develop locally (pnCore contributors only)

```bash
git clone https://github.com/perniemann/pnCore.git
cd pnCore
npm run setup              # install deps + build MCP
npm run mcp-config:dev     # DEV ONLY: local absolute node path (this machine)
```

For portable install on any machine, use the **one-click deeplink** or MCP JSON above — not `mcp-config:dev`.

Reload Cursor after changing MCP config. After upgrades on a dev checkout, re-run `npm run build:mcp` and reload. The server uses stdio transport only.

---

## Quick start

1. Install MCP and/or plugin (above).
2. Call `health` — confirms server version, UTC date, and capabilities.
3. **New repo or greenfield:** `/pn-new` or `workflow_step("project_kickoff", 0, {})` — discovery, refs, PRD, and design docs under `docs/refs/`; when kickoff is done, continue with step 4.
4. **Build or extend:** `/pn-build` or `workflow_step("full_dev", 0, {})` — skips kickoff when the project already has context; use this for features in an existing codebase.
5. Before ship: `/pn-deliver` or `/pn-frontend-audit`.

Copy-paste prompts and scenario flows: [docs/how-to-use-guide.md](docs/how-to-use-guide.md).

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
| `feature_program` | Multi-slice hierarchical build (≥2 vertical slices in parallel worktrees) | `/pn-program` (preview; `featureProgram: true`) | `workflow_step("feature_program", 0, {})` |
| `engine_feature` | Unified UE / Godot loop via `state.engine` | — | `workflow_step("engine_feature", 0, { engine: "unreal" \| "godot" })` |
| `unreal_feature` | UE 5.7 feature build (alias for `engine_feature`) | — | `workflow_step("unreal_feature", 0, {})` |
| `godot_feature` | Godot 4.x feature build (alias for `engine_feature`) | — | `workflow_step("godot_feature", 0, {})` |
| `fsi_analyst_draft` | Financial-services deliverable with mandatory human sign-off | — | `workflow_step("fsi_analyst_draft", 0, {})` |
| `business_strategy` | Evidence-led strategy → HTML + markdown brief | `/pn-strategy` | `workflow_step("business_strategy", 0, {})` |
| `media_director` | Gated generative-media: brief → plan → produce → review | — | `workflow_step("media_director", 0, {})` |
| `implementation_tournament` | Competing implementations in isolated worktrees (2–3 paths, objective gates, premium judge) | `/pn-best-of-n` (`bestOfN.enabled: true`) | `workflow_step("implementation_tournament", 0, {})` |

Call `list_workflow_types` for live step counts and descriptions.

---

## Example: full app build (`full_dev`)

Maps `full_dev` tool steps (0-based) plus your replies.

| # | Who | Action |
|---|-----|--------|
| 1 | You | `/pn-new` or "Start a new project with full dev workflow." Choose **full auto**, **design focused**, or **involved**. |
| 2 | Agent | `workflow_step("full_dev", 0)` — discovery: purpose, users, stack, references, existing code. |
| 3 | Agent | Prior-art and research pass for your stack. |
| 4 | Agent | `workflow_step("full_dev", 2)` — roadmap, phases, architecture, plan under `docs/plans/`. |
| 5 | You | Review plan. **Involved** intent runs skeptic challenge; approve before build. |
| 6 | Agent | `workflow_step("full_dev", 3)` — specialist routing (frontend, backend, testing, …). |
| 7 | Agent | `workflow_step("full_dev", 4)` — specialists build; UI assets created when in scope. |
| 8 | Agent | Optional merge phase (`mergePhaseFullDev`): reconcile parallel work, verify build. |
| 9 | Agent | `workflow_step("full_dev", 5)` — review + optimize against the plan. |
| 10 | You | `/pn-deliver` for handoff pack, or `/pn-frontend-audit` for a scored quality gate. |

> Tool steps are 0-based. Resume after disconnect: `workflow_state_save` then `workflow_state_load`. Schema: `pn-core://reference/workflow-state-schema.md`.

### Design-first variant

Start with `workflow_step("design", 0)` instead of `full_dev`. Loads `.pncore-design.md` via `/pn-setup` for house style. Skills **pn-api-probe** and **pn-render-verify** support design verification before skeptic-on-output.

### Game / 3D variant

`workflow_step("game_feature", 0)` for feature loops. For full builds, use `full_dev` and name your stack in discovery — routes to `pn-game-developer`. Domain skills: `list_skills` with `category: "gamedev"`.

---

## Best practices

Load these before a build session:

- `pn-core://reference/best-practices.md` — a11y, security, performance, orchestration, mobile, WebXR
- `pn-core://reference/aesthetics-baseline.md` — distinctive UI checklist; mirror in your project's `CLAUDE.md` via `<frontend_aesthetics>`
- `health` — current UTC date and capability summary
- **Three tier concepts:** **delivery tier** (MVP/Full), **context tier** (1–4 reading depth), **model tier** (`fast` / `standard` / `premium` / `premium_thinking`). See `pn-core://reference/delivery-tier-criteria.md` and [MCP tools](packages/pn-core-mcp/README.md#tools).

Companion MCPs and full checklist: [docs/mcp-usage-guide.md](docs/mcp-usage-guide.md#best-practices).

---

## Documentation

| Guide | What's in it |
|-------|-------------|
| [docs/how-to-use-guide.md](docs/how-to-use-guide.md) | Copy-paste prompts, example flows, MCP-only bootstrap |
| [docs/mcp-usage-guide.md](docs/mcp-usage-guide.md) | MCP tools, resources, workflow patterns, state/handoff |
| [docs/plugin-reference.md](docs/plugin-reference.md) | Rules, skills, agents, commands, hooks |
| [packages/pn-core-mcp/README.md](packages/pn-core-mcp/README.md) | MCP config, 24 tools, env vars, error codes, resources |
| [docs/companion-mcp-catalog.md](docs/companion-mcp-catalog.md) | Companion MCPs (Octocode, Stripe, n8n, …) |
| [docs/pitch-to-app-example.md](docs/pitch-to-app-example.md) | End-to-end pitch-to-app walkthrough |
| [packages/pn-core-mcp/content/docs/starting-new-project.md](packages/pn-core-mcp/content/docs/starting-new-project.md) | Kickoff and `docs/refs/` setup |
| [CONTRIBUTING.md](CONTRIBUTING.md) | Workspace map, PR workflow, ADR policy |
| [plugins/pnCore/CHANGELOG.md](plugins/pnCore/CHANGELOG.md) | Release history |

---

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

---

## Developing pnCore

Contributors: [CONTRIBUTING.md](CONTRIBUTING.md), [docs/commits.md](docs/commits.md), [docs/adr/](docs/adr/). Skill authoring: [packages/pn-core-mcp/content/skills/README.md](packages/pn-core-mcp/content/skills/README.md). Session retros: `/pn-retro` → `docs/refs/retros/`.

After editing `packages/pn-core-mcp/content/`, run `npm run sync:content` before commit. CI runs `npm run test:full` on content changes.

---

## License

MIT — see [LICENSE](LICENSE).
