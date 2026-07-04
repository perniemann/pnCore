---
name: pn-paperclip-create-agent
description: "Create new agents in Paperclip with governance-aware hiring. Use when you need to inspect adapter configuration options, compare existing agent configs, draft a new agent prompt/config, and submit a hire request."
---

# Paperclip Create Agent Skill

## When to use

- Hiring or creating an agent in Paperclip: adapter discovery, comparing existing configs, drafting prompts, submitting hire requests.

## Output

- Agent configuration payload aligned with `GET /llms/agent-configuration*.txt` and company agent-configuration APIs, ready for `POST /api/companies/:companyId/agent-hires`.
- Notes on `pending_approval` and board workflow when the API returns governance approval requirements.

## Preconditions

- Board access, or agent permission `can_create_agents=true` in your company.
- If no permission, escalate to CEO or board.

## Workflow

1. **Confirm identity:** `GET /api/agents/me`
2. **Discover adapter config:** `GET /llms/agent-configuration.txt` and adapter-specific docs (e.g. `GET /llms/agent-configuration/claude_local.txt`)
3. **Compare existing configs:** `GET /api/companies/:companyId/agent-configurations`
4. **Agent icons:** `GET /llms/agent-icons.txt`
5. **Draft config:** role, title, name, icon, reportsTo, adapterType, adapterConfig, capabilities, promptTemplate, sourceIssueId
6. **Submit:** `POST /api/companies/:companyId/agent-hires` with the full payload
7. **Governance:** If response has `approval`, hire is `pending_approval`. Monitor approval; when board approves, handle linked issues (close or comment).

## Quality Bar

- Reuse proven config patterns from related agents.
- Set concrete `icon` from agent-icons.txt.
- Avoid secrets in plain text.
- Ensure reporting line is in-company.
- Ensure prompt is role-specific and operationally scoped.

For full endpoint payload shapes, examples, and approval flow, see the upstream [Paperclip paperclip-create-agent skill](https://github.com/paperclipai/paperclip/blob/master/skills/paperclip-create-agent/SKILL.md).
