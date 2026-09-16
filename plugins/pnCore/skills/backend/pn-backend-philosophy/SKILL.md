---
name: pn-backend-philosophy
description: "Defines an authoritative backend design rulebook. Use when designing or reviewing APIs, databases, config, security, or error handling. Aligns with OWASP, REST best practices, and current secrets management."
---

# Backend Design Philosophy

**When used as a standalone skill, begin every response with** `[pn-skill] 🔺`

## Purpose

Use this as a backend design rulebook for services that:

- Expose REST or API endpoints
- Access databases or external services
- Manage configuration and secrets
- Handle authentication and authorization
- Process payments or sensitive data

It is framework-agnostic and aligned with OWASP, current industry standards, and production resilience.

## When to use

- Designing new APIs, services, or data access layers
- Reviewing backend security, error handling, or config
- Establishing backend standards for a team or AI agent
- Auditing API design, secrets management, or error boundaries
- Integrating payments or third-party APIs

For workflow, audit checklist, and templates, see [reference.md](reference.md).

## Sources

- OWASP Top 10:2025 — https://owasp.org/Top10/2025/
- OWASP Secure by Design Framework — https://owasp.org/www-project-secure-by-design-framework/

---

## Core Philosophy (non-negotiables)

### Resources over RPC

Design APIs around resources (nouns) and HTTP methods. Use clear URIs, avoid nesting beyond 2–3 levels, use query params for filtering and pagination. REST principles: statelessness, cacheability, uniform interface.

### Errors at boundaries

Catch errors at request/DB/external boundaries. Return consistent error payloads; log server-side only. Never leak internals (stack traces, query details, paths) to clients. Standard status codes: 4xx for client, 5xx for server.

### Secrets never in code

Never commit secrets. Use environment variables or a secret manager (Vault, AWS Secrets Manager, Azure Key Vault). Prefer short-lived credentials over long-lived keys. Document required vars in `.env.example`; never in README as real values.

### Defense in depth

Multiple security layers. Principle of least privilege. Never trust user input—validate and sanitize everything. Fail securely; no information leakage. Regular dependency scanning: use pn-dependency-audit (or `npm audit`, Snyk).

### Document contracts

Request/response shapes are documented (OpenAPI, JSDoc). Breaking changes are defined before shipping. Versioning strategy is explicit (URI path `/api/v1/` preferred). Migration paths are documented.

### Surface preservation (Postel + Hyrum)

**Postel's Law:** be conservative in what you send (strict, well-typed, documented outputs), liberal in what you accept (tolerate optional fields, omit unknowns, normalize whitespace and case at the edge). This widens compatibility without widening contracts.

**Hyrum's Law:** with enough callers, every observable behavior — not just the documented contract — becomes depended on. Response field order, error message strings, status codes for edge cases, default sort order. Treat any change to *observable* behavior of a shipped API (HTTP, MCP tool, CLI, library export) as a breaking change until proven otherwise. When in doubt: version, deprecate, then remove — never silently mutate.

These laws pull in opposite directions: liberal input can create undocumented contracts that Hyrum's Law then locks in. Mitigate by **logging unrecognized inputs** instead of silently accepting them, and by **schema-validating outputs in tests** so accidental shape drift fails CI.

### Thin handlers, thick services

Keep request handlers thin; business logic lives in services/utils. One responsibility per layer. Async/await throughout; parameterized queries; connection pooling where applicable.

---

## Design Rulebook (Do / Don't)

### A) API Design Rules

**Do**

- Use lowercase URLs with hyphens, plural nouns for collections
- Use standard HTTP methods (GET, POST, PUT, PATCH, DELETE) consistently
- Return appropriate status codes (200, 201, 204, 400, 401, 403, 404, 409, 422, 429, 500)
- Implement idempotency keys for writes (critical for retries and duplicate submissions)
- Define breaking vs non-breaking changes before shipping
- Document request/response shapes and migration paths

**Don't**

- Don't nest resources beyond 2–3 levels (e.g. `/users/123/orders/456/items` is too deep)
- Don't use verbs in URLs; use nouns and HTTP methods
- Don't change semantics without versioning or migration
- Don't return HTML error pages from API endpoints
- Don't assume clients understand undocumented fields or codes

### B) Error Handling Rules

**Do**

- Return consistent error envelopes (e.g. `{ error: string, code?: string }`)
- Log errors server-side with context; redact sensitive fields
- Handle connection failures, timeouts, and retries explicitly
- Use 422 for validation errors; 429 for rate limiting
- Provide actionable messages for 4xx; generic messages for 5xx

**Don't**

- Don't leak stack traces, file paths, or query strings to clients
- Don't log complete request objects, passwords, or API keys
- Don't swallow errors silently; always handle or rethrow with context
- Don't use one generic "Something went wrong" without a retry or recovery path

### C) Secrets and Config Rules

**Do**

- Read all config and secrets from environment or secret manager
- Use `.env.example` with placeholder names only
- Prefer short-lived credentials; enable key rotation
- Apply least privilege to credential access
- Use `npm ci` in production; run `npm audit` regularly

**Don't**

- Don't hardcode secrets in source or commit `.env` with real values
- Don't put secrets in workflow JSON or config files in repos
- Don't use long-lived API keys without rotation strategy
- Don't log credentials or sensitive config

### D) Security Rules

**Do**

- Use HTTPS for all endpoints
- Validate and sanitize all input; use parameterized queries
- Implement rate limiting and authentication
- Set secure headers (CORS, CSP, etc.)
- Run dependency scans; fix critical/high vulnerabilities before deploy

**Don't**

- Don't trust user input; validate at boundaries
- Don't make access control decisions only at the gateway; enforce at each endpoint
- Don't skip input validation for "internal" APIs
- Don't expose internal errors or debug info in production

### E) Database and I/O Rules

**Do**

- Use parameterized queries; never concatenate user input into SQL
- Use connection pooling where applicable
- Handle connection failures and timeouts
- Use transactions for multi-step writes
- Version migrations; support rollback

**Don't**

- Don't run raw queries with user-controlled input
- Don't ignore connection pool limits or leak connections
- Don't assume DB is always available; plan for failure

### F) Structure and Style Rules

**Do**

- Keep handlers thin; logic in services
- Use async/await; avoid callback pyramids
- Prefer `const` and strict typing at boundaries
- One responsibility per module
- Document non-obvious behavior

**Don't**

- Don't put business logic in route handlers
- Don't mix I/O and pure logic in the same function
- Don't skip error handling for "simple" operations

---

## Final Principle

The target is not "it works on my machine."

It is:

**Clear contracts + secure boundaries + observable errors + zero secrets in code.**

That is the rulebook.
