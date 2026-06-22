---
name: pn-audit-errors
description: Standardize error handling — consistent shapes, structured logging, correlation IDs, safe client responses. Surgical command for error handling. Use standalone or as part of pn-backend-audit.
slash: false
---

# pn-audit-errors

**Start every response with:** `[pn-command] 🔺`

> **Advanced (palette-hidden).** Not in the `/` slash palette. Invoked by the `/pn-backend-audit` umbrella, or directly via `get_command("pn-audit-errors")`.

Focused error handling pass: audit and standardize error responses, logging, correlation IDs, and graceful error flows. No API design changes (use `pn-audit-api`), no security hardening (use `pn-audit-security`) — error handling and observability only.

## Flow

### 1. Context

Check `.pncore-stack.md` for framework, logging library, and observability tools. If not found, ask:
- "What framework? (Express/Fastify/FastAPI/Rails/other)"
- "What logging library? (pino / winston / structlog / default / none)"
- "Any APM or tracing in use? (Sentry / Datadog / OpenTelemetry / none)"

### 2. Scope

If not specified: "Full codebase error handling audit, or specific modules?"

### 3. Audit

Consult `pn-core://skills/backend/reference/error-handling.md` and load `get_skill("pn-observability")`.

**Error response consistency:**
- Mixed error shapes across routes? (`{ message }` in some, `{ error }` in others)?
- Error codes present and stable (not HTTP status numbers as codes)?
- `requestId` included in all error responses?
- Stack traces or internal DB errors leaking to clients?
- Same error class used for both operational and programmer errors?

**Centralized error handling:**
- Is there a single centralized error middleware/handler?
- Or are errors handled ad-hoc in each route handler?
- Async errors: are all async route handlers wrapped (asyncHandler / proper try-catch)?
- Unhandled promise rejections: is `process.on('unhandledRejection')` captured?

**Logging:**
- Using `console.log` instead of structured logging?
- `console.error` without context (no requestId, userId)?
- Correct log levels? (errors at `error`, handled operational errors at `warn`, lifecycle at `info`)
- Sensitive data (passwords, tokens, PII) potentially in logs?
- Structured JSON format configured for production?

**Correlation IDs:**
- `requestId` generated per request (or forwarded from `x-request-id` header)?
- `requestId` propagated to: response headers, error responses, all log lines, downstream calls?

**Graceful shutdown:**
- SIGTERM handler: drains in-flight requests before exiting?
- DB pool closed on shutdown?
- Shutdown timeout (force exit after N seconds if still draining)?

Output: numbered issues table with:
- Location (middleware / route / service / logging config)
- Issue type (inconsistent shape / leaked internals / swallowed error / missing requestId / unstructured logs)
- Severity (critical = data loss or security risk / major = debugging impossible / minor = inconsistency)
- Suggested fix

**Gate:** Confirm issues list before applying fixes.

### 4. Fix

Apply in order of severity. Common fixes:
- Create centralized `AppError` class and error middleware
- Add `asyncHandler` wrapper to all async route handlers
- Add `requestId` middleware and propagate to all log lines and error responses
- Replace `console.log/error` with structured logger (pino, structlog, etc.)
- Strip stack traces from client-facing error responses
- Add `process.on('unhandledRejection')` and `process.on('uncaughtException')` handlers
- Add graceful shutdown handler

### 5. Summary

Changes applied: what was standardized, logging improvements, observability additions.

## Skills to Use

- **pn-observability** — Structured logging, OpenTelemetry, Sentry, health routes
- *reference/error-handling.md* — Error taxonomy, correlation IDs, structured logging, named anti-patterns
