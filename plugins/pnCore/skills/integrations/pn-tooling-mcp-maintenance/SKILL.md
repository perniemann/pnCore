---
name: pn-tooling-mcp-maintenance
description: MCP server configuration review, integration testing, version compatibility. Use when adding or updating MCP servers, or ensuring integration reliability.
---

# MCP tooling and maintenance

## When to use

- Adding a new MCP server to `.cursor/mcp.json` or equivalent
- Updating an existing MCP server version
- Diagnosing MCP connection or tool availability issues
- Maintaining a catalog of approved servers (ownership, versions, capabilities)

## Workflow

1. **Configuration review:** Check `mcp.json` for correct server paths, env vars, and required config. Ensure no inline secrets.
2. **Version compatibility:** Document server and SDK versions. Pin versions for reproducibility. Check changelog for breaking changes.
3. **Integration test:** Verify server starts, `health` (if available) returns OK, tools are discoverable. Test one read and one write (if applicable) per server.
4. **Catalog:** When maintaining an approved list, record: server id, version, capabilities, security review date, compliance tags.

## MCP Best Practices alignment

- **Vet and catalog:** Only adopt servers that are maintained, reviewed, versioned, and policy-compliant.
- **Versioned APIs:** Keep backward-compatible endpoints for long-running pipelines.
- **Dependency protection:** Bounded concurrency, strict validation of third-party responses.

## Output

- Config review notes (pass/fail, recommendations)
- Upgrade checklist when updating
- Runbook entry for common failures (connection, timeout, tool not found)
