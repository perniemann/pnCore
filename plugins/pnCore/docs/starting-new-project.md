# Starting a New Project

Guide for starting a new project with pnCore MCP. **`workflow_step("project_kickoff", …)`** produces a refs bundle under **`docs/refs/`** plus discovery, research, and project context—**before** you run **`full_dev`** or **`design`**.

## When to use

- New project with no docs
- You want PRD, DESIGN, prior art, and a refs index before implementation planning inside **`full_dev`**

## Prerequisites

- pn-core MCP enabled in your Cursor config (`.cursor/mcp.json` or equivalent)
- Workspace open at project root

## Canonical flow: `project_kickoff` (8 steps, MCP)

Run `workflow_step("project_kickoff", 0, {})` and advance per tool instructions. Aligned with `packages/pn-core-mcp/src/workflows.ts`:

| Step | What happens | Main outputs |
|------|----------------|--------------|
| 0 | Discovery (pn-discovery-questionnaire) | `docs/discovery/YYYY-MM-DD-<slug>.md`, state: `discoveryPath` |
| 1 | PRD (pn-create-prd) | `docs/refs/PRD.md` |
| 2 | Design doc (pn-create-design-doc) | `docs/refs/DESIGN-DOC.md` |
| 3 | Domain doc when mechanics in scope (pn-create-domain-doc) | `docs/refs/DOMAIN-DOC.md` or skip |
| 4 | Prior art (pn-prior-art-research) | `docs/research/YYYY-MM-DD-<slug>-prior-art.md` |
| 5 | Optional: stack / MCP architecture / UI spec | `docs/refs/STACK.md`, `MCP-ARCHITECTURE.md`, `UI-DESIGN-SPEC.md` as applicable |
| 6 | Refs index (pn-create-refs-index) | **`docs/refs/README.md`** (index of refs + links) |
| 7 | Project context | `.cursor/rules/project-context.mdc`, `.cursor/skills/project/SKILL.md` |

**Not in this workflow:** `pn-writing-plans`, `docs/plans/`, and **`docs/WORKFLOW.md`** (from pn-create-workflow-roadmap). Those run during **`full_dev`** after discovery or when you explicitly plan.

Use `workflow_confirm` (MCP) or `ask_question` for gates when available.

## Alternative: `get_command("pn-new")`

Choose **(3) Involved** → when asked, opt into the full doc set. With MCP, prefer **`workflow_step("project_kickoff", 0, {})`** so steps match the engine. Without MCP, follow **`pn-new`** manual steps in the command text (same paths as above).

## Step 1: Review docs

Review **`docs/refs/`** (PRD, DESIGN-DOC, DOMAIN-DOC if present), **`docs/discovery/`**, and **`docs/research/`**. Confirm or adjust before build.

## Step 2: Build

Run `workflow_step("full_dev", 0, {})` or `workflow_step("design", 0, {})`. Prior kickoff docs inform discovery compact mode; you do not repeat kickoff.

## Step 3: Pipeline after build

Follow [FLOW.md](../reference/FLOW.md): skeptic → specialists → review → summary (and optionally **`pn-deliver`**).

## MCP-only usage

- Ensure pn-core MCP is in your MCP config
- Use `workflow_confirm` for gates when `ask_question` is unavailable
- Call **`list_workflow_types`** for step counts (project_kickoff: **8** steps)

## Diagram

```
pn-new → Involved → workflow_step("project_kickoff", …)  (8 steps)
    ↓
docs/refs/*, docs/discovery/, docs/research/, project context
    ↓
full_dev or design workflow
    ↓
Build → Review → Deliver
```

## Entry points

- **pn-new** — Involved + full doc set → routes to **`project_kickoff`** when MCP is available
- **pn-build-gate** — New project with no refs → suggest pn-new or **`project_kickoff`**
- **pn-mcp-proactive** — "Create project docs" → **`workflow_step("project_kickoff", 0, {})`**
