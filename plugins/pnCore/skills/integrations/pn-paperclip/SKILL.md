---
name: pn-paperclip
description: "Paperclip control plane: tasks, assignments, status, comments, delegation, and creating Paperclip agents and adapters. Use for Paperclip coordination only, not the domain work itself."
---

# Paperclip Skill

Use this when working on tasks that originated from [Paperclip](https://github.com/paperclipai/paperclip) or when you need to report workflow completion back to Paperclip.

## When to use

- Tasks tied to Paperclip issues: checkout before work, comment, mark done, or sync status with governance rules.
- Any Paperclip API coordination (assignments, subtasks, identity) when domain coding is not the goal.

## Output

- Correct sequencing of MCP tools (`paperclip_issue_checkout`, `paperclip_issue_comment`, `paperclip_issue_update`) and HTTP calls for other endpoints per docs.
- Issue state and comments updated in Paperclip when env vars (`PAPERCLIP_API_URL`, `PAPERCLIP_API_KEY`, optional `PAPERCLIP_ISSUE_ID`) are set.

## pnCore Integration

When running inside Cursor with pnCore MCP:

- **Checkout (start work):** Call `paperclip_issue_checkout` before implementing. Pass `issueId` or rely on `PAPERCLIP_ISSUE_ID`. Do not use `paperclip_issue_update` with `in_progress` for that — checkout owns the transition.
- **Comments:** Call `paperclip_issue_comment` with `body` (markdown; @mentions supported per Paperclip docs). `issueId` optional when `PAPERCLIP_ISSUE_ID` is set.
- **Mark issue done:** Call `paperclip_issue_update` with `status: "done"` and optional `comment`. `issueId` optional when `PAPERCLIP_ISSUE_ID` is set.
- **Workflow complete:** Terminal `workflow_step` instructions include a Paperclip reminder when `PAPERCLIP_API_URL` and `PAPERCLIP_API_KEY` are configured; call `paperclip_issue_update` (and checkout earlier if you had not already).

## Authentication

Env vars: `PAPERCLIP_API_URL`, `PAPERCLIP_API_KEY`. Optional: `PAPERCLIP_ISSUE_ID` (default issue for all three tools when `issueId` is omitted), `PAPERCLIP_RUN_ID` (sent as `X-Paperclip-Run-Id`), `PAPERCLIP_AGENT_ID`, `PAPERCLIP_COMPANY_ID`. All requests use `Authorization: Bearer $PAPERCLIP_API_KEY`.

## Key Endpoints (Quick Reference)

| Action | Endpoint |
|--------|----------|
| My identity | `GET /api/agents/me` |
| My assignments | `GET /api/companies/:companyId/issues?assigneeAgentId=:id&status=todo,in_progress,blocked` |
| Checkout task | `POST /api/issues/:issueId/checkout` |
| Update task | `PATCH /api/issues/:issueId` (status, comment) |
| Add comment | `POST /api/issues/:issueId/comments` |
| Create subtask | `POST /api/companies/:companyId/issues` |

## Rules

- **Always checkout** before working. Never PATCH to `in_progress` manually.
- **Never retry a 409** — task belongs to someone else.
- Use `paperclip_issue_checkout`, `paperclip_issue_comment`, and `paperclip_issue_update` (pnCore) for the rows above; use direct HTTP for other endpoints (assignments, subtasks, etc.).
- Budget: agents auto-pause at 100%. Above 80%, focus on critical tasks only.

For the full heartbeat procedure, API reference, and governance rules, see the upstream [Paperclip paperclip skill](https://github.com/paperclipai/paperclip/blob/master/skills/paperclip/SKILL.md).

<!-- merged from pn-paperclip-create-agent (0.22.0) -->
## Paperclip Create Agent Skill

### When to use

- Hiring or creating an agent in Paperclip: adapter discovery, comparing existing configs, drafting prompts, submitting hire requests.

### Output

- Agent configuration payload aligned with `GET /llms/agent-configuration*.txt` and company agent-configuration APIs, ready for `POST /api/companies/:companyId/agent-hires`.
- Notes on `pending_approval` and board workflow when the API returns governance approval requirements.

### Preconditions

- Board access, or agent permission `can_create_agents=true` in your company.
- If no permission, escalate to CEO or board.

### Workflow

1. **Confirm identity:** `GET /api/agents/me`
2. **Discover adapter config:** `GET /llms/agent-configuration.txt` and adapter-specific docs (e.g. `GET /llms/agent-configuration/claude_local.txt`)
3. **Compare existing configs:** `GET /api/companies/:companyId/agent-configurations`
4. **Agent icons:** `GET /llms/agent-icons.txt`
5. **Draft config:** role, title, name, icon, reportsTo, adapterType, adapterConfig, capabilities, promptTemplate, sourceIssueId
6. **Submit:** `POST /api/companies/:companyId/agent-hires` with the full payload
7. **Governance:** If response has `approval`, hire is `pending_approval`. Monitor approval; when board approves, handle linked issues (close or comment).

### Quality Bar

- Reuse proven config patterns from related agents.
- Set concrete `icon` from agent-icons.txt.
- Avoid secrets in plain text.
- Ensure reporting line is in-company.
- Ensure prompt is role-specific and operationally scoped.

For full endpoint payload shapes, examples, and approval flow, see the upstream [Paperclip paperclip-create-agent skill](https://github.com/paperclipai/paperclip/blob/master/skills/paperclip-create-agent/SKILL.md).

<!-- merged from pn-paperclip-create-agent-adapter (0.22.0) -->
## Creating a Paperclip Agent Adapter

An adapter bridges Paperclip's orchestration layer to a specific AI agent runtime (Claude Code, Codex CLI, Cursor, HTTP endpoint, etc.).

### Architecture

Each adapter in `packages/adapters/<name>/` provides:

- **Server:** `execute`, sessionCodec, parse helpers
- **UI:** parseStdoutLine, buildConfig for agent creation form
- **CLI:** formatStdoutEvent for `paperclipai run --watch`

### When to use

- Building a new adapter for Cursor, e2b, or another runtime
- Extending the existing claude-local or codex-local adapters
- Understanding Paperclip's execution and session persistence model

### Reference

For the full guide (interfaces, module structure, registration points, conventions), see the upstream [Paperclip create-agent-adapter skill](https://github.com/paperclipai/paperclip/blob/master/skills/create-agent-adapter/SKILL.md).

### Output

- Adapter layout and registration plan consistent with `packages/adapters/<name>/` (server, UI, CLI) and Paperclip execution contracts.
- List of files or modules to add or change; defer verbatim upstream text to the Paperclip skill when it is authoritative.
