# pnCore (plugin)

Cursor adapter for **pnCore 0.19.9**: slash palette, file-glob rules, agent selector, stop hook. One MCP engine, four harnesses (Cursor, Claude Code, Codex, Pi). User-facing orientation: [why it exists](https://github.com/perniemann/pnCore#why-this-exists), [install](https://github.com/perniemann/pnCore#install), [workflows](https://github.com/perniemann/pnCore#workflows). Full catalog: [docs/plugin-reference.md](https://github.com/perniemann/pnCore/blob/main/docs/plugin-reference.md).

## Install

**Add the Cursor plugin to a project:** From that project's directory, run:
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

After install: rules apply by file glob; use `/pn-command-name` in chat. **New project?** `/pn-new` — questionnaire Step 0 of 2 (references) then Step 1 of 2 (intent: full auto | design focused | involved). **Build or extend:** `/pn-build` or `workflow_step("full_dev", 0, {})`. **Design-first:** `/pn-design` (`workflow_step("design")`). When MCP is available, pn-build-gate prefers the workflow; otherwise it loads pn-design or pn-build.

## Example prompts

**Quick start:** `/pn-build` — *Build a mobile-first fitness tracking app. Minimal modern design, gamification. Log workouts, compound score, level up/down by threshold and time.*

**Market-ready (blank to full product):** Blank project to full product with Involved gates. Use `/pn-document` to format docs.

```
pn-new ▲

Build [your-project-name] — [one-line description: e.g. landing page, auth, core features].
References: [path or "in .ref/"] (pitch, requirements, design assets).
Analyze both: prior art and design.
Intent: Involved — full gates at discovery, prior-art, plan, specialist list, and review.
Delivery tier: full. Design ambition: distinctive.
```

pn-new questionnaire: Step 0 of 2 — Yes, Both. Step 1 of 2 — (3) Involved.

**Pitch-to-app (full pnCore flow):** Start from a pitch idea and use every feature—discovery questionnaire (ask_question at each section), prior art, roadmap with dev phases, design fully aligned with me (ask for purpose, tone, a11y, components; gate on approval after wireframes, user flows, design system), pn-assets-manager (SVGs + placeholders), Supabase and Stripe. User is gated at each step. Stack chosen via questionnaire, not assumed. See [pitch-to-app full prompt](../../docs/pitch-to-app-example.md).

## MCP server

The **MCP server** is the engine (`workflow_step` plus the other tools) and runs in any MCP client. This plugin is the **Cursor** adapter — slash palette, file-glob rules, agent selector, stop hook. Claude Code, Codex, and Pi get their own folders via `plugin-install --harness`. Use MCP plus this plugin together on Cursor. Full breakdown: [Plugin vs MCP](https://github.com/perniemann/pnCore/blob/main/packages/pn-core-mcp/README.md#plugin-vs-mcp).

Same workflows on any client: `workflow_step`, `harness_detect` / `harness_scaffold`, `workflow_verify`, resources, and prompts. Tool list: [MCP README](https://github.com/perniemann/pnCore/blob/main/packages/pn-core-mcp/README.md#tools). Concise map: [MCP usage guide](https://github.com/perniemann/pnCore/blob/main/docs/mcp-usage-guide.md). Install, env vars, and error codes: [packages/pn-core-mcp README — Installation](https://github.com/perniemann/pnCore/blob/main/packages/pn-core-mcp/README.md#installation). Repo entry: [README — MCP](https://github.com/perniemann/pnCore#mcp-any-mcp-client). Pairing **pn-core** with **Octocode**: [companion MCP catalog](https://github.com/perniemann/pnCore/blob/main/docs/companion-mcp-catalog.md).

## Scripts

Full script table (validate, build, sync, MCP config, etc.): [CONTRIBUTING.md — Scripts](https://github.com/perniemann/pnCore/blob/main/CONTRIBUTING.md#scripts). For **plugin folder** work from a clone:

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

MIT — see [LICENSE](../../LICENSE).
