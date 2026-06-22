---
title: Companion MCP catalog
updated: 2026-04-22
---

# Companion MCP catalog

MCP servers that pair well with **pnCore**: research, UI libraries, testing, payments, and more. Add entries in Cursor **Settings → MCP** or `~/.cursor/mcp.json`.

**Proactive use:** When these MCPs are enabled, pnCore instructs agents to use them via `pn-mcp-proactive` and the relevant skills. For example: Stripe + pn-payment-integration, n8n + pn-n8n-patterns, shadcn + pn-ui-component-libraries.

---

## Available companions

| MCP | Purpose | Install |
|-----|---------|---------|
| **Octocode** | Code forensics: LSP goto-def, call hierarchy, find references, prior-art search, GitHub integration | `npx -y octocode-mcp@latest` or see [Octocode](https://github.com/bgauryy/octocode-mcp) |
| **shadcn** | shadcn/ui components, Tailwind, Radix | `npx shadcn@latest mcp init --client cursor` |
| **Playwright** | Browser automation, E2E test generation, trace inspection | `npx -y @playwright/mcp` |
| **Stripe** | Payments, subscriptions, invoicing | `npx -y @stripe/mcp` |
| **Chrome DevTools** | Browser debugging, performance | See [Chrome DevTools MCP](https://github.com/ChromeDevTools/chrome-devtools-mcp) |
| **Cloudflare** | Workers, KV, D1, R2 | See [Cloudflare MCP](https://github.com/cloudflare/mcp-server-cloudflare) |
| **n8n** | Workflow automation, expose workflows as MCP tools for AI agents | See [MCP Server Trigger](https://docs.n8n.io/integrations/builtin/core-nodes/n8n-nodes-langchain.mcptrigger), [MCP Client Tool](https://docs.n8n.io/integrations/builtin/cluster-nodes/sub-nodes/n8n-nodes-langchain.toolmcp) |
| **ChiR24/Unreal_mcp** | Unreal Engine editor automation: actors, levels, Blueprints, materials, sequences, widgets, AI, GAS, networking, audio (UE 5.0–5.7). Requires `MCPBridge` C++ plugin in your UE project. | Copy `MCPBridge` plugin into `<Project>/Plugins/`, enable in Edit → Plugins, then add `"unreal-mcp": { "type": "url", "url": "http://localhost:3000/mcp" }` to `mcp.json`. See [ChiR24/Unreal_mcp](https://github.com/ChiR24/Unreal_mcp) |
| **Blender MCP** (official) | Live control of a Blender session via natural language: scene analysis, data-block renaming, Geometry Nodes documentation, material and mesh operations. Requires Blender 5.1+. | Install add-on: drag `.zip` into Blender from [blender.org/lab/mcp-server](https://www.blender.org/lab/mcp-server/). Install server: `pip install git+https://projects.blender.org/lab/blender_mcp.git`. Add `"blender": { "command": "blender-mcp" }` to `mcp.json`. **Run in a VM** — executes LLM-generated code without guards. |
| **Coding-Solo/godot-mcp** | External CLI bridge for Godot 4.x: launch the editor, run projects, capture console/error output, basic scene and node management via bundled GDScript. ~3.2k stars. | `npx -y github:Coding-Solo/godot-mcp` — add `"godot": { "command": "npx", "args": ["-y", "github:Coding-Solo/godot-mcp"] }` to `mcp.json`. Set `GODOT_PATH` env to your Godot 4 binary. See [Coding-Solo/godot-mcp](https://github.com/Coding-Solo/godot-mcp). Pair with `pn-godot-dev`. |
| **3ddelano/gdai-mcp** | Live editor-plugin bridge for Godot 4.1+: real-time scene tree manipulation, script creation/fixing, debugger/parse error reading, end-to-end test screenshots. Runs inside the editor. | Install the Godot plugin from [github.com/3ddelano/gdai-mcp-plugin-godot](https://github.com/3ddelano/gdai-mcp-plugin-godot). Enable in editor, then add `"godot": { "type": "url", "url": "http://localhost:6969/mcp" }` to `mcp.json`. Use when you need live scene-tree control or runtime debugging alongside Cursor. |

---

## pnCore stack

For a full pnCore-oriented setup:

1. **pn-core** — Rules, skills, agents, workflow (this plugin).
2. **Octocode** — Code research, LSP tools, GitHub.
3. **shadcn** — When using shadcn/ui or Tailwind components.
4. **Playwright** — When adding E2E tests or browser automation.

Run one of:

- From a project (without cloning): `npx github:perniemann/pnCore install -- --with-shadcn`
- From repo root (cloned): `node scripts/install-to-project.mjs --with-shadcn`

---

## pm-skills (Product Management)

[pm-skills](https://github.com/phuryn/pm-skills) provides 65+ PM skills (discovery, strategy, PRDs, OKRs, GTM, market research) for Claude Code and Cowork. pnCore has ported 9 skills into `skills/pm/`:

| Skill | Use when |
|-------|----------|
| **pn-create-prd** | Writing a PRD or product spec before implementation planning |
| **pn-create-design-doc** | Creating a DESIGN doc for a feature or system |
| **pn-create-domain-doc** | Documenting domain mechanics (progression, tiers, gamification) |
| **pn-create-refs-index** | Generating a refs index linking all project reference docs |
| **pn-create-stack-doc** | Documenting the tech stack (STACK.md) |
| **pn-user-stories** | Breaking features into backlog items (3 C's, INVEST) |
| **pn-job-stories** | JTBD-style backlog items (When...I want...so I can) |
| **pn-release-notes** | Converting tickets/changelogs into user-facing release notes |
| **pn-idea-miner** | Mining transcripts or notes for feature ideas and priorities |

**Flow:** PRD → user/job stories → pn-writing-plans → build. For full pm-skills (strategy, market research, GTM), copy `pm-*/skills/*` to `.cursor/skills/` or use Claude for the broader PM workflow.

---

## Business Strategy Companions

Companions used by the `business_strategy` workflow (`/pn-strategy`). The orchestration skill auto-detects available companions at steps 2–3 by checking tool-name prefixes; no manual config in the skill is required.

| Role | MCP | Tool prefix | Use in workflow | Install |
|------|-----|-------------|-----------------|---------|
| `codebase_intake` | **Octocode** (primary) | `mcp_user-octocode_*` or `mcp_octocode_*` | Step 1 (codebase-to-strategy) and codebase-grounded evidence in step 2 | `npx -y octocode-mcp@latest` — see [Octocode](https://github.com/bgauryy/octocode-mcp) |
| `web_evidence` | **Tavily MCP** | `tavily_*` | Step 2–3 evidence gathering (preferred over host WebSearch) | See [Tavily MCP](https://github.com/tavily-ai/tavily-mcp) |
| `web_evidence` | **Brave Search MCP** | `brave_*` | Step 2–3 evidence gathering (alternative to Tavily) | See [Brave Search MCP](https://github.com/modelcontextprotocol/servers/tree/main/src/brave-search) |
| `web_evidence` | **Exa MCP** | `exa_*` | Step 2–3 evidence gathering (semantic search alternative) | See [Exa MCP](https://github.com/exa-labs/exa-mcp-server) |
| `market_data` | **FRED MCP** | `fred_*` | Step 3 market sizing (economic data) | See [FRED MCP](https://fred.stlouisfed.org/) — requires API key |
| `market_data` | **Alpha Vantage MCP** | `alpha_vantage_*` | Step 3 market sizing (financial/equity data) | See [Alpha Vantage MCP](https://www.alphavantage.co/documentation/) — requires API key |

**Fallback behavior:** When no companion is present for a role, the workflow runs end-to-end using host tools (`WebSearch`, `WebFetch`, `localSearchCode`). Evidence entries record `companion: "host_websearch"` or `"host_webfetch"` so provenance is always visible at the verdict-lock step. Market stats without a data companion are flagged `[est.]` — never fabricated.

---

## Adding a new companion

When adding a companion MCP:

- Verify no conflict with pnCore tool names (e.g. `list_skills`, `get_skill`, `workflow_step`).
- Document the install command or deeplink in this table.
- Note any stack-specific pairing (e.g. shadcn for React/Next, Playwright for E2E).
