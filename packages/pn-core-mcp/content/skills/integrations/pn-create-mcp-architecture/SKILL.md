---
name: pn-create-mcp-architecture
description: Create MCP.md documenting MCP servers in use, purpose, and integration points. Use when project uses multiple MCPs or needs MCP documentation.
---

# Create MCP Architecture Document

## Purpose

Create `docs/MCP.md` that documents which MCP servers the project uses, their purpose, and how they integrate. Enables onboarding and tooling maintenance.

## When to use

- During project kickoff when discovery or workspace indicates multiple MCPs in use
- When project relies on MCPs (e.g. pn-core, Octocode, Stripe, n8n, shadcn) for development
- When adding or documenting MCP setup for a project

## Input

- Discovery spec (stack, integrations mentioned)
- Workspace `.cursor/mcp.json` or equivalent if inspectable
- Known MCPs: pn-core, Octocode, Stripe, n8n, shadcn, Playwright, etc.

## Instructions

1. **Identify MCPs in use:** From discovery (payments → Stripe MCP; workflows → n8n MCP; UI → shadcn MCP; code research → Octocode), workspace config if available, or user confirmation.

2. **Apply template:**

```markdown
# [Project] MCP Architecture

## Overview
Which MCPs this project uses and why.

## MCP Servers

| MCP | Purpose | Integration |
|-----|---------|-------------|
| pn-core | Skills, agents, workflows, orchestration | Primary orchestration |
| [name] | [purpose] | [how it's used] |
| ... | ... | ... |

## Agent → MCP → Tool
Example flows: e.g. Frontend work → pn-core → pn-frontend-developer; Code trace → Octocode → lspGotoDefinition.

## Configuration
- Config path: `.cursor/mcp.json` (or equivalent)
- Env vars or secrets required (do not include values)
```

3. **Load pn-documentation:** Apply format conventions.

4. **Save to:** `docs/MCP.md`. Create `docs/` if missing.

## Output

- MCP doc at `docs/MCP.md`
- Gate: "MCP architecture doc complete. Proceed?" when in workflow.

## Integration

- **pn-new (Involved mode):** Optional step when MCPs in use; runs before refs index.
- **pn-tooling-mcp-maintenance:** For config review and version compatibility; this skill produces the doc.
