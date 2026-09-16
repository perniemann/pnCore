---
name: pn-agent-governance
description: "Design and audit the governance framework for deployed AI agents — continuous audit trails, human-in-the-loop escalation policies, privacy/data-minimization rules, compliance evidence generation (SOC 2 / ISO 27001 / HIPAA-adjacent), and an org-level agent policy charter. Use when a project is moving agents from prototype to production, preparing for compliance review, or establishing org-wide agent trust policy."
---

# Agent Governance Skill

**When used as a standalone skill, begin every response with** `[pn-skill] 🔺`

## When to use

- Moving an AI agent integration from prototype to production
- Preparing for a security or compliance review that covers agentic systems
- Defining which agent actions require human approval and which can be autonomous
- Generating audit evidence (action logs, approval records) for a compliance auditor
- Writing an org-level "agent policy charter" that teams must agree to before deploying agents
- Reviewing a system that already has agents deployed, to assess governance posture

---

## Governance framework overview

Good agent governance answers four questions continuously:

1. **Who authorized what?** — Authentication, intent provenance, approval chain
2. **What did the agent do?** — Immutable action audit trail
3. **Did anything go wrong?** — Anomaly detection, rollback capability
4. **Can we prove it?** — Evidence package that satisfies an external auditor

---

## Instructions

### 1. Define the agent action taxonomy

Before writing policy, classify every action an agent can take:

| Class | Examples | Default posture |
|-------|----------|-----------------|
| **Read-only** | search, summarize, fetch, analyze | Autonomous — no gate |
| **Reversible write** | draft email, create doc, add DB record | Autonomous with audit log |
| **Irreversible write** | send email, delete record, deploy code, publish | Require explicit human approval |
| **Financial** | initiate payment, refund, purchase | Require approval + intent verification |
| **Privileged** | modify IAM, change agent config, hire/fire agent | Require named approver + dual-auth |

Encode this taxonomy in a project-level `docs/agent-policy.md` (template in §5).

### 2. Implement a continuous audit log

Every agent action — whether autonomous or human-approved — must produce a structured log entry. Write to an append-only sink (database, SIEM, or immutable log service):

```json
{
  "schema": "pn-agent-audit/1.0",
  "timestamp": "<ISO-8601 UTC>",
  "sessionId": "<uuid>",
  "agentId": "<agent name or id>",
  "action": {
    "type": "<taxonomy class>",
    "tool": "<tool name>",
    "parameters": "<redacted if sensitive>",
    "targetResource": "<URI or description>"
  },
  "intent": {
    "source": "user_prompt | scheduled | delegated_agent",
    "userStatement": "<brief, non-sensitive summary of originating user intent>",
    "sessionRef": "<link to session record>"
  },
  "approval": {
    "required": true,
    "approvedBy": "<user id or null>",
    "approvedAt": "<ISO-8601 or null>",
    "approvalToken": "<token hash or null>"
  },
  "outcome": {
    "status": "success | failure | cancelled",
    "durationMs": 412,
    "errorCode": null
  }
}
```

Rules:
- Log entries are append-only; no update or delete.
- Redact PII and secrets from `parameters` before writing (`[REDACTED]`).
- Retain for a minimum of 90 days (adjust per regulatory requirement).
- Emit a `WARN` alert if the log sink is unreachable before any irreversible or financial action proceeds.

### 3. Human-in-the-loop escalation policy

Use pnCore's `approval_checkpoint` tool for HITL gates. Define escalation tiers:

| Tier | Trigger | Response required |
|------|---------|-------------------|
| **Auto-approve** | Read-only, reversible write under defined scope | None |
| **Soft gate** | Irreversible write | Named user approves in session |
| **Hard gate** | Financial action, privileged action | Named approver + `PNCORE_APPROVAL_TOKEN` required |
| **Out-of-band** | Agent confidence < threshold, anomaly detected | Pause, notify operator via external channel |

For each hard gate, call `approval_checkpoint` with:
```json
{
  "action": "<description of what the agent intends to do>",
  "class": "<taxonomy class>",
  "targetResource": "<URI or description>",
  "estimatedImpact": "<brief>",
  "requiresToken": true
}
```

### 4. Privacy and data minimization

Apply these rules to every agent that touches user data:

