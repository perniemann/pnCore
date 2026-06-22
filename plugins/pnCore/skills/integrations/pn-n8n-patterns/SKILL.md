---
name: pn-n8n-patterns
description: Use when building or editing n8n workflows. Covers node choice, secrets, webhooks, error handling, retries, idempotency, modular design, observability, and version control. Follows common workflow automation patterns for reliability and security. Reference pn-backend-philosophy for secrets and error-handling patterns.
---

# n8n patterns skill

## When to use

- Designing or editing an n8n workflow (new or existing)
- Choosing nodes for a given task (HTTP, webhook, trigger, transform)
- Securing webhooks and credentials
- Implementing error handling, retries, or idempotency
- Structuring modular or production workflows
- Debugging or simplifying a workflow

**When n8n MCP is available** (e.g. n8n MCP Server Trigger exposing workflow tools): Use its tools to inspect, execute, or extend n8n workflows. Combine with this skill for node choice, secrets, webhooks, error handling, and production patterns. Reference `get_rule("pn-n8n")` for glob-triggered safety (no secrets in JSON).

For secrets and error boundaries, reference pn-backend-philosophy.

---

## Instructions

### 1. Node choice

- Use the most specific node that fits (e.g. HTTP Request for APIs, Webhook for inbound calls, Schedule for cron-like runs).
- Prefer built-in nodes over generic "Execute Command" or "Run Script" when they exist.
- Built-in nodes handle auth, retries, and error semantics better than custom scripts.

### 2. AI Agent nodes (when building agentic workflows)

- Use AI Agent nodes for autonomous decision-making and context-aware integration.
- Configure strategic tool selection: connect at least one tool sub-node (API calls, DB queries) so agents choose appropriate tools per task.
- Limit tool scope to prevent cluttered workflows as complexity grows.
- For AI Workflow Builder (Starter/Pro/Enterprise): build iteratively with short, specific prompts; name integrations explicitly (e.g. "Gmail", "Google Sheets"); avoid single huge prompts; validate and refine in iterations.

### 3. Data flow

- Filter early: remove unnecessary fields with Edit Fields (Set) node before heavy processing to reduce memory and latency.
- For large datasets (hundreds or thousands of items): use Loop Over Items (Split in Batches) with explicit batch size to avoid out-of-memory errors.
- Use IF nodes at entry points to catch malformed payloads before they propagate.
- Use JSON Schema or Set nodes to enforce data shapes at critical junctions; fail fast on invalid payloads.

### 4. Secrets and credentials

- Never put API keys, passwords, or webhook secrets in the workflow JSON.
- Use n8n credentials (or env vars) and reference them in node config.
- Use predefined credential types for popular services (OpenAI, Gmail, etc.) when available.
- Remind the user to add credentials in n8n UI or via env.
- For queue mode: set N8N_ENCRYPTION_KEY so all workers use the same encryption.

### 5. Webhooks

- Use HTTPS only.
- Set a strong webhook path or secret if the endpoint is exposed.
- Validate payload shape (required fields) in a following node; use JSON Schema or Set nodes for explicit contract enforcement.
- For GitHub, Stripe, Slack, etc.: validate HMAC signature. Use Webhook with Raw Body enabled; add a Crypto node to compute HMAC-SHA256 of the body; compare to header (e.g. X-Hub-Signature-256) using timing-safe comparison.
- Optional: validate timestamps in payloads to prevent replay attacks.

### 6. Error handling

- Design for failure: prioritize error paths over happy paths; consider Dead Letter Queue or Manual Human Gate for exceptions.
- Use Error Trigger or error outputs to handle failures and optionally notify.
- Link main workflow to an error workflow in workflow settings for centralized handling.
- Use "Continue using error output" to route to fallback paths (alternative service, manual review).
- Keep sensitive data out of error messages that might be logged or sent elsewhere.
- Use Stop and Error node when you need to halt and pass a custom message to the error workflow.

### 7. Retries and idempotency

- Enable "Retry On Fail" for external API calls (typically 3–5 tries, 5–10s delay between tries).
- Use exponential backoff where supported to avoid overwhelming failing services.
- For write operations (sending emails, charging cards, writing to DB): implement idempotency keys or deduplication locks so retries do not cause duplicate side effects.
- Retries are safe for read-only operations; dangerous without idempotency for state-changing operations.
- For external dependencies: consider circuit breaker patterns during sustained failures to prevent cascading failures.

### 8. Modular design

- Break complex workflows into smaller sub-workflows using Execute Sub-workflow node.
- Use sub-workflows when: workflow exceeds 50+ nodes, same logic appears in multiple workflows, processing large datasets (memory isolation), or need independent testing.
- Keep sub-workflows focused (5–10 nodes each); improves maintainability and execution time (40–60% faster with parallel processing).
- Avoid sub-workflows for simple linear workflows under 20 nodes.

### 9. Observability

- Log workflow failures to a centralized location (Google Sheets, PostgreSQL, MongoDB).
- Include: error message, execution URL, workflow name, workflow ID.
- Use correlation IDs at key phases for tracing across workflows.
- Link main workflow to a dedicated error workflow for triage, alerting, and dead-letter handling.
- Integrate with Sentry, Datadog, or Grafana when available.

### 10. Version control

- Export workflow JSON and store in Git or similar.
- Use versioned names for production (e.g. production-workflow-v1).
- Follow promotion discipline: dev → stage → prod.
- Assign workflow owners; maintain a one-page Runbook (how to restart, manual fallback, escalation).

### 11. Clarity

- Use clear node names and add short notes for non-obvious logic.
- Workflow naming: `Domain.Purpose.Trigger` (e.g. `sales.provisioning.webhook`); node naming: `Action_Object` (e.g. `Fetch_User_Record`).
- Prefer smaller, named workflows over one very large workflow when it improves readability.
- Group related nodes visually.

---

## Production workflow pattern (reference)

A common structure for production automations:

Trigger → Normalize → Dedup/State check → Map → Enrich → Act → Confirm → Audit

- **Trigger:** Webhook (low-latency events) or Schedule (batch, reconciliation).
- **Normalize:** Standardize payload shape.
- **Dedup:** Idempotency check; skip or handle duplicates.
- **Map/Enrich:** Transform and add context.
- **Act:** Primary business logic (write, notify, call API).
- **Confirm:** Success feedback.
- **Audit:** Log for compliance or debugging.

## Output

- Workflow design or edits with explicit node choice, credential handling, error and retry behavior, and idempotency where needed.
- Naming and structure notes (workflow/node names, version-control expectations) when production behavior changes.
