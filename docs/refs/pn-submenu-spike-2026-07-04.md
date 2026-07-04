# pn slash submenu spike — 2026-07-04

Gate artifact for ADR-0008 / WP0 before recursive command sync.

## Official platform support

### Cursor IDE

- `.cursor/commands/` subfolders are scanned recursively in Cursor IDE 2.6+ ([forum, Mar 2026](https://forum.cursor.com/t/subfolders-within-cursor-commands-folder-supported-in-ide-but-not-cli/154719)).
- Expected UX: folder `pn/` appears as a **`pn`** submenu group; leaf filename determines slash name.
- **Cursor CLI** reads top-level `.md` only — nested leaves are IDE-only. Mitigation: top-level `pn.md` router stub.

### pi.dev (Pi coding agent)

Official docs (verified 2026-07-04):

- [Prompt Templates](https://pi.dev/docs/latest/prompt-templates) — loading rules, filename → `/name`, frontmatter
- [Pi Packages](https://github.com/badlogic/pi-mono/blob/main/packages/coding-agent/docs/packages.md) — `pi.prompts` manifest, `pi-package` keyword, convention `prompts/` dir

| Feature | Pi support | Doc source |
|---------|------------|------------|
| Nested **`pn` submenu** in `/` picker | **No** — flat autocomplete list | [prompt-templates](https://pi.dev/docs/latest/prompt-templates) § Usage |
| Recursive prompt discovery | **No** — `prompts/` loads direct `.md` children only | [prompt-templates](https://pi.dev/docs/latest/prompt-templates) § Loading Rules |
| Subdirectory templates | **Yes** — only when listed explicitly in `prompts` settings or `pi.prompts` manifest (each path still non-recursive) | [prompt-templates](https://pi.dev/docs/latest/prompt-templates) § Loading Rules |
| Command name | Filename stem — `pn-build.md` → `/pn-build` | [prompt-templates](https://pi.dev/docs/latest/prompt-templates) § Format |
| Frontmatter `description` | Supported; optional `argument-hint` for autocomplete | [prompt-templates](https://pi.dev/docs/latest/prompt-templates) § Format |
| Package install | `pi install` + `package.json` `"pi": { "prompts": ["./prompts"] }` | [packages.md](https://github.com/badlogic/pi-mono/blob/main/packages/coding-agent/docs/packages.md) § Creating a Pi Package |

**Gate:** Official Pi docs do **not** document submenu grouping. Our nested `pn/{category}/` layout is unsupported on Pi; flat sync is the documented path.

**pnCore Pi strategy:** sync visible commands to flat `plugins/pnCore/prompts/pn-*.md` plus `package.json` `pi.prompts: ["./prompts"]` and `keywords: ["pi-package"]`. Category folders under `.cursor/commands/pn/` are **Cursor-only**; Pi users type `/pn-build` from the flat prompt list (prefix filter in autocomplete).

Alternative (not used): manifest globs such as `"./prompts/**/*.md"` could load nested files, but would still appear as a **flat** `/` list — no submenu UX gain.

## Spike files (removed after verification)

Temporary files were placed at:

- `plugins/pnCore/.cursor/commands/pn/_spike-a.md`
- `plugins/pnCore/.cursor/commands/pn/_spike-b.md`

**Expected IDE checks (manual):**

1. `/` shows **`pn`** group
2. Leaves invoke as `/pn-build` when file is `pn/build/pn-build.md` (frontmatter `name: pn-build`)
3. Plugin-delivered path behaves same as manual copy

## Gate decision

**Proceed with WP1–WP3** using dual delivery:

- **Cursor:** nested `.cursor/commands/pn/{category}/pn-*.md` + root `pn.md` stub
- **Pi:** flat `plugins/pnCore/prompts/pn-*.md` via sync

Record manual IDE confirmation in PR before merge when available.
