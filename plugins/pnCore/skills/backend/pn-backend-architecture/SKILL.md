---
name: pn-backend-architecture
description: "Scalable system design, database schemas, API contracts, microservices patterns. Use when designing APIs, DBs, or infrastructure before or during backend implementation."
---

# Backend architecture

## When to use

- Designing API structure or database schema before implementation begins.
- Choosing between service patterns (monolith, modular monolith, microservices).
- Schema design, indexing strategy, and performance considerations.
- Event-driven architecture, queuing, and async processing decisions.
- Cloud infrastructure and deployment strategy.

## Workflow

### 1. Clarify requirements first

Before choosing a pattern, establish constraints:
- **Scale:** Expected traffic (requests/sec), data volume (rows, GB), and growth trajectory.
- **Consistency:** Does stale data break user trust, or is eventual consistency acceptable?
- **Latency:** Are there hard SLA requirements? (< 100ms p99, real-time sync, etc.)
- **Team size:** More services = more operational overhead. A team of 2 should not run 10 microservices.
- **Deployment target:** Managed cloud (Vercel, Railway, Render), containers (Fly, ECS), or bare metal?

### 2. Choose a service decomposition strategy

**Start with a modular monolith.** Extract services only when a specific boundary causes a measurable problem.

| Pattern | When to use | Risks |
|---------|------------|-------|
| **Monolith** | < 5-person team, single domain, proving the product | Hard to scale individual bottlenecks |
| **Modular monolith** | Clear domain boundaries, single team, shared DB acceptable | Discipline required to maintain boundaries |
| **Microservices** | Independent scaling needs, separate deploy cadences, multiple teams | Network overhead, distributed tracing, operational complexity |
| **Event-driven** | Decoupled workflows (email on signup, inventory on order), async side effects | Eventual consistency, harder to debug |

Rules for extraction:
- Extract a service only when: a team boundary, a scaling need, or a technology requirement demands it.
- Never decompose by technical layer (separate service for "the DB layer"). Decompose by domain.

### 3. API contract design

Design the API contract before writing implementation code. Use OpenAPI-first.

```yaml
# Design decisions to capture in the contract:
# - Resource names (nouns, plural: /users, /orders)
# - ID strategy (integer vs UUID — use UUIDs for externally-exposed IDs)
# - Error shape consistency (code + message + requestId)
# - Authentication mechanism (Bearer JWT, API key, cookie)
# - Pagination strategy (cursor for production, offset for simple admin)
# - Versioning strategy (/api/v1/, /api/v2/)
```

Refer to `pn-core://skills/backend/reference/api-design.md` for detailed REST conventions and named anti-patterns.

### 4. Database selection

| Database | Use when |
|----------|---------|
| **PostgreSQL** | Relational data, ACID transactions, complex queries, full-text search (pgvector for embeddings) |
| **MySQL / MariaDB** | Relational, high-read workloads, legacy ecosystem compatibility |
| **SQLite** | Embedded, single-process, local-first, edge functions |
| **MongoDB** | Document-oriented, flexible schema, rapid iteration (not as a default — pick Postgres first) |
| **Redis** | Caching, session storage, rate limiting, pub/sub, queues |
| **DynamoDB** | Serverless, extreme scale, single-table design expertise required |
| **Neon / PlanetScale / Supabase** | Managed Postgres/MySQL for serverless environments |

Default: **PostgreSQL**. Choose a different database only with a specific technical justification.

Schema design principles:
- Foreign keys as constraints, not just columns.
- Money in integers (cents), never floats.
- Timestamps as UTC (`TIMESTAMPTZ`).
- Primary keys: auto-increment integers internally; UUID exposed externally.

Refer to `pn-core://skills/backend/reference/database-patterns.md` for indexing, migrations, N+1, and anti-patterns.

### 5. Authentication and authorization design

Choose one auth mechanism and apply it consistently:

| Mechanism | Use when |
|-----------|---------|
| **JWT (HS256/RS256)** | Stateless, multi-service, mobile/SPA clients |
| **Session cookie (httpOnly)** | Traditional web apps, simpler invalidation |
| **API key** | Server-to-server, developer tooling |
| **OAuth 2.0 / OIDC** | Social login, third-party integrations |

Authorization model:
- **RBAC** (Role-Based): user has a role; role has permissions. Simple, most common.
- **ABAC** (Attribute-Based): permissions derived from attributes (owner, org, resource type). Use when RBAC becomes unworkably complex.

Apply security patterns from `pn-core://skills/backend/reference/security-patterns.md`.

### 6. Async processing and queuing

Use a queue for work that should not block the request:
- Sending emails, SMS, push notifications
- Generating reports, exports, thumbnails
- Charging payments after webhook confirmation
- Syncing data to third-party systems

```typescript
// Pattern: enqueue job in request, process asynchronously
// Request handler
await queue.add("send-welcome-email", { userId: user.id });
res.status(201).json({ data: user });

// Job processor (separate worker process)
queue.process("send-welcome-email", async (job) => {
  await emailService.sendWelcome(job.data.userId);
});
```

Queue options: BullMQ + Redis, Upstash QStash, AWS SQS, Inngest.

### 7. Error handling and observability strategy

Define before implementing:
- Structured logging format (JSON, with `requestId`, `userId`, `service`)
- Correlation ID propagation across service calls
- Error taxonomy: operational vs. programmer errors
- Alerting thresholds (5xx rate, p99 latency, queue depth)

Refer to `pn-core://skills/backend/reference/error-handling.md` for patterns.

### Deep modules, ubiquitous language, and ADRs

- **Interfaces:** Narrow surface areas — callers depend on contracts (errors, ordering, idempotency), not internals.
- **Ubiquitous language:** Align naming with `UBIQUITOUS_LANGUAGE.md` or domain glossary files so APIs and modules reflect shared vocabulary.
- **ADRs:** Use `docs/adr/` for irreversible or surprising choices; respect existing ADRs unless proposing to supersede with rationale.

Optional: capture architectural friction candidates in GitHub Issues for roadmap grooming (**GitHub MCP** with **`issues`** / **`labels`** toolsets when available).

## Output

- Architecture Decision Record (ADR) or plain architecture notes saved to `docs/architecture.md`
- Database schema design (ERD or table definitions)
- API contract draft (OpenAPI `openapi.yaml` or structured spec)
- Service boundary map if multiple services are involved

## Guardrails

- **pn-backend-philosophy** — Authoritative backend rulebook (security, OWASP, REST, secrets).
- **pn-backend-scaffolding** — Scaffold from architecture decisions; use after this skill.
- **pn-database-migrations** — Migration patterns and schema evolution.
- **pn-security-audit** — Run after architecture is drafted to identify security gaps.
- **pn-openapi-design** — Detailed OpenAPI specification workflow.
