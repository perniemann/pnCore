---
name: pn-create-refs-index
description: Create a refs index under docs/refs/README.md listing PRD, design doc, domain doc, optional stack/MCP/UI, discovery, plans, and research. Use during project_kickoff (MCP) or when consolidating doc pointers.
---

# Create Refs Index

## Purpose

Create **`docs/refs/README.md`**—a human-readable index of project documents. **`workflow_step("project_kickoff")`** expects this path as the final doc artifact before project context.

## When to use

- During **`project_kickoff`** (step 6) after PRD, design, domain, prior art, and optional refs
- After creating or moving docs under **`docs/refs/`**
- When the user wants a single entry point for refs

## Input

- Files under **`docs/refs/`** (e.g. `PRD.md`, `DESIGN-DOC.md`, `DOMAIN-DOC.md`, `STACK.md`, `MCP-ARCHITECTURE.md`, `UI-DESIGN-SPEC.md`)
- **`docs/discovery/`**, **`docs/plans/`**, **`docs/research/`** (link only what exists)
- Optional: **`docs/WORKFLOW.md`** (from pn-create-workflow-roadmap after planning—not part of `project_kickoff`)

## Instructions

1. **Scan `docs/refs/`, `docs/discovery/`, `docs/plans/`, `docs/research/`:** List files that exist. Do not create entries for missing files.

2. **Create the index** with this structure (adapt links to actual filenames):

```markdown
# [Project Name] — Document index

## Refs (`docs/refs/`)

| Doc | Purpose |
|-----|---------|
| [PRD.md](PRD.md) | Requirements, features, phases |
| [DESIGN-DOC.md](DESIGN-DOC.md) | Vision, UX, IA, visual system |
| [DOMAIN-DOC.md](DOMAIN-DOC.md) | Mechanics, progression (when applicable) |
| [STACK.md](STACK.md) | Tech stack (when multi-stack) |
| [MCP-ARCHITECTURE.md](MCP-ARCHITECTURE.md) | MCP servers in use (when applicable) |
| [UI-DESIGN-SPEC.md](UI-DESIGN-SPEC.md) | Tokens, components (when UI in scope) |

## Other paths

| Path | Purpose |
|------|---------|
| [../discovery/…](../discovery/) | Discovery specs |
| [../plans/…](../plans/) | Implementation plans |
| [../research/…](../research/) | Prior-art research |
```

3. **Include only existing files.** Use relative links from **`docs/refs/README.md`** (e.g. `PRD.md` for siblings, `../research/...` for research).

4. **Save to:** **`docs/refs/README.md`**. Create **`docs/refs/`** if missing.

## Output

- Index at **`docs/refs/README.md`**
- File path reported to user
- Gate: "Refs index complete. Proceed?" Use ask_question or workflow_confirm when available.

## Integration

- **`project_kickoff` (MCP):** Step 6 runs this after optional stack/MCP/UI docs
- **Legacy layouts** that used `docs/REF-INDEX.md` may migrate by moving content into **`docs/refs/README.md`** for consistency with the engine
