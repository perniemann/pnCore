# Pi command grouping research — pnCore `/pn` menu

Research date: 2026-07-06. Shipped in **v0.17.1** (`6263a64`). Index parity CI in follow-up commit.

## Problem

pnCore ships 27+ slash workflows. Users wanted **one** main-menu entry — **`/pn`** — on Pi (like `/model` or `/settings`), not a flat flood of `/pn-build`, `/pn-design`, … in the slash autocomplete.

Cursor IDE solves this with nested `.cursor/commands/pn/{category}/` folders (ADR-0008). Pi prompt templates do **not** support folder-based submenus.

## Pi platform constraints (sources)

| Source | Finding |
|--------|---------|
| [Prompt Templates](https://pi.dev/docs/latest/prompt-templates) | Filename → flat `/name`; non-recursive `prompts/` discovery |
| [extensions.md](https://github.com/badlogic/pi-mono/blob/main/packages/coding-agent/docs/extensions.md) | `pi.registerCommand()` for custom slash commands; `getArgumentCompletions` for args |
| [tui.md](https://github.com/badlogic/pi-mono/blob/main/packages/coding-agent/docs/tui.md) | **Pattern 1:** `SelectList` + `ctx.ui.custom()` for selection dialogs |

Built-in commands (`/model`, `/settings`) are TUI-only and excluded from `pi.getCommands()` — extension commands can mimic that UX.

## Options evaluated

| Approach | Main `/` entries | Grouping UX | Verdict |
|----------|------------------|-------------|---------|
| **`pi.prompts` flat sync** | ~27 | Prefix filter only in autocomplete | Rejected — menu clutter (pre–v0.17.1) |
| **`pi.prompts` nested globs** | ~27 | Still flat names in picker | Rejected — no submenu gain (spike 2026-07-04) |
| **Many `registerCommand("pn-build", …)`** | ~27 | None | Rejected — same clutter |
| **`registerCommand("pn")` + SelectList** | **1** | Category in list descriptions; sorted index | **Shipped** |
| **Multi-tier custom TUI** (nested SelectLists) | 1 | True sections | Deferred — overkill for v1 |
| **MCP `get_command` only** | 0 Pi slash | N/A | Insufficient — user expects `/pn` in Pi |

## Decision (shipped)

1. **Remove** root `pi.prompts` from `package.json` manifest (validator enforces omission).
2. **Sync** visible command bodies to flat `plugins/pnCore/prompts/pn-*.md` (storage only — not Pi prompt registration).
3. **Generate** `plugins/pnCore/pi-command-index.json` at `npm run sync:content` with `id`, `category`, `description`, `file`.
4. **Register** `pi.registerCommand("pn", …)` in `packages/pn-core-mcp/extensions/pn-command-menu.ts`:
   - No args → `SelectList` picker (Pi tui.md Pattern 1).
   - `/pn pn-build` → load template into editor via `setEditorText`.
   - `getArgumentCompletions` for direct invoke.
5. **Reload** index on `session_start` and each `/pn` invocation.

## Cursor vs Pi parity

| Platform | Entry | Leaves |
|----------|-------|--------|
| **Cursor IDE** | `/` → **`pn`** submenu folder | Nested palette |
| **Pi TUI** | **`/pn`** extension command | SelectList or `/pn <id>` |
| **Cursor CLI** | `/pn` stub or MCP `get_command` | No nested palette |

Category folders under `content/commands/pn/` remain **Cursor-only**; Pi categories come from sync index metadata.

## Validation

- `scripts/pi-command-index.mjs` — build index from canonical commands.
- `validatePiCommandIndexParity()` — every index `file` exists under `prompts/`.
- `validatePiCommandIndexFreshness()` — committed index matches rebuild.
- Wired in `check-content-plugin-sync.mjs` (CI / `npm run validate`).

## References

- [ADR-0008](adr/0008-command-palette-pn-submenu.md) — Cursor submenu + Pi extension path (amended 2026-07-06)
- [ADR-0009](adr/0009-pi-native-tools.md) — Pi extension colocation
- `packages/pn-core-mcp/extensions/pn-command-menu.ts`
- `docs/refs/pn-submenu-spike-2026-07-04.md` — pre-extension spike (superseded § Pi strategy)
