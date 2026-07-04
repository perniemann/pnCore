---
name: pn-a2a-interop
description: "Design and implement Agent2Agent (A2A) Protocol integrations — connecting pnCore-orchestrated agents with external agents built on other frameworks (LangGraph, ADK, CrewAI, AutoGen) or owned by other organizations. Covers A2A service cards, task routing, trust/auth, capability negotiation, and audit trail. Use when a project needs cross-framework or cross-org agent composition."
---

# A2A Interoperability Skill

**When used as a standalone skill, begin every response with** `[pn-skill] 🔺`

## When to use

- Connecting a pnCore-orchestrated agent to an external agent from a different framework or organization
- Designing a multi-agent system where specialist agents run independently (not all inside pnCore)
- Implementing or consuming an A2A-compliant service (well-known endpoint, Agent Card, task routing)
- Composing agents across an enterprise value chain (e.g. manufacturer ↔ supplier, retailer ↔ logistics)
- Auditing or adding inter-agent trust, authentication, or payment (Agent Payments Protocol / AP2)

---

## Background

The **Agent2Agent (A2A) Protocol** (Google, 2025) standardizes how agents advertise capabilities and exchange tasks across framework and ownership boundaries. An agent exposes an **Agent Card** at `/.well-known/agent.json`, accepts **tasks** via HTTP POST, streams results via SSE, and negotiates input/output MIME types.

Key concepts:

| Concept | Description |
|---------|-------------|
| **Agent Card** | JSON descriptor at `/.well-known/agent.json` — name, description, capabilities, skills, auth, endpoints |
| **Task** | The unit of work: `{ id, message, sessionId?, metadata? }` |
| **Part** | A typed content fragment in a message: `TextPart`, `FilePart`, `DataPart` |
| **Artifact** | Task output; same Part types; streamed or returned on completion |
| **Push notification** | Webhook callback for long-running tasks when client cannot poll |
| **AP2** | Agent Payments Protocol — agent-to-agent payment initiation/settlement |

---

## Instructions

### 1. Discover the remote agent

```
GET https://<remote-agent-host>/.well-known/agent.json
```

Parse the Agent Card and extract:
- `skills[]` — what the agent can do; match against your task requirements
- `authentication` — `none`, `apiKey`, `oauth2`, `mtls`
- `defaultInputModes` / `defaultOutputModes` — negotiate MIME types
- `capabilities.streaming` — SSE support
- `capabilities.pushNotifications` — push support

Confirm the card is fresh (check `Last-Modified` header). Reject stale or unsigned cards in high-trust contexts.

### 2. Author your own Agent Card (when exposing pnCore as an A2A provider)

