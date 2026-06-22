---
name: pn-audit-api
description: Surgical API design review — REST conventions, status codes, response shapes, validation, and schema leaks. Use standalone or as part of pn-backend-audit. Outputs a scored fix roadmap.
slash: false
---

# pn-audit-api

**Start every response with:** `[pn-command] 🔺`

> **Advanced (palette-hidden).** Not in the `/` slash palette. Invoked by the `/pn-backend-audit` umbrella, or directly via `get_command("pn-audit-api")`.

**Progress:** Before each numbered section in Flow, state one line:

- `"pn-audit-api: Step 1 of 5 — Context."`
- `"pn-audit-api: Step 2 of 5 — Scope."`
- `"pn-audit-api: Step 3 of 5 — Audit."`
- `"pn-audit-api: Step 4 of 5 — Fix."`
- `"pn-audit-api: Step 5 of 5 — Summary."`

Focused API design pass: audit and fix REST conventions, HTTP semantics, response consistency, input validation, and schema leaks. No security posture changes (use `pn-audit-security`), no performance changes (use `pn-audit-performance`) — API design only.

## Flow

### 1. Context

Check `.pncore-stack.md` for known stack, API style, and auth mechanism. If not found, ask:
- "What API framework? (Express/Fastify/Hono/FastAPI/other)"
- "REST or GraphQL? Versioned (`/v1/`) or unversioned?"

### 2. Scope

If not specified: "Which routes or modules should I audit? Or reply 'all' for full API."

### 3. Audit

Load `get_skill("pn-openapi-design")` and consult `pn-core://skills/backend/reference/api-design.md`.

For each route or endpoint group, audit:

**Resource naming:**
- Are URLs noun-based? No verbs in paths (`/createUser` → `/users`)?
- Collections plural? (`/user` → `/users`)
- Sub-resources correctly nested? No nesting > 2 levels?

**HTTP method usage:**
- GET is safe and idempotent? No state changes in GET handlers?
- POST used for creation only? Not for generic "do something"?
- PUT vs. PATCH: PUT for full replace, PATCH for partial update?
- DELETE idempotent? Returns 204 or appropriate on success?

**Status codes:**
- 200 for errors? → Fix to correct 4xx/5xx
- 201 on creation? 204 when no body to return?
- 401 vs. 403 confused? (401 = unauthenticated, 403 = forbidden)
- 400 vs. 422 confused? (400 = malformed, 422 = valid but failed validation)

**Response shapes:**
- Consistent envelope? (`{ data: ... }` or `{ data: ..., meta: ... }`)
- Errors have `code` + `message` + `requestId`?
- Raw DB rows returned? ORM model leaked with internal fields?
- Consistent date format? (ISO 8601 UTC: `2026-03-27T12:00:00Z`)

**Input validation:**
- Every route validates request body/query/params before processing?
- Enum values allowlisted?
- String length bounded?
- Numbers range-checked?

**Pagination:**
- Large collections paginated?
- Offset or cursor? (cursor preferred for production)
- Total count returned in meta for UI pagination?

Output: numbered issues table with:
- Route/endpoint
- Issue type (naming / method / status code / response / validation / pagination)
- Severity (critical = breaks contract / major = inconsistent / minor = convention)
- Suggested fix

**Gate:** Confirm issues list before applying fixes. If user says "just fix it," proceed.

### 4. Fix

Apply changes in order of severity. Common fixes:
- Rename verb-URLs to noun-URLs
- Replace `res.status(200).json({ success: false })` with correct 4xx
- Add Zod/Pydantic/Joi validation at route boundary
- Serialize through output schema — never `res.json(dbRow)` directly
- Add pagination to collection endpoints returning > 20 items
- Standardize error shape across all handlers

### 5. Summary

Table of fixes applied: route, what changed, why.

## Skills to Use

- **pn-openapi-design** — OpenAPI spec and contract design
- **pn-node-api** — Node REST patterns
- *reference/api-design.md* — Full REST conventions, status codes, and named anti-patterns
