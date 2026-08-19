---
title: Folder structure (verified)
updated: 2026-04-22
---

# Folder structure (verified)

This repo follows [add-a-plugin.md](add-a-plugin.md). Layout:

---

## Repo root

When you open the **pnCore repo root** as the workspace, `.cursor-plugin/plugin.json` points at `plugins/pnCore/` for skills, agents, rules, commands, and hooks. Cursor loads content from the plugin folder. The **canonical source** for skills, agents, rules, config, docs, reference, and hooks is **`packages/pn-core-mcp/content/`**. After editing content there, run **`npm run sync:content`** from the repo root to copy into `plugins/pnCore/` so both stay in sync. Running `npm run install` from the repo root keeps the plugin mapping; it does not copy plugin content into root `.cursor/`.

```text
.cursor/                 # Workspace MCP: committed mcp.json launches node + packages/pn-core-mcp/dist (this repo only)
.cursor-plugin/
  plugin.json            # Points at plugins/pnCore/ for content
config/
docs/                    # Repo docs; agents-md-guide.md synced from content/docs/ via npm run sync:content
packages/pn-core-mcp/
  content/               # Canonical source for skills, agents, rules, config, docs, reference, hooks
plugins/pnCore/        # Plugin — synced from packages/pn-core-mcp/content/ via npm run sync:content
scripts/
```

**To use the plugin:** Run `npm run install` (or `node scripts/install-to-project.mjs`) from a project to copy the plugin there; then open that project in Cursor. Or open **`plugins/pnCore`** as the workspace to work on the plugin itself.

---

## Plugin (plugins/pnCore/)

Content here (skills, agents, rules, config, docs, reference, hooks) is **synced from** `packages/pn-core-mcp/content/`. Do not edit here; edit in MCP content and run `npm run sync:content`.

```text
.cursor/
  commands/              # Slash commands (/pn-new, etc.) — single source
.cursor-plugin/
  plugin.json            # Manifest; commands points to .cursor/commands
agents/
assets/
config/
docs/
hooks/
rules/
scripts/
skills/
CHANGELOG.md
README.md
```

---

## Verification

```bash
npm run validate
```

---

## Canonical content conventions

### Skills (`content/skills/**/SKILL.md`)

- YAML frontmatter `name` and `description` are authoritative for Cursor and MCP tooling. The first markdown heading (H1) is for readers: use a **short human-readable title** consistent with other skills in the same category folder (Title Case or sentence case). Avoid raw `pn-*` slugs in H1 unless you intentionally mirror a slash command name.

### Slash commands (`content/commands/*.md`)

- Long audit-style commands use `## Flow` and may include explicit progress lines (for example "Step N of M — …"). Reference: [pn-audit-api.md](../packages/pn-core-mcp/content/commands/pn-audit-api.md).
- Short commands may omit `## Flow` when a single section is enough.

### Content vs plugin sync

- `npm run validate` runs `check-content-plugin-sync`. After editing **`packages/pn-core-mcp/content/`**, run **`npm run sync:content`** before `npm run validate`, or validation fails. To check sync only: **`npm run check:content-sync`** (after syncing).
