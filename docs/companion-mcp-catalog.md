---
title: Companion MCP catalog
updated: 2026-09-17
---

# Companion MCP catalog

MCP servers that pair well with **pnCore**: research, UI libraries, testing, payments, and game-engine automation. Add them through the active harness's MCP configuration; use `harness_detect` or `pn-core://reference/harness-matrix.md` when the config path is unclear.

**Proactive use:** When these MCPs are enabled, pnCore instructs agents to use them via `pn-mcp-proactive` and the relevant skills.

---

## Available companions

| MCP | Purpose | Install | pnCore pairing |
|-----|---------|---------|----------------|
| **Octocode** | Code forensics: LSP goto-def, call hierarchy, references, prior-art search, GitHub integration | `npx -y octocode-mcp@latest` — [Octocode](https://github.com/bgauryy/octocode-mcp) | `pn-prior-art-research`, `pn-codebase-to-strategy` |
| **shadcn** | shadcn/ui components, Tailwind, Radix | Cursor: `npx shadcn@latest mcp init --client cursor` | `pn-ui-component-libraries` |
| **Playwright** | Browser automation, E2E generation, trace inspection | `npx -y @playwright/mcp@latest` — [Playwright MCP](https://github.com/microsoft/playwright-mcp) | `pn-smoke-tests`, `pn-browser-runtime-verify` |
| **Stripe** | Payments, subscriptions, invoicing | Preferred remote: `https://mcp.stripe.com`; local: `npx -y @stripe/mcp@latest` with `STRIPE_SECRET_KEY` — [Stripe MCP](https://docs.stripe.com/mcp) | `pn-payment-integration` |
| **Chrome DevTools** | Browser debugging and performance | `npx -y chrome-devtools-mcp@latest` — [Chrome DevTools MCP](https://github.com/ChromeDevTools/chrome-devtools-mcp) | `pn-browser-runtime-verify` |
| **Cloudflare** | Workers, KV, D1, R2, and the Cloudflare API | Remote Code Mode: `https://mcp.cloudflare.com/mcp` — [Cloudflare MCP](https://github.com/cloudflare/mcp) | Cloudflare stack and CI skills |
| **n8n** | Workflow automation; expose workflows as MCP tools | [MCP Server Trigger](https://docs.n8n.io/integrations/builtin/core-nodes/n8n-nodes-langchain.mcptrigger), [MCP Client Tool](https://docs.n8n.io/integrations/builtin/cluster-nodes/sub-nodes/n8n-nodes-langchain.toolmcp) | `pn-n8n-patterns` |
| **ChiR24/Unreal_mcp** | Unreal Engine 5.0–5.8 automation via the `McpAutomationBridge` plugin | Native: enable **Native MCP** and connect to `http://localhost:3000/mcp`; bridge: `npx -y unreal-engine-mcp-server` — [ChiR24/Unreal_mcp](https://github.com/ChiR24/Unreal_mcp) | Load `pn-unreal-mcp`, then `pn-unreal-dev` |
| **Blender MCP** (official) | Live Blender control and Python API access; requires Blender 5.1+ | Install the add-on and server from [Blender Lab](https://www.blender.org/lab/mcp-server/). **Isolate generated-code execution.** | `pn-blender-scripting` |
| **Coding-Solo/godot-mcp** | External CLI bridge for Godot 4.x; editor launch, project runs, logs, scenes, and nodes | `npx -y github:Coding-Solo/godot-mcp`; set `GODOT_PATH` — [Coding-Solo/godot-mcp](https://github.com/Coding-Solo/godot-mcp) | Load `pn-godot-mcp`, then `pn-godot-dev` |
| **3ddelano/gdai-mcp** | Live editor control for Godot 4.1+: scene tree, scripts, debugger, and screenshots | Follow the [GDAI installation guide](https://gdaimcp.com/docs/installation); keep the editor plugin running | Load `pn-godot-mcp`, then `pn-godot-dev` |

Use one Godot MCP surface per workflow run. `pn-godot-mcp` compares five maintained/community options; `pn-unreal-mcp` compares six Unreal options and emits the install plan used by `engine_feature`.

---

## pnCore stack

For a full pnCore-oriented setup:

1. **pn-core** — MCP workflow engine plus harness-native rules, skills, agents, and commands.
2. **Octocode** — Code research, LSP tools, GitHub.
3. **shadcn** — When using shadcn/ui or Tailwind components.
4. **Playwright** — When adding E2E tests or browser automation.

From a target project, choose the active harness:

```bash
npx github:perniemann/pnCore plugin-install --harness auto
npx github:perniemann/pnCore plugin-install --harness codex --with-mcp-config --inline-rules
```

Use `cursor`, `claude_code`, `codex`, `pi`, or `all` instead of `auto`. `--with-shadcn` is Cursor-only. From a cloned pnCore checkout, run `node scripts/install-to-project.mjs <target> --harness <id>`.

---

## pm-skills (Product Management)

[pm-skills](https://github.com/phuryn/pm-skills) provides 65+ PM skills (discovery, strategy, PRDs, OKRs, GTM, market research) for Claude Code and Cowork. pnCore's `pm` category contains 11 skills: nine ports plus two pnCore-native workflows.

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
| **pn-pressure-test** | Stress-testing a business thesis before implementation planning |
| **pn-ai-adoption-playbook** | Planning role-based AI adoption, governance, and measurement |

**Flow:** PRD → user/job stories → pn-writing-plans → build. For full pm-skills (strategy, market research, GTM), copy `pm-*/skills/*` to `.cursor/skills/` or use Claude for the broader PM workflow.

**Command surfaces:** Cursor IDE uses **`/` → `pn`** categories. Pi uses one extension command after `pi install git:github.com/perniemann/pnCore@main`: `/pn`, or `/pn pn-build` directly. Files under `plugins/pnCore/prompts/` are extension storage, not flat Pi prompt registration. Cursor CLI uses the `/pn` stub or MCP `get_command`. See [ADR-0008](adr/0008-command-palette-pn-submenu.md).

---

## Business Strategy Companions

Companions used by the `business_strategy` workflow (`/pn-strategy`). The orchestration skill auto-detects available companions at steps 2–3 by checking tool-name prefixes; no manual config in the skill is required.

| Role | MCP | Tool prefix | Use in workflow | Install |
|------|-----|-------------|-----------------|---------|
| `codebase_intake` | **Octocode** (primary) | `mcp_user-octocode_*` or `mcp_octocode_*` | Step 1 (codebase-to-strategy) and codebase-grounded evidence in step 2 | `npx -y octocode-mcp@latest` — see [Octocode](https://github.com/bgauryy/octocode-mcp) |
| `web_evidence` | **Tavily MCP** | `tavily_*` | Step 2–3 evidence gathering (preferred over host WebSearch) | Remote: `https://mcp.tavily.com/mcp/?tavilyApiKey=…`; local: `npx -y tavily-mcp@latest` — [Tavily MCP](https://github.com/tavily-ai/tavily-mcp) |
| `web_evidence` | **Brave Search MCP** | `brave_*` | Step 2–3 evidence gathering | `npx -y @brave/brave-search-mcp-server` with `BRAVE_API_KEY` — [official Brave MCP](https://github.com/brave/brave-search-mcp-server) |
| `web_evidence` | **Exa MCP** | `exa_*` or `*_exa` | Step 2–3 semantic search | Remote: `https://mcp.exa.ai/mcp` — [Exa MCP](https://github.com/exa-labs/exa-mcp-server) |
| `market_data` | **FRED MCP** | `fred_*` | Step 3 economic data | Community option: [fred-mcp-server](https://github.com/stefanoamorelli/fred-mcp-server), with `FRED_API_KEY` |
| `market_data` | **Alpha Vantage MCP** | `alpha_vantage_*` | Step 3 financial/equity data | Remote: `https://mcp.alphavantage.co/mcp?apikey=…`; local: `uvx marketdata-mcp-server <key>` — [Alpha Vantage MCP](https://github.com/alphavantage/alpha_vantage_mcp) |

**Fallback and lock behavior:** When no companion is present, the workflow uses host tools (`WebSearch`, `WebFetch`, `localSearchCode`) and records `host_websearch`, `host_webfetch`, or `host_localsearch`. Market stats without a data companion are flagged `[est.]`, never fabricated. When every market entry is host-sourced, verdict-lock preselects **audit** and shows three randomly sampled citations before the user can explicitly confirm.

---

## Adding a new companion

When adding a companion MCP:

- Verify no conflict with pnCore tool names (e.g. `list_skills`, `get_skill`, `workflow_step`).
- Document the install command or deeplink in this table.
- Note any stack-specific pairing (e.g. shadcn for React/Next, Playwright for E2E).
