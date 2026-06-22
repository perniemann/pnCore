---
name: pn-audit-performance
description: Identify and fix backend performance issues — N+1 queries, missing cache layers, blocking I/O, slow queries, and connection pool exhaustion. Surgical backend performance pass.
slash: false
---

# pn-audit-performance

**Start every response with:** `[pn-command] 🔺`

> **Advanced (palette-hidden).** Not in the `/` slash palette. Invoked by the `/pn-backend-audit` umbrella, or directly via `get_command("pn-audit-performance")`.

Focused backend performance pass: identify and fix N+1 queries, missing caching, unoptimized DB queries, blocking I/O, and resource exhaustion. No API design changes, no security changes — performance only.

## Flow

### 1. Context

Check `.pncore-stack.md` for DB, ORM, caching layer, and hosting environment. If not found, ask:
- "What database and ORM? (PostgreSQL + Prisma / MySQL + Sequelize / etc.)"
- "Any caching in use? (Redis / Memcached / in-memory / none)"
- "Any observability showing slow queries? (Datadog / Sentry / logs / no visibility)"

### 2. Scope

If not specified: "Which routes, services, or data access patterns should I focus on? Or reply 'all' for a full pass."

### 3. Audit

Load `get_skill("pn-caching")` and consult `pn-core://skills/backend/reference/database-patterns.md`.

**N+1 queries:**
- Loops calling DB inside each iteration?
- ORM lazy loading associations accessed in a response handler?
- Repeated identical queries with different IDs visible in logs?

```typescript
// N+1 pattern to look for:
for (const order of orders) {
  const user = await db.users.findById(order.userId); // N+1
}

// Fix: batch or JOIN
const orders = await db.orders.findAll({ include: ['user'] }); // ORM eager load
// OR: SELECT o.*, u.* FROM orders o JOIN users u ON u.id = o.user_id
```

**Missing indexes:**
- FK columns without indexes?
- High-traffic `WHERE` columns without indexes?
- `ORDER BY` with `LIMIT` without index on sort column?
- Queries using sequential scans on large tables? (`EXPLAIN ANALYZE` results)

**Caching opportunities:**
- Frequently-read data that rarely changes? (config, user permissions, product catalog)
- Expensive aggregations recalculated on every request?
- External API calls made on every request for slowly-changing data?
- Session data loaded from DB on every authenticated request?

**Blocking I/O in async context:**
- Synchronous file reads (`fs.readFileSync`) in request handlers?
- `sleep()` or blocking loops in async handlers?
- CPU-heavy operations (image processing, heavy crypto) in the main event loop?

**Connection pool:**
- Pool exhaustion under load? (long-running queries holding connections, serverless without pooler)
- DB connections not released after error paths?
- Connection timeout too long, causing request pile-up?

**Response payload size:**
- Collections returned without pagination?
- Full objects returned when only a subset of fields is needed?
- Binary data or large blobs embedded in JSON responses?

Output: numbered issues table with:
- Location (route / service / query)
- Issue type (N+1 / missing index / no cache / blocking I/O / pool / payload)
- Estimated impact (high / medium / low)
- Suggested fix

**Gate:** Confirm issues list before applying fixes.

### 4. Fix

Apply in order of estimated impact. Common fixes:
- Replace N+1 loops with JOIN queries or ORM eager loading (`include`/`preload`/`with`)
- Add indexes to FK columns and high-traffic WHERE columns
- Add Redis caching for expensive reads with TTL appropriate to data freshness requirements
- Move CPU-heavy work to `spawn_blocking` (Rust/Tokio), `asyncio.run_in_executor` (Python), or a task queue (Node)
- Add pagination to large collection endpoints
- Use `select` to limit columns fetched

### 5. Summary

Fixes applied: query changes, indexes added, caching added, estimated improvement.

## Skills to Use

- **pn-caching** — Redis, HTTP caching, stale-while-revalidate, cache invalidation
- **pn-database-migrations** — Index migrations
- *reference/database-patterns.md* — N+1, indexing strategy, connection pooling