Create `public/.well-known/agent.json` (or serve from the project's API layer):

```json
{
  "schemaVersion": "0.0.1",
  "name": "pnCore Orchestrator",
  "description": "Multi-specialist dev orchestrator: frontend, backend, review, planning.",
  "url": "https://<host>/a2a",
  "version": "1.0.0",
  "skills": [
    {
      "id": "frontend-build",
      "name": "Frontend Build",
      "description": "Scaffold or extend a frontend feature using React/Astro/Next.",
      "tags": ["frontend", "react", "astro"],
      "inputModes": ["text/plain", "application/json"],
      "outputModes": ["text/plain", "application/json"]
    },
    {
      "id": "backend-audit",
      "name": "Backend Audit",
      "description": "Security, API, and data layer audit for Node/Python/Go services.",
      "tags": ["backend", "security", "audit"]
    }
  ],
  "defaultInputModes": ["text/plain"],
  "defaultOutputModes": ["text/plain"],
  "capabilities": {
    "streaming": true,
    "pushNotifications": false
  },
  "authentication": {
    "schemes": ["apiKey"]
  }
}
```

Add skills for each pnCore workflow type you want to expose. Match `id` values to internal `workflow_step` types.

### 3. Send a task

```
POST https://<remote-agent-host>/a2a/tasks/send
Authorization: Bearer <token>
Content-Type: application/json

{
  "id": "<uuid-v4>",
  "sessionId": "<session-uuid>",
  "message": {
    "role": "user",
    "parts": [
      { "type": "text", "text": "Summarize Q1 revenue from the attached report." }
    ]
  }
}
```

- Generate `id` with `crypto.randomUUID()`.
- Reuse `sessionId` across related tasks for multi-turn context.
- For file input use `FilePart` with `mimeType` + `data` (base64) or `uri`.

### 4. Stream results (SSE)

For long tasks use `tasks/sendSubscribe` — same payload, SSE response. Handle event types:

| Event | Action |
|-------|--------|
| `TaskStatusUpdateEvent` | Update local task state (working / completed / failed / input-required) |
| `TaskArtifactUpdateEvent` | Accumulate output parts; detect `lastChunk: true` |

Implement a timeout (default 120 s) and heartbeat check; cancel via `tasks/cancel` if no progress.

### 5. Trust and authentication

- **API key:** Pass `Authorization: Bearer <key>` or `X-API-Key: <key>` per the Agent Card scheme.
- **OAuth2:** Follow the `oauth2` flow in the card; store tokens in env-level secrets, never in code.
- **mTLS:** Configure client certificate at the HTTP transport layer; rotate certs on a schedule.
- **Signed Agent Cards:** In regulated or cross-org contexts, verify the card is signed (JWT-wrapped) or hosted at a known, certificate-pinned domain.
- Do not pass credentials between agents in task payload bodies. Use transport-level auth only.

### 6. Intent verification (AP2 + high-trust flows)

When an agent is authorized to initiate payments or execute irreversible actions on behalf of a user:

1. Store the original user intent (signed, timestamped) before delegating to the remote agent.
2. Validate that the remote agent's requested action matches the stored intent scope.
3. For AP2 payment initiation: confirm amount, currency, and payee against pre-approved parameters before submitting.
4. Emit an `intent_verification` audit event (see §7) for every payment or destructive action.

### 7. Audit trail

Emit a structured log entry for every inter-agent task, regardless of outcome. Write to your project's audit sink (file, DB, SIEM):

```json
{
  "event": "a2a_task",
  "timestamp": "<ISO-8601>",
  "sessionId": "<uuid>",
  "taskId": "<uuid>",
  "localAgent": "pnCore Orchestrator",
  "remoteAgent": "<name from Agent Card>",
  "remoteAgentUrl": "<url>",
  "skill": "<skill-id>",
  "status": "completed | failed | cancelled",
  "durationMs": 1234,
  "approvedByHuman": false,
  "intentVerified": true
}
```

For `approval_checkpoint` integration: call `approval_checkpoint` before sending any task that triggers a payment, data write, or external system mutation.

### 8. Error handling and fallback

- On `failed` status: inspect `message.parts` for error detail; log; do not silently swallow.
- On `input-required` status: surface the agent's question to the local user or orchestrator; never auto-respond without explicit logic.
- On network timeout: mark task as `abandoned` in local state; retry once with a new `taskId` and same `sessionId`; surface to user if second attempt fails.
- Circuit-break after 3 consecutive failures from the same remote agent; alert operator.

### 9. Multi-agent topology patterns

| Pattern | When to use |
|---------|-------------|
| **Hub-and-spoke** | pnCore as orchestrator; remote specialists receive delegated tasks |
| **Peer mesh** | Multiple peer agents each with own Agent Cards; no central orchestrator |
| **Value-chain relay** | Task passes sequentially through agents in a pipeline (e.g. order → fulfillment → compliance → logistics) |
| **Parallel specialists** | pnCore fans out to N remote agents; merges artifacts via `parallel-rules.md` semantics |

For parallel specialist work, apply `get_skill("pn-orchestration-philosophy")` merge conventions when consolidating remote artifacts.

---

## Output

- `public/.well-known/agent.json` — Agent Card for this project
- A2A client module (`src/lib/a2a-client.ts` or equivalent) with `sendTask`, `subscribeTask`, `cancelTask`
- Audit log schema and writer
- Integration notes: which remote agent(s) connect, skill IDs mapped, auth scheme used

## Integration

- **pn-tooling-mcp-maintenance** — Document A2A servers in `docs/MCP.md` alongside MCP servers
- **pn-orchestration-philosophy** — Parallel specialist merge conventions apply across A2A boundaries
- **pn-security-audit** — Review inter-agent auth; see OWASP Agentic Applications 2026
- **pn-create-mcp-architecture** — Add A2A endpoints to architecture doc

## Sources

- A2A Protocol specification: https://google.github.io/A2A/
- Agent2Agent GitHub: https://github.com/google/A2A
- Agent Payments Protocol (AP2): https://cloud.google.com/blog/products/ai-machine-learning/announcing-agents-to-payments-ap2-protocol
- OWASP Top 10 for Agentic Applications 2026: https://genai.owasp.org/resource/owasp-top-10-for-agentic-applications-for-2026/
