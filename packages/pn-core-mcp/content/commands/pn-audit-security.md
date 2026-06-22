---
name: pn-audit-security
description: OWASP-guided security review — auth posture, input validation, secrets, CORS, JWT, rate limiting. Surgical command for backend security. Use standalone or as part of pn-backend-audit.
slash: false
---

# pn-audit-security

**Start every response with:** `[pn-command] 🔺`

> **Advanced (palette-hidden).** Not in the `/` slash palette. Invoked by the `/pn-backend-audit` umbrella, or directly via `get_command("pn-audit-security")`.

Focused security pass: audit and harden authentication, authorization, input validation, secret handling, CORS, JWT configuration, and rate limiting. No API design changes (use `pn-audit-api`), no performance changes (use `pn-audit-performance`) — security posture only.

## Flow

### 1. Context

Check `.pncore-stack.md` for auth mechanism, framework, and known security constraints. If not found, ask:
- "What auth mechanism? (JWT / session cookies / API keys / OAuth)"
- "What framework? (Express/Fastify/FastAPI/Rails/other)"

### 2. Scope

If not specified: "Should I audit the full API surface or specific areas? (auth routes / all routes / specific files)"

### 3. Audit

Consult `pn-core://skills/backend/reference/security-patterns.md` and load `get_skill("pn-auth-patterns")`.

**Injection:**
- Any raw SQL string interpolation? `db.query(\`WHERE id = ${id}\`)` → parameterized?
- Any shell command with user input? `exec(userInput)` → use safe APIs?
- Any template rendering with unsanitized user data?

**Authentication:**
- JWT: algorithm pinned? Never `algorithms: ['none']`?
- JWT: expiry set? Access tokens < 60 min?
- Password hashing: bcrypt/argon2? Not md5/sha1?
- Session tokens: `httpOnly`, `Secure`, `SameSite` cookies?
- Refresh token: stored as hash, not plaintext?

**Authorization:**
- Data queries scoped to authenticated user? No trust of client-supplied `userId`?
- Role/permission checks present before sensitive operations?
- IDOR (Insecure Direct Object Reference): resources fetched by ID without ownership check?

**Input validation:**
- Input validated at every boundary before processing?
- Enum values allowlisted? No trusting `req.body.role` directly into DB?
- File uploads: type checked, size limited, name sanitized?

**Secrets:**
- No hardcoded secrets in source?
- `.env` in `.gitignore`?
- `process.env` / `os.getenv` validated at startup?
- Are internal secrets exposed in error responses or logs?

**CORS:**
- `origin: "*"` with credentials? → Must use explicit allowlist
- Allowlist derived from environment config, not hardcoded?

**Rate limiting:**
- Auth routes rate-limited (login, register, password reset)?
- Rate limit headers returned (`Retry-After`, `X-RateLimit-*`)?
- Returning 429 with structured error on limit hit?

**Security headers:**
- `helmet` or equivalent applied?
- `Content-Security-Policy` configured?
- `HSTS` header present in production?

Output: numbered issues table with:
- Location (file/route)
- Vulnerability category (injection / auth / authz / secrets / CORS / headers / rate-limiting)
- Severity (critical = exploitable / major = weakens security posture / minor = hardening)
- Suggested fix

**Gate:** Confirm issues list before applying fixes. Critical findings: proceed immediately unless user says stop.

### 4. Fix

Apply in order of severity. Common fixes:
- Replace string SQL with parameterized queries
- Add `{ algorithms: ["HS256"] }` to JWT verify calls
- Replace `origin: "*"` with environment-driven allowlist
- Add ownership check to queries fetching resources by ID
- Add `helmet()` middleware if missing
- Hash refresh tokens before storing
- Validate and constrain all user input at route boundary

### 5. Summary

Table of fixes applied: location, vulnerability type, what changed.

## Skills to Use

- **pn-auth-patterns** — JWT, PKCE, session, RBAC patterns
- **pn-rate-limiting** — Rate limit implementation
- *reference/security-patterns.md* — OWASP top 10, named anti-patterns, JWT pitfalls