- **Collect minimum necessary:** Strip PII from prompts before sending to external LLMs or agents. Use tokenization or pseudonymization where possible.
- **No PII in logs:** The audit log's `userStatement` field contains a non-sensitive summary only; never the raw prompt.
- **Retention caps:** Define per-data-type retention in `docs/agent-policy.md`. Default: session data 24 h, audit logs 90 days, intent records 1 year.
- **Right-to-erasure path:** Document how to locate and purge a user's session data across all sinks (DB, log service, vector store, A2A audit trail).
- **Cross-border transfers:** Flag when agent tasks involve sending data to services in different jurisdictions; log jurisdiction metadata in the audit entry.

### 5. Agent policy charter template

Generate `docs/agent-policy.md` from this template, filled in for the specific project:

```markdown
# Agent Policy Charter — <Project Name>

**Version:** 1.0  **Owner:** <Team/Person>  **Last reviewed:** <date>

## 1. Scope
Which agents are covered; which systems they can access.

## 2. Action taxonomy
<Copy/adapt the taxonomy table from §1>

## 3. Approval matrix
<Map each action class to approval tier from §3>

## 4. Data handling
- PII handling: <describe>
- Retention schedules: <describe>
- Erasure path: <describe>

## 5. Audit trail
- Sink: <service/path>
- Retention: <duration>
- Access: <who can read logs>

## 6. Incident response
- Anomaly detection: <describe>
- Escalation contacts: <names/channels>
- Rollback procedure: <describe>

## 7. Review cadence
Charter reviewed quarterly (see ADR-0002 cadence).

## 8. Acceptance
All agent operators must acknowledge this charter before deploying.
| Name | Role | Date |
|------|------|------|
```

### 6. Compliance evidence generation

To produce an evidence package for SOC 2 / ISO 27001 / HIPAA-adjacent reviews:

1. **Export audit log excerpt** covering the review period. Verify completeness (no gaps in timestamps).
2. **List all agent action classes used** and confirm each maps to an approved taxonomy entry.
3. **List all hard gates triggered** with approval records (approver, timestamp, token hash).
4. **Confirm PII redaction** by sampling 20 random log entries and verifying no raw PII appears.
5. **Confirm retention schedule compliance** by checking log sink configuration against policy.
6. **Produce summary table:**

```markdown
| Control | Requirement | Evidence | Status |
|---------|-------------|----------|--------|
| AC-3 | Least privilege on agent tools | taxonomy + approval matrix | ✓ |
| AU-2 | Audit events for agent actions | audit log schema + entries | ✓ |
| SI-10 | Input validation | tool parameter sanitization | ✓ |
| ... | ... | ... | ... |
```

### 7. Anomaly detection hooks

Flag and halt the agent when any of these occur:

- Agent attempts a tool call not in its declared capability set
- Action class escalates above the approved tier without a new approval
- Audit log write fails before an irreversible action
- Same `sessionId` triggers more than N financial actions (configurable threshold)
- Remote agent (A2A) returns a task that requests actions beyond the original delegated scope

Implement as middleware or pre-tool-call hooks in your agent runtime. Surface anomalies via `approval_checkpoint` out-of-band tier.

---

## Output

- `docs/agent-policy.md` — filled-in charter
- Audit log schema file (`docs/agent-audit-schema.json`) with the structured log definition
- Compliance evidence summary table for the review period
- List of required HITL gates with integration points
- Anomaly detection hook specifications

## Integration

- **pn-security-audit** — Covers OWASP Agentic Applications 2026; pair for full security posture
- **pn-a2a-interop** — A2A inter-agent tasks must emit audit entries using this schema
- **pn-compliance-check** — Regulatory mapping (GDPR, CCPA) for data handling section
- **pn-verification-before-completion** — Apply as the final check before claiming production-ready
- **approval_checkpoint (MCP tool)** — Hard gate implementation

## Sources

- [OWASP Top 10 for Agentic Applications 2026](https://genai.owasp.org/resource/owasp-top-10-for-agentic-applications-for-2026/)
- [NIST AI risk management framework](https://airc.nist.gov/RMF)
- [Google Cloud responsible agent deployment](https://cloud.google.com/blog/products/ai-machine-learning/introducing-gemini-enterprise)
