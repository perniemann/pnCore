---
name: pn-create-mcp-architecture
description: "Create MCP.md documenting MCP servers, purpose, and integration points, and maintain MCP tooling (config review, version compatibility). Use when a project uses several MCPs."
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
- Config review and version compatibility: § MCP tooling and maintenance below. This skill produces the doc.

<!-- merged from pn-tooling-mcp-maintenance (0.22.0) -->
## MCP tooling and maintenance

### When to use

- Adding a new MCP server to `.cursor/mcp.json` or equivalent
- Updating an existing MCP server version
- Diagnosing MCP connection or tool availability issues
- Maintaining a catalog of approved servers (ownership, versions, capabilities)

### Workflow

1. **Configuration review:** Check `mcp.json` for correct server paths, env vars, and required config. Ensure no inline secrets.
2. **Version compatibility:** Document server and SDK versions. Pin versions for reproducibility. Check changelog for breaking changes.
3. **Integration test:** Verify server starts, `health` (if available) returns OK, tools are discoverable. Test one read and one write (if applicable) per server.
4. **Catalog:** When maintaining an approved list, record: server id, version, capabilities, security review date, compliance tags.

### MCP Best Practices alignment

- **Vet and catalog:** Only adopt servers that are maintained, reviewed, versioned, and policy-compliant.
- **Versioned APIs:** Keep backward-compatible endpoints for long-running pipelines.
- **Dependency protection:** Bounded concurrency, strict validation of third-party responses.

### Output

- Config review notes (pass/fail, recommendations)
- Upgrade checklist when updating
- Runbook entry for common failures (connection, timeout, tool not found)
