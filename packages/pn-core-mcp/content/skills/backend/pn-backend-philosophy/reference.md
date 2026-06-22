# Backend Philosophy — Reference

Execution framework for applying the rulebook. For the core philosophy and Do/Don't rules, see [SKILL.md](SKILL.md).

---

## Backend Audit Workflow (run in order)

### Phase 1 | API Surface Audit

- Map all endpoints (method, path, purpose)
- Check resource naming (nouns, plural collections)
- Verify HTTP status code usage
- Check for idempotency on write endpoints
- Document versioning strategy (or lack thereof)

**Pass criteria:** Every endpoint has a clear purpose, consistent naming, and appropriate status codes.

---

### Phase 2 | Error Handling Audit

- Trace error flow from boundaries (DB, external APIs, validation)
- Check error payload shape consistency
- Verify no internals leaked to client (paths, queries, stack traces)
- Check logging: what is logged, what is redacted
- Verify retry/timeout behavior for external calls

**Pass criteria:** Consistent error envelope; no sensitive data in client responses; server-side logging with redaction.

---

### Phase 3 | Secrets and Config Audit

- Search for hardcoded secrets (API keys, passwords, tokens)
- Check `.env.example` exists; no real values in repo
- Verify config loaded from env or secret manager
- Run dependency/CVE audit: use pn-dependency-audit (or `npm audit`, etc.)
- Verify production uses `npm ci` or equivalent

**Pass criteria:** No secrets in code; config via env; dependencies scanned.

---

### Phase 4 | Security Audit

- Input validation at boundaries
- Parameterized queries for all DB access
- CORS and security headers
- Rate limiting and auth where needed
- Reference pn-security-audit for OWASP-focused review

**Pass criteria:** Input validated; SQL injection prevented; auth and rate limiting in place for exposed endpoints.

---

### Phase 5 | Structure Audit

- Handler thickness (logic in services?)
- Connection handling (pooling, timeouts)
- Async/await consistency
- Error propagation

**Pass criteria:** Thin handlers; explicit I/O handling; no swallowed errors.

---

## Agent Templates (copy-paste)

### API Endpoint Inventory

```
Endpoint:
Method:
Path:
Purpose:
Status codes used:
Idempotent? (Y/N):
Breaking change risk:
```

### Error Handling Block

```
Boundary:
Error type:
Client payload:
Server log:
Redaction applied:
Retry behavior:
```

### Secrets Checklist

```
Secret type:
Storage:
Rotation strategy:
Access scope:
Documentation:
```

---

## Red Flag Checklist (fast QA)

Fail the backend if any are true:

- [ ] Secrets in source code or committed config
- [ ] Raw SQL with user input
- [ ] Stack traces or paths in client error responses
- [ ] No input validation on exposed endpoints
- [ ] Handlers with business logic (not thin)
- [ ] Unhandled connection/timeout failures
- [ ] No error envelope consistency
- [ ] Undocumented breaking changes
- [ ] Critical/high dependency vulnerabilities unaddressed
- [ ] No `.env.example` for required config
