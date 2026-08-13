# pnCore (plugin)

Cursor plugin for **pnCore 0.18.0**: rules, skills, agents, and commands for Node, React, Astro, Next.js, vanilla web, CI, n8n, Three.js, shaders, web3, Figma, Blender, and Unreal. Overview: [repo README](https://github.com/perniemann/pnCore). Full catalog: [docs/plugin-reference.md](https://github.com/perniemann/pnCore/blob/main/docs/plugin-reference.md).

## Install

**Add pnCore to any project (full plugin):** From that project's directory, run:
```bash
npx github:perniemann/pnCore plugin-install
```
Or clone this repo and run:
```bash
node path/to/pnCore/scripts/install-to-project.mjs
```
This copies commands, rules, skills, agents, config, and hooks into `.cursor/` and `.cursor-plugin/`. Open the project in Cursor, reload the window, and use `/pn-new` etc.

**Or open the plugin folder:** **File → Open Folder** → **`plugins/pnCore`** to work on the plugin itself.

**Marketplace:** When listed, **Settings → Plugins → Add from marketplace** → pnCore.

**Slash commands not showing?** Project needs `.cursor-plugin/plugin.json`. **Developer: Reload Window**, then type `/` in chat.

After install: rules apply by file glob; use `/pn-command-name` in chat. **New project?** Run `/pn-new` — strict first questionnaire: (1) references yes/no (analyze prior-art, design, or both), (2) intent (full auto | design focused | involved in every step). Then context-dependent flow. Use the **pn-project-builder agent** for discovery-driven builds; `/pn-design` for design flows. Say "Build X. Use the design workflow." for design flows. When MCP is available, pn-build-gate prefers the workflow; otherwise it loads pn-design or pn-build.

## Example prompts

**Quick start:** With the **pn-project-builder agent** try: *Build a mobile-first fitness tracking app. Minimal modern design, gamification. Log workouts, compound score, level up/down by threshold and time.*

**Market-ready (blank to full product):** Blank project to full product with Involved gates. Use `/pn-document` to format docs.

```
pn-new ▲

Build [your-project-name] — [one-line description: e.g. landing page, auth, core features].
References: [path or "in .ref/"] (pitch, requirements, design assets).
Analyze both: prior art and design.
Intent: Involved — full gates at discovery, plan, specialists, and review.
Delivery tier: full. Design ambition: distinctive.
```

Answer Step 0: Yes, Both. Step 1: (3) Involved.

**Pitch-to-app (full pnCore flow):** Start from a pitch idea and use every feature—discovery questionnaire (ask_question at each section), prior art, roadmap with dev phases, design fully aligned with me (ask for purpose, tone, a11y, components; gate on approval after wireframes, user flows, design system), pn-assets-manager (SVGs + placeholders), Supabase and Stripe. User is gated at each step. Stack chosen via questionnaire, not assumed. See [pitch-to-app full prompt](../../docs/pitch-to-app-example.md).

## MCP server

pnCore is one product on two surfaces sharing the same content. The **MCP server** holds all executable logic (the `workflow_step` engine plus the other tools) and runs in any MCP client; this **plugin** adds Cursor-only UX the MCP cannot provide — the `/` command palette, file-glob rules, the agent selector, and the continual-learning stop hook. Use them together. Full breakdown: [Plugin vs MCP](https://github.com/perniemann/pnCore/blob/main/packages/pn-core-mcp/README.md#plugin-vs-mcp).

The same workflows are available as an MCP server for any client: **24 tools** (including `workflow_step`, `suggest_model_tier`, usage and handoff helpers, optional Paperclip), **`pn-core://` resources**, and MCP **prompts** aligned with agents/commands. Concise map: [MCP usage guide](https://github.com/perniemann/pnCore/blob/main/docs/mcp-usage-guide.md). Install, env vars, and error codes: [packages/pn-core-mcp README — Installation](https://github.com/perniemann/pnCore/blob/main/packages/pn-core-mcp/README.md#installation). Repo entry: [README — MCP](https://github.com/perniemann/pnCore#mcp-any-mcp-client). Pairing **pn-core** with **Octocode**: [companion MCP catalog](https://github.com/perniemann/pnCore/blob/main/docs/companion-mcp-catalog.md).

## Scripts

Full script table (validate, build, sync, MCP config, etc.): [repo README — Scripts](https://github.com/perniemann/pnCore#scripts). For **plugin folder** work from a clone:

- `npm run validate` (repo root) — includes content/plugin sync check.
- `node scripts/validate-plugin-lib.mjs plugins/pnCore` — plugin manifest and paths only.
- `npm run sync:content` (repo root) — after editing `packages/pn-core-mcp/content/`.

## Adding rules or skills

Edit in `packages/pn-core-mcp/content/` then run `npm run sync:content`. Rules: `content/rules/*.mdc`. Skills: `content/skills/<category>/pn-<name>/SKILL.md`. Specialists: `config/specialists.json` only. Stacks: `config/stacks.json` and matching rule/scaffold. Full reference: [docs/plugin-reference.md](https://github.com/perniemann/pnCore/blob/main/docs/plugin-reference.md). Flow and the **stop** hook: `reference/FLOW.md`.

## Validation

From repo root: `npm run validate`. Plugin only: `node scripts/validate-plugin-lib.mjs plugins/pnCore`.

## Recommended companions

- **Playwright** — E2E. [microsoft/playwright-mcp](https://github.com/microsoft/playwright-mcp)
- **Git** — Repo operations. [modelcontextprotocol/servers](https://github.com/modelcontextprotocol/servers)
- **Octocode** — Prior-art (pn-prior-art-research uses it). Enable user-octocode MCP in Cursor.
- **Stripe** — Payments. [stripe/agent-toolkit](https://github.com/stripe/agent-toolkit)
- **Chrome DevTools** — Debugging. [ChromeDevTools/chrome-devtools-mcp](https://github.com/ChromeDevTools/chrome-devtools-mcp)
- **Cloudflare** — Workers, KV, R2. [cloudflare/mcp-server-cloudflare](https://github.com/cloudflare/mcp-server-cloudflare)

## License

MIT — see [LICENSE](LICENSE).
