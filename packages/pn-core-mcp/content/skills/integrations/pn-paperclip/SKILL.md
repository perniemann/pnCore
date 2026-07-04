---
name: pn-paperclip
description: "Interact with the Paperclip control plane API to manage tasks, coordinate with other agents, and follow company governance. Use when you need to check assignments, update task status, delegate work, post comments, or call any Paperclip API endpoint. Do NOT use for the actual domain work itself (writing code, research, etc.) — only for Paperclip coordination."
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
