# pnCore Metrics Dashboard

A single hand-authored HTML page that snapshots pnCore's current state: inventory (skills, commands, rules, agents), **skill `SKILL.md` sizes** (distribution + top 10), **M3 hot skills** (from the optional load log), token budget, build baselines, and optimization gate status.

## Two modes

The page operates in either of two modes, transparently:

- **Live** — when served by the local dashboard server (`npm run dashboard`), the page hydrates from `/api/snapshot` on load and on the **Refresh** button. The header shows a `LIVE` pill. Numbers reflect the current state of the filesystem and `bench/REPORT.md` (generate with `npm run bench:write`) at the moment of fetch.
- **Static** — when opened via `file://` (no server), the page renders the inline snapshot baked into the HTML. The header shows a `STATIC` pill. Refresh button still works but will fall back to the inline values if the fetch fails.

The inline snapshot is regenerated whenever an agent re-runs the dashboard plan, so it is never far behind reality.

## How to use

### Live (recommended)

```bash
npm run dashboard
```

Then open <http://localhost:4173/>. Click **Refresh** any time to re-pull. Stop with `Ctrl+C`.

The server is local-only, read-only, zero-dep (just Node `http` + `fs`). It listens on port `4173`; override with `PORT=5000 npm run dashboard`.

### Static

Double-click `docs/dashboard/index.html`, or:

```bash
# Windows
start docs/dashboard/index.html

# macOS
open docs/dashboard/index.html

# Linux
xdg-open docs/dashboard/index.html
```

Google Fonts (`Space Grotesk`, `DM Mono`) load from CDN the first time; everything else is local. With no network, the page still renders using monospace/sans-serif fallbacks.

## How to refresh the static snapshot

The inline values are only updated when an agent re-runs the dashboard plan, which:

1. Calls `health`, `list_skills`, `list_agents`, `list_commands`, `list_rules` via the pn-core MCP server.
2. Re-reads [`bench/REPORT.md`](../../bench/REPORT.md) when present (generate with `npm run bench:write`) for the latest baselines and gate verdicts.
3. Overwrites the inline numbers in `index.html`.
4. Updates the snapshot date in this README and in the page footer.

For continuous freshness, just leave `npm run dashboard` running — Refresh always reflects the current filesystem.

## Data sources

The live server scans the same on-disk content that the MCP server exposes, so counts match `pn-core` MCP exactly.

| Section | Live source | Static source |
|---|---|---|
| Version + status | `packages/pn-core-mcp/package.json` + literal `"ok"` | `health` MCP tool |
| Skills + categories | `packages/pn-core-mcp/content/skills/<cat>/<id>/SKILL.md` walk | `list_skills` |
| Commands | `packages/pn-core-mcp/content/commands/*.md` count (canonical total; includes both palette-visible and `slash: false` palette-hidden surgical commands) | `list_commands` (returns the same canonical set) |
| Rules | `packages/pn-core-mcp/content/rules/*.{mdc,md}` count | `list_rules` |
| Agents | `packages/pn-core-mcp/content/agents/*.md` count | `list_agents` |
| Token budget + build baseline + gates | [`bench/REPORT.md`](../../bench/REPORT.md) parsed when present (`npm run bench:write`) | same, embedded inline |
| **Skill file sizes** (min / median / p95 / max, histogram, largest 10) | Every `content/skills/<category>/<id>/SKILL.md` read and measured (est. tokens ≈ chars ÷ 4) | Not available without the server; static page shows `—` in those cells |
| **M3 — hot skills** (ranked load counts) | `.pncore/skill-load-log.jsonl` at repo root — one JSON line per `get_skill` (file is gitignored) | No log on disk → empty state copy |

`skill-load-log.jsonl` is written by the MCP `get_skill` handler when the server runs inside a workspace. If the file is missing, `totalEvents` is 0 and the UI explains how to populate it.

## Why HTML, not a Cursor Canvas

A Cursor Canvas requires `useHostTheme()` tokens and forbids hardcoded color, custom fonts, and font sizes above H1 (24px). The "Technical Studio" aesthetic this dashboard expresses — warm-dark base, single amber accent, oversized display numerals, Space Grotesk + DM Mono — is incompatible with that contract. Plain HTML is the honest medium for this look.
