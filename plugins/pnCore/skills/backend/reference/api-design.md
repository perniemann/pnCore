# API Design

## REST Resource Design

**Resources are nouns, actions are HTTP methods.** A URL identifies a thing; the verb identifies what you do to it.

```
# Good — noun-based, hierarchical
GET    /users
GET    /users/:id
POST   /users
PATCH  /users/:id
DELETE /users/:id
GET    /users/:id/orders

# Bad — verb in URL (RPC leaking into REST)
POST   /createUser
GET    /getUser?id=123
POST   /users/delete
```

**Collection vs. resource:**
- Collections: plural nouns (`/users`, `/orders`, `/products`)
- Resources: collection + identifier (`/users/42`)
- Sub-resources: hierarchical when the child belongs to the parent (`/users/42/addresses`)
- Avoid nesting deeper than two levels — use query params instead (`/orders?userId=42`)

**Filtering, sorting, pagination: query params only.**
```
GET /products?category=shoes&sort=price&order=asc&page=2&limit=20
```

Never encode filter state into path segments (`/products/category/shoes/page/2`).

## HTTP Semantics

Use the right method — HTTP semantics are not optional decoration.

| Method | Idempotent | Safe | Use for |
|--------|-----------|------|---------|
| GET | Yes | Yes | Read |
| POST | No | No | Create, non-idempotent actions |
| PUT | Yes | No | Full replace |
| PATCH | No | No | Partial update |
| DELETE | Yes | No | Delete |
| HEAD | Yes | Yes | Check existence/metadata |

**Status codes — always be specific:**

| Range | Meaning | Common codes |
|-------|---------|-------------|
| 2xx | Success | 200 OK, 201 Created, 204 No Content |
| 3xx | Redirect | 301 Permanent, 302 Temporary, 304 Not Modified |
| 4xx | Client error | 400 Bad Request, 401 Unauthorized, 403 Forbidden, 404 Not Found, 409 Conflict, 422 Unprocessable, 429 Too Many Requests |
| 5xx | Server error | 500 Internal Server Error, 502 Bad Gateway, 503 Service Unavailable |

Critical distinctions:
- **401** = unauthenticated (no valid credentials). **403** = authenticated but not authorized (wrong role/permission).
- **400** = malformed request (bad JSON, wrong type). **422** = syntactically valid but semantically wrong (validation failed on business rules).
- **404** = resource not found. **410** = resource permanently deleted.
- Never return **200** for an error. Never return **500** for a client mistake.

## Response Shape

**Be consistent.** Pick one envelope shape and use it everywhere.

```typescript
// Success — single resource
{ "data": { "id": 42, "name": "Alice" } }

// Success — collection
{ "data": [...], "meta": { "total": 200, "page": 2, "limit": 20 } }

// Error
{
  "error": {
    "code": "VALIDATION_FAILED",        // machine-readable, stable
    "message": "Email is required",     // human-readable
    "details": [                        // optional field-level breakdown
      { "field": "email", "message": "Required" }
    ],
    "requestId": "req_01HXY..."         // correlation ID for debugging
  }
}
```

Rules:
- Error `code` is a stable string constant (not an HTTP status number) — callers can `switch` on it.
- Never expose internal stack traces, SQL errors, or file paths in responses.
- Include `requestId` in every error response so users can report it.

## Versioning

**Version in the URL path.** Don't use headers or query params for versioning — they make routing opaque and caching inconsistent.

```
/api/v1/users
/api/v2/users
```

Rules:
- **Never make breaking changes to an existing version.** Adding fields is non-breaking. Removing/renaming fields, changing types, or restructuring responses is breaking.
- **Support the previous major version for at least 6 months** after releasing a new one. Announce deprecation in response headers: `Deprecation: true`, `Sunset: <date>`.
- Increment the major version for any breaking change. Use internal feature flags for incremental rollout before a version bump.

## OpenAPI-First Workflow

Write the spec before writing the implementation. The spec is the contract.

```yaml
# openapi.yaml excerpt
paths:
  /users/{id}:
    get:
      summary: Get user by ID
      parameters:
        - name: id
          in: path
          required: true
          schema:
            type: integer
      responses:
        "200":
          description: User found
          content:
            application/json:
              schema:
                $ref: "#/components/schemas/User"
        "404":
          $ref: "#/components/responses/NotFound"
```

Tooling:
- Generate types from the spec (`openapi-typescript`, `@hey-api/openapi-ts`)
- Lint the spec before code review (`spectral`, `redocly`)
- Validate request/response against the spec in tests and optionally at runtime

## Pagination

**Cursor-based pagination for production APIs.** Offset pagination breaks under concurrent writes.

```typescript
// Offset — simple but fragile (items shift as rows are inserted/deleted)
GET /users?page=2&limit=20

// Cursor — stable and performant
GET /users?cursor=eyJpZCI6NDJ9&limit=20
// Response includes:
{ "data": [...], "meta": { "nextCursor": "eyJpZCI6NjJ9", "hasMore": true } }
```

Use offset pagination only for admin UIs with stable, infrequently-changing datasets.

## Named Anti-Patterns

**"200 for Everything"**
```typescript
// BAD — returns 200 with an error body
res.status(200).json({ success: false, error: "User not found" });

// GOOD — use the correct status code
res.status(404).json({ error: { code: "USER_NOT_FOUND", message: "User not found" } });
```

**"Noun-less URL Hell"**
```
# BAD
POST /processPayment
GET  /fetchUserOrders?userId=1
POST /users/doDeactivate

# GOOD
POST /payments
GET  /users/1/orders
POST /users/1/deactivations
```

**"God Endpoint"**
Endpoints that accept a `type` or `action` field and branch into 8 different behaviors. Every distinct action deserves its own endpoint. If you need a batch operation, that is its own resource (`POST /batch`).

**"Schema Leak"**
Returning raw ORM objects that expose internal fields (`password_hash`, `stripe_customer_id`, `deleted_at`). Always serialize through an explicit output schema. Never `res.json(dbRow)` directly.

**"Implicit Error Swallowing"**
```typescript
// BAD — silently returns 200 when something failed
try {
  await sendEmail(user.email);
} catch {
  // oh well
}
res.json({ success: true });

// GOOD — either handle it or propagate it
try {
  await sendEmail(user.email);
} catch (err) {
  logger.error({ err, userId: user.id }, "Email send failed");
  throw new AppError("EMAIL_SEND_FAILED", 502, "Email delivery failed");
}
```
