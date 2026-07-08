---
name: pn
description: pnCore command menu — routes to build, design, PM, audit, and ship workflows. Use when unsure which pn command to run. Cursor IDE opens the pn submenu; CLI and Pi use this stub or get_command.
---

# pn

**Start every response with:** `[pn-command] 🔺`

Orientation router for the **pnCore command palette**. In Cursor IDE, type `/` and open the **`pn`** submenu for all commands. On Cursor CLI or [pi.dev](https://pi.dev), use this stub or MCP `get_command` / `get_skill`.

## Step 1 — Pick a track

Use `ask_question` when available:

1. **Start** — new project, setup, or guide (`pn-new`, `pn-setup`, `pn-guide`)
2. **Build** — full dev, program, deliver (`pn-build`, `pn-program`, `pn-best-of-n`, `pn-deliver`)
3. **Design** — UI build, variants, polish, assets (`pn-design`, `pn-visual-tweak`, `pn-polish`, …)
4. **Product management** — PRD, stories, strategy (`pn-create-prd`, `pn-user-stories`, `pn-strategy`, …)
5. **Audit** — frontend or backend quality (`pn-frontend-audit`, `pn-backend-audit`)
6. **Challenge** — plan stress-test (`pn-grill`, `pn-skeptic`, `pn-prompt-optimize`)
7. **Ship** — review, handoff, retro, video lint (`pn-review`, `pn-handoff`, `pn-retro`, `pn-video-lint`)
8. **Show full map** — load `get_command("pn-guide")`

## Step 2 — Run

Load the chosen command via `get_command("<id>")` and follow its contract.

## Platform notes

| Platform | How to reach commands |
|----------|------------------------|
| **Cursor IDE** | `/` → **`pn`** submenu → pick leaf (e.g. `pn-build`) |
| **Cursor CLI** | This `/pn` stub or `get_command("<id>")` — nested submenu not available |
| **pi.dev** | `/pn` opens the pnCore command menu (like `/model`); pick a workflow from the selector. Direct: `/pn pn-build` |

## Guardrails

- Do not block on this router when the user already named a command — run that command directly.
- Technical plan review → `pn-skeptic` or `pn-grill`, not `pn-pressure-test`.
