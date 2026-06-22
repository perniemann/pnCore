---
name: pn-node-api
description: Guides Node/API design, DB access patterns, and env/secrets. Use when designing or implementing Node/API code; covers API design, error handling, config, and DB patterns.
---

# Node / API skill

## When to use

- Designing or implementing REST/API endpoints.
- Adding or changing database access (queries, migrations, connections).
- Setting up or refactoring env/config and secrets.
- Reviewing backend error handling and safety.
- Establishing consistent request/response patterns across an API.

## Workflow

### 1. API design

Use clear resource names (nouns), appropriate HTTP methods, and standard status codes. Design the contract before writing implementation.

```typescript
// Resource: /users
// Collection:  GET /users, POST /users
// Resource:    GET /users/:id, PATCH /users/:id, HTTP DELETE on /users/:id
// Sub-resource: GET /users/:id/orders

// Status codes — always be specific
// 201 Created (POST that creates a resource)
// 204 No Content (DELETE or PATCH with no body to return)
// 400 Bad Request (malformed syntax, wrong types)
// 401 Unauthorized (no valid credentials)
// 403 Forbidden (valid credentials, wrong permissions)
// 404 Not Found (resource doesn't exist)
// 422 Unprocessable (valid JSON, failed business rules / validation)
// 429 Too Many Requests (rate limited)
// 500 Internal Server Error (unexpected programmer error)
```

Document request/response shapes with OpenAPI or TypeScript interfaces before implementation. Reference `pn-core://skills/backend/reference/api-design.md` for full REST conventions, versioning, pagination, and anti-patterns.

### 2. Input validation

Validate at the route boundary — before any business logic executes.

```typescript
import { z } from "zod";

export const CreateUserSchema = z.object({
  email: z.string().email().max(255).toLowerCase(),
  name: z.string().min(1).max(100).trim(),
  role: z.enum(["user", "admin"]).default("user"),
});

// In the route handler
const result = CreateUserSchema.safeParse(req.body);
if (!result.success) {
  throw new AppError("VALIDATION_FAILED", 422, "Invalid request data");
}
const validated = result.data; // TypeScript knows the shape
```

### 3. Config and secrets

```typescript
// config.ts — validate at module load, not per-call
export const config = {
  db: {
    url: requireEnv("DATABASE_URL"),
    poolSize: Number(process.env.DB_POOL_SIZE ?? 10),
  },
  jwt: {
    secret: requireEnv("JWT_SECRET"),
    expiresIn: process.env.JWT_EXPIRES_IN ?? "15m",
  },
} as const;

function requireEnv(key: string): string {
  const value = process.env[key];
  if (!value) throw new Error(`Environment variable ${key} is required`);
  return value;
}
```

Never read `process.env` deep inside service logic. Centralize in `config.ts` and inject where needed.

### 4. Error handling

Use a centralized error middleware. Route handlers `throw`; the middleware formats and sends.

```typescript
// Route handler — throw AppError or let unexpected errors bubble
async function getUser(req: Request, res: Response) {
  const user = await db.users.findUnique({ where: { id: Number(req.params.id) } });
  if (!user) throw new AppError("USER_NOT_FOUND", 404, "User not found");
  res.json({ data: serializeUser(user) }); // serialize: never return raw DB row
}

// Central error middleware (app.use at bottom of app.ts)
app.use((err: unknown, req: Request, res: Response, _next: NextFunction) => {
  const requestId = req.requestId ?? crypto.randomUUID();
  if (err instanceof AppError) {
    logger.warn({ err, requestId }, err.message);
    return res.status(err.httpStatus).json({ error: { code: err.code, message: err.message, requestId } });
  }
  logger.error({ err, requestId }, "Unhandled error");
  res.status(500).json({ error: { code: "INTERNAL_ERROR", message: "An unexpected error occurred", requestId } });
});
```

Reference `pn-core://skills/backend/reference/error-handling.md` for error taxonomy, structured logging, and correlation IDs.

### 5. Database access

```typescript
// Connection pooling — initialize once at startup
import { Pool } from "pg";
export const pool = new Pool({
  connectionString: config.db.url,
  max: config.db.poolSize,
  idleTimeoutMillis: 30_000,
  connectionTimeoutMillis: 2_000,
});

// Repository pattern — DB access in service/repository layer, never in route handlers
export async function findUserById(id: number, requesterId: number) {
  const result = await pool.query(
    "SELECT id, email, name, role, created_at FROM users WHERE id = $1 AND deleted_at IS NULL",
    [id] // parameterized — never string interpolation
  );
  // Scope to requester unless admin: enforce ownership
  const row = result.rows[0];
  if (!row) throw new AppError("USER_NOT_FOUND", 404, "User not found");
  if (row.id !== requesterId) throw new AppError("FORBIDDEN", 403, "Access denied");
  return row;
}
```

N+1 prevention:
```typescript
// BAD — query inside loop
const users = await getUsers();
for (const user of users) {
  user.orders = await getOrdersByUser(user.id); // N+1
}

// GOOD — single query with JOIN or batch load
const usersWithOrders = await pool.query(`
  SELECT u.id, u.name, json_agg(o.*) FILTER (WHERE o.id IS NOT NULL) AS orders
  FROM users u LEFT JOIN orders o ON o.user_id = u.id
  WHERE u.deleted_at IS NULL
  GROUP BY u.id
`);
```

Reference `pn-core://skills/backend/reference/database-patterns.md` for schema design, indexing, migrations, and anti-patterns.

### 6. Security

- Parameterized queries always — never string interpolation into SQL.
- Scope all data queries to the authenticated user's ID — never trust client-supplied `userId`.
- Rate-limit auth routes more aggressively than general API routes.
- Apply security headers (`helmet`). Explicit CORS origin allowlist.

Reference `pn-core://skills/backend/reference/security-patterns.md` for OWASP patterns, JWT, CORS, input validation.

## Output

- API/DB/config changes with clear request/response shapes and error handling.
- Updated `.env.example` and README when new config or secrets are added.
- TypeScript types or OpenAPI schema for all new request/response shapes.

## Guardrails

- **pn-backend-philosophy** — Authoritative rulebook; security, OWASP, design rules.
- **pn-backend-scaffolding** — Use when adding new routes or modules; this skill covers design and patterns for existing or new code.
- **pn-backend-architecture** — Use before this skill when making structural decisions.
- **pn-database-migrations** — Migration patterns for schema changes.
