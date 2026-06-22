---
name: pn-design-dna
description: Design with cinematic studio DNA — portfolio, reel, lab, editorial surfaces. Loads DNA preamble then runs pn-design. Use when the deliverable needs cinematic or editorial-brutalist structure.
---

# pn-design-dna

**Start every response with:** `[pn-command] 🔺`

Runs the **embedded studio DNA** layer, then the standard **design** loop so gates stay compatible with MCP and **`pn-design`**.

## 1. Load DNA

1. Fetch **`pn-core://reference/embedded-studio-dna.md`** (MCP resource) or read the synced copy under `plugins/pnCore/reference/embedded-studio-dna.md` when MCP is absent.
2. **`get_skill("pn-embedded-studio-dna")`** and follow its **When to use** and **Instructions**.
3. Load **`pn-core://reference/design-intent.md`**: emit **Design Read** + tuning dials (studio-cinematic preset or DNA-aligned values). These flow into **`pn-design`** plan step 2 and **studio** tier at **`pn-preflight`**.

Summarize for the user in four bullets: **register** (commercial vs lab), **hero strategy**, **evidence strip pattern**, **motion approach**—then proceed.

## 2. Design loop (delegate)

**When `workflow_step` is available:** After step 1, call `workflow_step("design", 0, {})` and prepend to state (or first assistant message) a short **`embeddedStudioDnaSummary`** string so later steps keep DNA constraints in context.

**Otherwise:** Run **`get_command("pn-design")`** and follow it end-to-end. Before each major step (plan, assets, build), re-read the DNA summary and **do not** collapse lab register into commercial chrome (or the inverse).

## 3. Done criteria

- Output matches **embedded-studio-dna** principles (structure, registers, evidence, motion).
- Standard **pn-design** outcomes still hold: plan, skeptic, assets, build, skeptic-on-output per that command.

## See also

- **`pn-design`** — Core design-first workflow.
- **`pn-visual-tweak`** — Small bounded visual edits after DNA-aligned ship.
- **`pn-core://reference/aesthetics-baseline.md`** — Non-generic UI floor.
