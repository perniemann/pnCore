---
name: pn-cx-agent-patterns
description: Design and build customer-facing AI agents — concierge-style service agents, agentic commerce flows (session memory, preference recall, multi-turn negotiation, delegated transaction execution), and hyper-personalized CX pipelines. Use when building customer support agents, shopping assistants, booking agents, or any user-facing autonomous workflow.
---

# Customer-Experience Agent Patterns Skill

**When used as a standalone skill, begin every response with** `[pn-skill] 🔺`

## When to use

- Building a conversational customer service or support agent
- Implementing an agentic shopping or booking assistant that can act on a user's behalf
- Designing session memory and preference recall for a customer-facing agent
- Modeling a multi-turn negotiation flow between a user agent and a merchant/service agent
- Auditing an existing CX agent for trust, personalization quality, and safety
- Scoping an "agentic commerce" product feature (delegated purchase, itinerary planning, price negotiation)

---

## Core patterns

### Pattern 1 — Concierge service agent

A **concierge agent** handles support requests end-to-end: retrieves account context, understands nuanced intent, takes action, and confirms resolution — no ticket deflection, no pre-programmed branches.

**Architecture:**

```
User → CX Agent (memory-aware) → Intent Router
                                   ├─ Knowledge base (RAG)
                                   ├─ Account/CRM API
                                   ├─ Action tools (update, escalate, refund)
                                   └─ Human escalation gate
```

**Session memory schema:**

```json
{
  "sessionId": "<uuid>",
  "userId": "<pseudonymized id>",
  "preferences": {
    "contactChannel": "email",
    "language": "en-US",
    "notificationFrequency": "weekly"
  },
  "history": [
    { "turn": 1, "intent": "billing_query", "resolved": true, "ts": "<ISO>" }
  ],
  "openIssues": []
}
```

Store in a session store (Redis, Supabase) scoped to `userId`. Expire after inactivity timeout (default 30 min; configurable). Never persist raw conversation text — store intent and resolution summaries only.

**Implementation steps:**

1. On first message, load session from store; if absent, initialize with defaults.
2. Run intent classification (LLM or classifier model) → route to appropriate tool set.
3. Retrieve context (account record, past interactions) — always from authenticated API, never from unverified user-supplied data.
4. Attempt resolution using tools; log each tool call.
5. On success: update session history, confirm to user, emit audit event.
6. On failure or low-confidence: surface specific options to user or escalate to human; never silently fail.

### Pattern 2 — Agentic commerce assistant

An **agentic commerce agent** handles the full shopping journey: context-aware recommendation → price negotiation (A2A) → delegated purchase execution.

**Flow:**

```
User intent → Product search + context match
           → Price/availability negotiation (A2A with merchant agent)
           → User confirmation gate (always for first purchase)
           → Transaction execution
           → Order tracking + notification
```

**Scope gates (mandatory):**

Before executing any transaction, enforce:
- User has pre-authorized a spending limit (`maxTransactionAmount`).
- Product category is in the user's pre-approved set.
- Vendor is on the approved list or user has explicitly one-time-approved.

Store authorization scope in a signed, server-side preference record. Never accept scope expansions from the user's conversational prompt alone — require re-authorization flow.

**Delegated purchase implementation:**

```typescript
async function executeDelegatedPurchase(
  userId: string,
  cart: CartItem[],
  paymentMethodId: string
): Promise<PurchaseResult> {
  // 1. Verify scope authorization
  const scope = await loadUserScope(userId);
  assertWithinScope(cart, scope); // throws if out of scope

  // 2. Emit intent record (for governance audit)
  const intentId = await recordIntent({ userId, cart, paymentMethodId, ts: new Date() });

  // 3. Require explicit approval if above soft limit
  if (cartTotal(cart) > scope.softLimit) {
    await requireApproval(userId, intentId);
  }

  // 4. Execute via payment API
  const result = await paymentGateway.charge({ cart, paymentMethodId, intentRef: intentId });

  // 5. Audit log
  await auditLog({ event: "delegated_purchase", intentId, result, userId });

  return result;
}
```

### Pattern 3 — Preference recall and personalization

Store the minimal preference set needed; enrich lazily as signals accumulate:

| Signal | Storage | Use |
|--------|---------|-----|
| Explicit preference | User profile DB | Always apply |
| Inferred preference | Session store, TTL 7 days | Apply with fallback to default |
| One-off context | Session memory, TTL = session | Apply this session only |

Do not use inferred preferences to gate important decisions (e.g. payment method selection). Surface inferred preferences as suggestions: "Based on your past orders, I'd suggest X — shall I use that?"

### Pattern 4 — Multi-turn negotiation (A2A)

When the CX agent needs to negotiate with a merchant or service agent:

1. Send initial offer task via A2A `tasks/send`.
2. Handle `input-required` status as a negotiation counter-proposal.
3. Apply user-defined negotiation parameters (max price, acceptable delivery windows).
4. After N rounds (configurable, default 3) without agreement, surface the best available option to the user rather than continuing.
5. Never exceed user-authorized parameters autonomously — any exceeded constraint requires human approval.

For the A2A implementation layer, apply `get_skill("pn-a2a-interop")`.

### Pattern 5 — Human escalation

Define a clear escalation chain. The agent MUST escalate when:

- User explicitly requests a human
- Confidence on intent classification < threshold (configurable, default 0.7)
- Action attempted 3+ times without resolution
- Any sensitive category detected: legal, health, bereavement, fraud
- Transaction amount exceeds hard limit

Escalation path:
1. Summarize the conversation and resolution attempts so far.
2. Route to human queue with summary attached.
3. Inform user of expected wait time.
4. Lock the session so the agent does not continue acting while a human has context.

---

## CX agent quality checklist

Before deploying a customer-facing agent:

- [ ] Session memory stores intent summaries, not raw prompts (privacy)
- [ ] Spending/action scope is server-side authorized, not prompt-controlled
- [ ] All tool calls are logged (audit trail)
- [ ] Human escalation path tested for all trigger conditions
- [ ] Preference recall surfaces inferred preferences as suggestions, not silent defaults
- [ ] A2A negotiation rounds are capped
- [ ] Agent persona tested against adversarial prompt injection
- [ ] PII is stripped from logs and external model calls
- [ ] Agent does not impersonate a human when asked directly

---

## Output

- Agent architecture diagram (ASCII or Mermaid) matching one of the patterns above
- Session memory schema tailored to the project
- Scope authorization record design
- Escalation policy definition
- Quality checklist completed for the specific agent

## Integration

- **pn-rag-evaluation** — Golden sets, automated metrics, and human rubrics before scaling RAG-heavy CX traffic
- **pn-a2a-interop** — For A2A negotiation with external merchant/service agents
- **pn-agent-governance** — Apply governance charter and audit trail to every CX agent
- **pn-backend-architecture** — API/DB layer for session store and scope records
- **pn-security-audit** — OWASP Agentic Applications 2026 review for prompt injection, scope escalation
- **pn-auth-patterns** — Authentication for the CX agent's API access to account systems

## Sources

- Google Cloud: Agentic commerce overview — https://cloud.google.com/transform/agents-are-rewriting-the-rules-of-commerceheres-what-to-know
- OWASP Top 10 for Agentic Applications 2026: https://genai.owasp.org/resource/owasp-top-10-for-agentic-applications-for-2026/
