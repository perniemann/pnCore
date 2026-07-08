# pn-core-mcp

MCP server for [pnCore](https://github.com/perniemann/pnCore) **0.17.2**: same skills, agents, commands, and rules as the Cursor plugin, plus **`workflow_step`** and related tools. Use from any MCP client to run orchestration, discovery, skeptic, audits, assets, and other pnCore workflows without installing the plugin.

## Installation

**Install (Cursor)** — one-click deeplink (same badge as [repo README](../../README.md#mcp-any-mcp-client)):

[![Install MCP](https://cursor.com/deeplink/mcp-install-dark.svg)](https://cursor.com/en/install-mcp?name=pn-core&config=eyJjb21tYW5kIjoibnB4IiwiYXJncyI6WyIteSIsIi0tcGFja2FnZT1naXQraHR0cHM6Ly9naXRodWIuY29tL3Blcm5pZW1hbm4vcG5Db3JlLmdpdCNtYWluIiwiLS0iLCJwbi1jb3JlIl19)

Or use `cursor://` in-app: `cursor://anysphere.cursor-deeplink/mcp/install?name=pn-core&config=eyJjb21tYW5kIjoibnB4IiwiYXJncyI6WyIteSIsIi0tcGFja2FnZT1naXQraHR0cHM6Ly9naXRodWIuY29tL3Blcm5pZW1hbm4vcG5Db3JlLmdpdCNtYWluIiwiLS0iLCJwbi1jb3JlIl19`

Default uses `npx --package` + the **`pn-core` bin** (via `-- pn-core`) so npx resolves the entry inside the install tree. Do **not** use `node packages/pn-core-mcp/dist/index.js` in npx configs — that path is relative to the MCP host’s working directory, not the package. Run `npm run mcp-deeplink` from repo root to regenerate links if the config changes.

**Manual MCP configuration**

Add to your MCP config (e.g. `~/.cursor/mcp.json` or Cursor Settings → MCP):

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

**Windows:** if MCP cannot launch `npx` directly, use `"command": "cmd"` with `"/c"` before `npx` in `args` (keep the same trailing `-- pn-core`).

### Windows: if you still see `'pn-core' is not recognized`

Use the **`--package=git+…`** form with **`-- pn-core`** (as above). Older configs that ran `npx -y git+...` **without** `--package` tried to execute the bin name without putting the install’s `.bin` on PATH — that fails on Windows. Do **not** switch to `node packages/pn-core-mcp/dist/index.js`; that breaks on all platforms for the same CWD reason.

**Do not** use `node packages/pn-core-mcp/dist/index.js` after `--` — that path is resolved from **Cursor's cwd** (often your home directory), not the npx install, and fails with `Cannot find module '…\\Users\\you\\packages\\pn-core-mcp\\dist\\index.js'`.

**Reliable fix (clone + node path — developers only):** From this repo root run:

```bash
npm run build:mcp
npm run mcp-config:dev
```

Then reload Cursor. `mcp-config:dev` writes your global `~/.cursor/mcp.json` (or `%USERPROFILE%\.cursor\mcp.json`) with `"command": "node"` and the absolute path to `packages/pn-core-mcp/dist/index.js`. **This path is machine-specific** — do not copy to other PCs. For portable install use the **one-click deeplink** or README MCP JSON.

**Stable Node binary:** Cursor uses whatever `node` is first on PATH. To pin Node 22, set **`PNCORE_MCP_NODE`** to the full path to `node.exe`, then run `npm run mcp-config:dev` — the written `command` will be that path.

**If MCP logs `ERR_UNSUPPORTED_DIR_IMPORT` / `ERR_MODULE_NOT_FOUND` … `zod/v3` or `zod/v4`:** Use **Node 22** (`PNCORE_MCP_NODE` or `npm run mcp-pin`). From repo root run **`npm run build:mcp`** (`npm dedupe` + **`scripts/prune-sdk-nested-zod.mjs`** on **`prebuild`/`prestart`**). **`src/fix-sdk-zod-runtime.ts`** runs again at MCP startup so **`node dist/index.js`** rewires **`sdk/node_modules/zod`** to the hoisted package (junction/symlink or copy) when npm leaves a broken nested tree.

**Vitest:** `vitest-zod-setup.ts` runs first so MCP client imports in tests hit the same fix before the SDK loads.

**Manual alternative (dev only):** Clone the repo, run `npm run build:mcp`, then set MCP config to `"command": "node"`, `"args": ["X:\\path\\to\\pnCore\\packages\\pn-core-mcp\\dist\\index.js"]` (use your actual path). For portable install use the **one-click deeplink** or README MCP JSON — no clone required.

### Troubleshooting: MCP won't connect in Cursor

| Symptom | Likely cause | Fix |
|---------|--------------|-----|
| **pn-core** shows **errored** / no tools | First npx git fetch takes **>60s**; Cursor MCP times out | Pre-warm once, then reload MCP (see below) |
| `Cannot find module '…\\packages\\pn-core-mcp\\dist\\index.js'` | Broken config uses **relative `node packages/…` path** from wrong cwd | One-click install or README JSON with `-- pn-core` (not `node packages/...`) |
| Works on one PC, fails on another | `mcp.json` has an **absolute local path** (e.g. `X:\pnCore\...`) | One-click install or README MCP JSON |
| Module / zod errors in MCP log | **Node &lt; 22** or wrong major on PATH | Install Node 22+; set `PNCORE_MCP_NODE` to Node 22 binary |
| `'pn-core' is not recognized` (Windows) | Old config without `--package=git+…` | Use current npx + `-- pn-core` config |

**Pre-warm npx (once per machine if first connect times out):**

Windows (PowerShell):

```powershell
cmd /c "npx -y --package=git+https://github.com/perniemann/pnCore.git#main -- pn-core"
```

Mac/Linux:

```bash
npx -y --package=git+https://github.com/perniemann/pnCore.git#main -- pn-core
```

The process sits idle (stdio MCP — no output is normal). Press Ctrl+C. npx cache is warm; reload **pn-core** in Cursor Settings → MCP.

**Verify config:** from a pnCore clone run `npm run check:mcp` (flags non-portable paths) or `npm run check:mcp -- --smoke` (live connect + `health`).

**CI:** `npm run smoke:npx-mcp` exercises the same npx git install path with cold/warm startup budgets.

## Scripts

From this package or repo root:

| Script | Description |
|--------|-------------|
| `npm run build` | Compile TypeScript to `dist/`. |
| `npm run start` | Run the MCP server (`node dist/index.js`). |

From repo root only: `npm run build:mcp`, `npm run sync:content`, `npm run mcp-config:dev` (local clone) — see [repo README](../../README.md#scripts).

## Content (canonical)

Skills, agents, rules, config, docs, reference, and hooks in this package live in **`content/`** and are the **canonical source** for the repo. To update the plugin copy, from the repo root run: **`npm run sync:content`**. See [docs/folder-structure.md](../../docs/folder-structure.md).

## Tools

| Tool | Risk | Description |
|------|------|-------------|
| **health** | read | Health check: status, version, **`calendarDateUtc`** / **`timestampUtc`** (UTC), capabilities. |
| **list_workflow_types** | read | Workflow types and step counts. |
| **suggest_model_tier** | read | Suggested LLM model tier for a workflow step or subagent role (`fast` / `standard` / `premium` / `premium_thinking` / `long_horizon`). Pass `role` (`explorer` | `builder` | `judge` | `checker` | `orchestrator`) for subagent routing; omit `step` for the full per-step table. Resolves `PNCORE_FEATURES.modelTierOverrides` and `tierAliases`. |
| **list_skills** | read | Skill ids and descriptions. |
| **get_skill** | read | Full skill markdown (truncated per **`PNCORE_MAX_RESOURCE_CHARS`** / features). |
| **list_agents** | read | Agent ids and descriptions. |
| **get_agent** | read | Full agent markdown (same truncation rules). |
| **list_commands** | read | Command ids and descriptions. |
| **get_command** | read | Full command markdown (same truncation rules). |
| **list_rules** | read | Rule ids and descriptions. |
| **get_rule** | read | Full rule markdown (same truncation rules). |
| **workflow_step** | write | Deterministic workflow engine; response includes **`run_id`**. Echo **`run_id`** in `state` on every call. Human gates may require **`pncoreHumanGateTicket`**. Appends to run log and may consume single-use gate tickets — retries are not benign when approval is required. |
| **workflow_usage_totals** | read | Sum tokens/cost for a **`run_id`** over usage JSONL (tail scan). |
| **workflow_handoff_append** | append | Append bounded step summary line for a **`run_id`**. |
| **workflow_handoff_read** | read | Read recent handoff lines for a **`run_id`**. |
| **report_usage** | append | Append usage line; include optional **`run_id`**. |
| **workflow_state_save** | append | Persist workflow state JSON. |
| **workflow_state_load** | read | Load workflow state JSON. |
| **workflow_confirm** | read | Structured confirmation gate (MCP-only). |
| **approval_checkpoint** | gate | Token must match **`PNCORE_APPROVAL_TOKEN`**; optional **`workflow_type`** + **`workflow_step`** + **`run_id`** for human-gate tickets. |
| **gate_log_append** | append | JSONL gate audit; optional **`run_id`**. |
| **paperclip_issue_checkout** | external | Paperclip API. |
| **paperclip_issue_comment** | external (destructive) | Paperclip API — mutates remote issue. |
| **paperclip_issue_update** | external (destructive) | Paperclip API — mutates remote issue status. |

**Risk:** `read` = no workspace writes; `append` = JSONL/state under cwd rules; `gate` = shared secret; `external` = network API.

See rule **`pn-tool-risk-policy`** for the full matrix.

Path parameters for **report_usage**, **gate_log_append**, **workflow_state_save**, **workflow_state_load**, **workflow_handoff_***, and **workflow_usage_totals** should be under the workspace (e.g. `.pncore/...`). When `process.cwd()` is not the workspace root, pass explicit paths. Env: **`PNCORE_STATE_PATH`**, **`PNCORE_HANDOFF_LOG`**, **`PNCORE_FEATURES`** (JSON overrides `pn-core://config/features.json`), **`PNCORE_USAGE_SCAN_BYTES`**, **`PNCORE_USAGE_WARN_INPUT_TOKENS`**, **`PNCORE_MAX_RESOURCE_CHARS`**, **`PNCORE_SKILL_LOG_SAMPLE_RATE`** (integer N; writes 1-in-N entries to skill-load log; default 1 = log every call).

**Model-tier suggestions:** `workflow_step` responses include a `suggestedModelTier` field — `{ tier, exemplar, rationale }` — and prepend a short `**Suggested model tier:**` hint to the instruction when the tier is non-default. Pass **`leadModelTier`**, **`sessionModel`**, or **`orchestrationIntent`** in state to receive **`orchestrationMode`** (`lead` | `light_delegate` | `implementer`) and **`subagentTierHints`** on parallel fan-out (see rule **`pn-orchestrator-lead`**). Tiers: `fast` (e.g. composer-2.5-fast), `standard` (e.g. claude-4.6-sonnet-medium-thinking), `premium` (e.g. claude-opus-4-8-thinking-high), `premium_thinking` (e.g. claude-opus-4-8-thinking-high + MAX Mode), `long_horizon` (e.g. claude-fable-5 — loop orchestration / escalation; alternates in `TIER_META`). Subagent routing: `pn-core://reference/subagent-routing.md`; loops: `pn-core://reference/loop-orchestration-guide.md`. Disambiguation: pnCore uses *delivery tier* (MVP/Full), *context tier* (1–4), and *model tier* — see [model-tiers.ts](src/model-tiers.ts). Override per-step via `PNCORE_FEATURES.modelTierOverrides` keyed `<workflowType>.<step>`; remap globally via `PNCORE_FEATURES.tierAliases` (e.g. `{"premium_thinking":"premium"}` or `{"long_horizon":"premium"}` when Fable is unavailable). **Pi:** pass the same state keys when using pn-core MCP native tools; `/pn program` and `/pn build` templates document lead orchestration.

**`PNCORE_CONTENT_PATH` trust boundary:** This env var overrides the content directory that the server reads skills, agents, commands, rules, config, and reference docs from. It must point to a trusted directory you control. A malicious value could cause the server to serve content from an untrusted location. Only set it to a path you own; never derive it from user input. The server resolves all resource paths relative to this root and rejects traversals (`../`) within resource lookups, but that guarantee only holds when `PNCORE_CONTENT_PATH` itself is trusted.

**Hard approval:** Set **`PNCORE_APPROVAL_TOKEN`** in the MCP server `env` (same config file as the command). Use **`approval_checkpoint`** before high-risk steps; the user pastes or injects the same token in the tool call so the server can verify it. Rotate the token like any shared secret.

**Opt-in mandatory human gates:** Set **`PNCORE_REQUIRE_APPROVAL_FOR_WORKFLOWS`** to a comma-separated list of workflow types (e.g. `full_dev,project_kickoff`). For those workflows, each **`workflow_step`** where the response `gate` is **`human`** requires a fresh **`approval_checkpoint`** with matching **`workflow_type`** and **`workflow_step`**, then passing **`pncoreHumanGateTicket`** in the `state` object on `workflow_step`. Tickets are stored under **`.pncore/human-gate-tickets.jsonl`** (override with **`PNCORE_HUMAN_GATE_TICKETS_PATH`**). Tickets expire after 24 hours and are single-use.

### Error codes

When a tool returns an error, the response includes `{ error: string, code: string, ...extra }`. Clients can use `code` for handling:

| Code | Meaning |
|------|---------|
| `NOT_FOUND` | Skill, agent, command, or rule id does not exist |
| `INVALID_STATE` | workflow_step state validation failed; invalid or reused human-gate ticket |
| `APPROVAL_REQUIRED` | Human gate with mandatory approval: missing or invalid `pncoreHumanGateTicket`; call `approval_checkpoint` with `workflow_type` and `workflow_step` first |
| `FILE_NOT_FOUND` | workflow_state_load: file missing |
| `IO_ERROR` | Filesystem read/write failed |
| `PARSE_ERROR` | Invalid JSON (e.g. corrupted workflow state file) |
| `PATH_TRAVERSAL` | Path parameter escapes workspace (e.g. `../` outside cwd); rejected for report_usage, gate_log_append, workflow_state_save, workflow_state_load |

### report_usage

Call after each `workflow_step` when the client has usage data. Pass **`run_id`** from `workflow_step`, `inputTokens`, `outputTokens`, and optionally `costUsd`, `latencyMs`. With `path` (e.g. `.pncore/usage.jsonl`), appends one JSON line per call. Use **`workflow_usage_totals`** to aggregate per run.

### workflow_usage_totals / workflow_handoff_*

**`workflow_usage_totals`** scans the tail of a usage JSONL file (default `.pncore/usage.jsonl`) and sums lines matching **`run_id`**. **`workflow_handoff_append`** / **`workflow_handoff_read`** use `.pncore/workflow-handoff.jsonl` by default (`PNCORE_HANDOFF_LOG` to override).

### workflow_state_save / workflow_state_load

Use to **resume after disconnect**. After completing a workflow step, call `workflow_state_save` with the current state object and optional path. After reconnecting, call `workflow_state_load` with the same path, then pass the restored state to `workflow_step(workflowType, step, state)`. The server validates state and returns the next instruction. See `pn-core://reference/workflow-state-schema.md` for required/optional keys per step.

### gate_log_append

Append one JSON line per call for gate audits (complements `approval_checkpoint` and run logs). Fields: ISO `timestamp`, `gate_type`, `workflowType`, `step`, `outcome`, optional `action_label`. Default file `.pncore/gate-log.jsonl`; optional `path` must stay within `process.cwd()`.

## Prompts

MCP prompts expose agents and commands as reusable prompt templates. Clients (e.g. Cursor) can list them via `prompts/list` and fetch content via `prompts/get`. Each prompt accepts an optional `context` argument to append user-specific instructions.

**Agents and commands are prompts, not MCP tools.** Load them with `get_agent`, `get_command`, or `prompts/get` — do not call `CallMcpTool` with names like `pn-skeptic` or `pn-build`.

| Prompt | Type | Description |
|--------|------|-------------|
| **pn-project-builder** | Agent | Routes work to specialist agents, then pn-reviewer. |
| **pn-skeptic** | Agent / command | Challenges plans; must end with `AskQuestion` or `workflow_confirm` (`gate_type: "skeptic"`). |
| **pn-build** | Command | Discovery → research → plan → skeptic → specialists → review. |
| **pn-design** | Command | Discovery → skeptic-on-plan → build → skeptic-on-output. Fallback when workflow_step unavailable. |
| **pn-frontend-audit** | Command | Scope → 5-phase surgical audit (typography, layout, design-tokens, a11y, performance-fe) → scorecard + fix roadmap → summary. Use workflow_step("frontend_audit", …) when available. |
| **pn-setup** | Command | Configure existing project: analyze codebase, create project-context.mdc, project skill, optionally file-glob rules, design context, or stack context. |
| **pn-new** | Command | Easiest entry: (1) references yes/no; (2) intent (full auto | design focused | involved). Context-dependent flow. |
| *...and others* | | One prompt per agent and command. |

**pn-assets:** Single entry for image or SVG. Use `get_command("pn-assets")` to run it; it asks type (SVG/image/placeholder) then routes to workflow_step("svg_create") or workflow_step("image_create") or placeholder URLs. When the build has UI (landing page, frontend, product page, components), full_dev and orchestrator flows **automatically include** pn-assets-manager—logos, icons, hero images, or placeholders without explicit request.

Use `list_*` to discover ids, then `get_*` to load the content. For build/design, say **"Build [X]. Use the design workflow."** or **"Build [X]. Use the full dev workflow."** The model uses the workflow tool when available; control flow is deterministic and discovery and skeptic cannot be skipped. The client can run any pnCore workflow (discovery, prior-art research, plans, skeptic challenge, full dev loop, assets, and others) by fetching the relevant skill, agent, or command and following it.

**Startup ideas:** `get_command("pn-pressure-test")` loads the skill of the same id—verdict, scorecard, fatal flaws, and a minimal MVP test—before you invest in a PRD or build. Detailed mode checklists live in `content/skills/pm/pn-pressure-test/references/playbooks.md` (synced to the plugin under `skills/pm/pn-pressure-test/`).

### Example: pitch-to-app (full pnCore flow)

Start from a pitch idea and use every feature: discovery questionnaire (ask_question at each section), prior art, roadmap with dev phases, design fully aligned with user (ask for purpose, tone, a11y, components; gate on approval after wireframes, user flows, design system), pn-assets (SVGs + placeholders), Supabase and Stripe. User is gated at each step. Stack chosen via questionnaire, not assumed. See [pitch-to-app full prompt](../../docs/pitch-to-app-example.md).

See [MCP usage guide](../../docs/mcp-usage-guide.md) for a full analysis of the tools, who uses them, and how to get the best value.

## Resources

MCP resources expose config and reference content by URI. When your workspace does not have `config/` or `reference/` at the root, the AI can fetch these instead:

| URI | Description |
|-----|-------------|
| `pn-core://config/specialists.json` | Specialist agents and scaffold mappings |
| `pn-core://config/stacks.json` | Supported stacks and their rules, scaffolds, agents |
| `pn-core://reference/FLOW.md` | Standard and strict flow for pn-build, pn-project-builder |
| `pn-core://reference/DECISION_LOGIC.md` | Skeptic intensity and gating logic |
| `pn-core://reference/RUNBOOK.md` | One-page runbook: workflow_step vs get_command, config, skeptic gates; token/cost visibility (client-side) |
| `pn-core://reference/workflow-state-schema.md` | Workflow state schema and task contract for persistence/resume and parallel execution |
| `pn-core://reference/best-practices.md` | Best practices checklist (a11y, security, performance, design, orchestration, mobile, WebXR) |
| `pn-core://reference/aesthetics-baseline.md` | Distinctive UI checklist, inspiration presets, optional `<frontend_aesthetics>` block for CLAUDE.md |
| `pn-core://reference/human-facing-artifacts.md` | HTML vs canvas vs markdown for subset workflow outputs; dual digest for orchestration; example gallery link |
| `pn-core://reference/discovery-and-plan-format.md` | Format reference for discovery specs and plans |
| `pn-core://reference/schemas/delivery_pack.contract.json` | Delivery pack contract for pn-deliver |
| `pn-core://reference/schemas/orchestrator.contract.json` | Orchestrator contract for pn-build and pn-project-builder |
| `pn-core://reference/schemas/skeptic.contract.json` | Skeptic verdict contract for pn-skeptic-challenge |
| `pn-core://reference/delivery-tier-criteria.md` | MVP vs full delivery tier criteria for verification |
| `pn-core://reference/schemas/verifier.contract.json` | Verifier contract schema for pn-deliver |
| `pn-core://reference/schemas/builder.contract.json` | Builder contract schema for builder verification |
| `pn-core://reference/schemas/fix_tasks.contract.json` | Fix tasks contract schema for CI/fix flows |

Use `resources/list` to discover, then `resources/read` with a URI to fetch content. Token and cost visibility are provided by the client (e.g. Cursor), not by this server; see RUNBOOK.md for details.

**Prompts and resources list refresh:** Content is loaded at startup; the server does not watch the filesystem and never pushes list updates. After you run `npm run sync:content` in development, **reconnect the MCP server** (or reload the Cursor window) so the client re-fetches the lists.

**Transport:** This server uses **stdio** only. For enterprise gateway deployments, MCP best practice 2025-2026 recommends Streamable HTTP for remote, shared services. stdio remains the default for local, per-user integrations.

**Versioning and deprecation:** Tool schemas and responses evolve additively. Breaking changes to tool args or response shapes are avoided; new optional fields may be added. If a tool is deprecated, a deprecation notice and migration timeline will be documented in the changelog before removal. Clients should use the `code` field in error responses for handling; string content may change.

## Config (orchestrator and commands)

Agents and commands that route work (e.g. **pn-project-builder**, **pn-build**, **pn-new**, **pn-scaffolder**) expect **`config/specialists.json`** and **`config/stacks.json`** in the **workspace** (your project root). When your workspace is not the pnCore repo, either:

- Copy the default config into your project (see below), or
- Rely on MCP resources: the AI can fetch `pn-core://config/specialists.json` and `pn-core://config/stacks.json` when those paths are missing.

To copy config manually:
- From this package after build: copy `content/config/*` into your project's `config/` directory.
- From the pnCore repo: copy `plugins/pnCore/config/*` into your project's `config/` directory.

Then `config/specialists.json` and `config/stacks.json` will be available when the model follows the orchestrator or related commands.

**Docs (discovery, plans, research, kickoff refs):** Discovery → `docs/discovery/`; plans → `docs/plans/`; prior art → `docs/research/`. **`workflow_step("project_kickoff")`** writes PRD, design, domain, optional stack/MCP/UI, and the refs index under **`docs/refs/`** (index: **`docs/refs/README.md`**). Paths are relative to your **workspace root**. Format reference: `content/docs/reference/discovery-and-plan-format.md` or resource `pn-core://reference/discovery-and-plan-format.md`.

## Full involvement (MCP-only)

For maximum user involvement (questionnaire at every step, confirmation before plan/specialists/review):

1. **New project:** Run `get_command("pn-new")` first. pn-new asks about references and intent (full auto, design focused, **involved**). Choose **involved** for gates at discovery, prior art, plan, specialist list, and review.
2. **Do not bypass pn-new** for new projects—do not call `workflow_step("full_dev", ...)` directly until pn-new has run and intent is known.
3. **When using workflow_step for full_dev** and the user wants full involvement, pass `intent: "involved"` in state: `workflow_step("full_dev", 0, { intent: "involved" })`. The workflow enforces strict human gates when intent is involved.

**Example first message (copy-paste):** `Run get_command("pn-new"). I want to build [project name]. Refs in .ref/. I want Involved — ask each discovery section, gate on plan, specialists, and review.` Replace `[project name]` with your app name. If no refs, omit "Refs in .ref/".

**Example: market-ready from blank project:**

```
pn-new ▲

Build [your-project-name] — [one-line description: e.g. landing page, auth, core features].
References: [path or "in .ref/"] (pitch, requirements, design assets).
Analyze both: prior art and design.
Intent: Involved — full gates at discovery, plan, specialists, and review.
Delivery tier: full. Design ambition: distinctive.
```

Answer Step 0: Yes, Both. Step 1: (3) Involved. Use pn-document (or `get_command("pn-document")`) to format/check `docs/discovery/`, `docs/plans/`, `docs/research/`.

**Avoid:** Saying only "Build [X]" or "Create the [X] app" for new projects—that can route to `workflow_step` directly and behave like full auto. Start with pn-new when you want full involvement.

**"pn-new" only:** If you say only `run pn-new` or `/pn-new` with nothing else, it works. The agent will ask (1) references yes/no, (2) intent (full auto / design focused / involved). Answer both, then the flow runs. You get the same gates; you just provide project context in reply to the agent's questions rather than upfront.

**Project rules:** pn-new and pn-setup create `.cursor/rules/project-context.mdc` if missing (triangle, project context, MCP bootstrap). When this file is absent, pn-build-gate routes to pn-new first.

See `pn-core://reference/RUNBOOK.md` for the full reference.

## Engine feature (Unreal / Godot)

Use `workflow_step("engine_feature", 0, { engine: "unreal" })` or `{ engine: "godot" }` as the entry point for game-engine feature workflows. Direct `unreal_feature` and `godot_feature` workflow types are not supported.

## Plugin vs MCP vs Pi native tools

pnCore is a **multi-surface product** built on one canonical content body (skills, agents, commands, rules under `content/`):

- **MCP (stdio)** — All executable logic lives in this server: the deterministic `workflow_step` engine plus the other tools, resources, and prompts. Works in any MCP client (Cursor, Claude Code, …).
- **Cursor plugin** — Slash palette, file-glob rules, stop hook, agent selector. Same commands via `get_command`; rules via `get_rule`.
- **Pi native extension** — `pi install git:…/pnCore` loads `packages/pn-core-mcp/extensions/pn-core.ts`, which registers the same 24 tools via `pi.registerTool()` (no subprocess MCP on Pi). See [ADR-0009](../../docs/adr/0009-pi-native-tools.md).

Choose MCP for cross-client orchestration; add the Cursor plugin for native IDE UX; use `pi install` from repo root on [pi.dev](https://pi.dev) for prompts, skills, and native tools together.

## Build from source (monorepo)

From the repo root: **`npm run build:mcp`** (installs this package's dependencies and builds) or **`npm run setup`** (root install plus MCP build in one go). Or from this package: **`npm run build`**.

Content is canonical in `content/`. Edit there, then from repo root run `npm run sync:content` to copy into the plugin. Build (`npm run build`) compiles TypeScript only.

Run the server with:

```bash
node dist/index.js
```

## License

MIT
