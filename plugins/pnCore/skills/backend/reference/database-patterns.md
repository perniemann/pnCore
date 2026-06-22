# Database Patterns

## Schema Design Principles

**Design for the query, not for the entity.** The schema should make your most common queries fast and simple — not model a perfect object graph.

Rules:
- **Normalize to 3NF by default**; denormalize only with a measured performance reason and documented rationale.
- **Every table needs a primary key.** Use `id BIGSERIAL` (PostgreSQL) or `id BIGINT AUTO_INCREMENT` (MySQL) for internal tables. Use UUIDs (`gen_random_uuid()`) when IDs are exposed externally (prevents enumeration attacks).
- **All timestamps are UTC.** Store as `TIMESTAMPTZ` (PostgreSQL) or `DATETIME` with explicit UTC in application code. Never store local time in the database.
- **Foreign keys are constraints, not just columns.** Declare them — the database enforces referential integrity; the application cannot be trusted to do so reliably.
- **Use NOT NULL by default.** Make columns nullable only when null is genuinely meaningful, not when you are "not sure yet."

```sql
-- Good schema: explicit constraints, UTC timestamps, non-null by default
CREATE TABLE orders (
  id          BIGSERIAL PRIMARY KEY,
  public_id   UUID NOT NULL DEFAULT gen_random_uuid() UNIQUE,
  user_id     BIGINT NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  status      TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'cancelled')),
  total_cents BIGINT NOT NULL CHECK (total_cents >= 0),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

**Store money as integers (cents).** Floating-point arithmetic loses precision with currency.

## Indexing Strategy

**Indexes are not free.** Every index slows writes. Add an index when you have a query that needs it, not speculatively.

When to index:
- Foreign key columns (almost always — joins and cascade checks need them)
- Columns in `WHERE` clauses on high-traffic queries
- Columns in `ORDER BY` when used with `LIMIT` (range queries)
- Composite indexes when queries filter on multiple columns together (order matters: highest-cardinality column first)

```sql
-- Foreign key index (always)
CREATE INDEX idx_orders_user_id ON orders(user_id);

-- Query index: WHERE status = 'pending' ORDER BY created_at
CREATE INDEX idx_orders_status_created ON orders(status, created_at);

-- Partial index: only index rows that meet a condition (saves space)
CREATE INDEX idx_orders_pending ON orders(created_at) WHERE status = 'pending';
```

**Check the query plan before and after adding an index.** `EXPLAIN ANALYZE` in PostgreSQL. An index that is never used is worse than no index.

## Expand-Contract Migration Pattern

**Never make breaking schema changes in a single deployment.** Hot databases require zero-downtime migrations.

The three-phase pattern for any destructive change:

```
Phase 1 — Expand (backward-compatible):
  Add new column/table. Old code ignores it. New code writes to both.

Phase 2 — Migrate:
  Backfill data. Verify integrity. Switch reads to the new structure.

Phase 3 — Contract (cleanup):
  Remove old column/table once all deploys reference only the new structure.
```

Example — renaming `full_name` to `display_name`:
```sql
-- Phase 1: add new column, keep old
ALTER TABLE users ADD COLUMN display_name TEXT;
-- Application writes to both display_name and full_name

-- Phase 2: backfill
UPDATE users SET display_name = full_name WHERE display_name IS NULL;
-- Switch reads to display_name. Monitor for errors.

-- Phase 3: remove old column (in a separate deploy)
ALTER TABLE users DROP COLUMN full_name;
```

Rules:
- **Migrations are immutable.** Once committed, never edit a migration file — create a new one.
- **Never run DDL and DML in the same migration** on large tables (locks the table).
- **Test migrations on a production-sized copy** before deploying. `LOCK TABLE` surprises destroy availability.

## N+1 Detection and Prevention

An N+1 query is a query inside a loop — one query to get N records, then N queries to get related data. It destroys performance at scale.

```typescript
// N+1 BAD — one query per user to fetch their orders
const users = await db.query("SELECT * FROM users");
for (const user of users) {
  user.orders = await db.query("SELECT * FROM orders WHERE user_id = $1", [user.id]);
  // 1 query for users + N queries for orders = N+1
}

// GOOD — single join query
const usersWithOrders = await db.query(`
  SELECT u.*, json_agg(o.*) AS orders
  FROM users u
  LEFT JOIN orders o ON o.user_id = u.id
  GROUP BY u.id
`);

// OR with an ORM — explicit eager loading
const users = await User.findAll({ include: [{ model: Order }] });  // Sequelize
const users = await prisma.user.findMany({ include: { orders: true } });  // Prisma
```

Detection:
- Log slow queries (`pg_stat_statements`, Drizzle `logger: true`, Prisma `log: ['query']`)
- Watch for repeated identical queries with different IDs in logs
- Use APM (Datadog, New Relic, Sentry Performance) to surface N+1 automatically

## Soft Deletes vs. Hard Deletes

Choose deliberately — each has consequences.

| Approach | When to use | Pitfall |
|----------|-------------|---------|
| Hard delete | Data with no audit requirement; GDPR right-to-erasure | Permanent; breaks foreign key references |
| Soft delete (`deleted_at`) | Audit trail needed; data referenced elsewhere | Requires `WHERE deleted_at IS NULL` everywhere; index bloat |
| Archive table | High-volume delete with long-term retention need | Complexity of two tables |

If using soft deletes:
```sql
-- Always partial-index on deleted_at to keep "active" queries fast
CREATE INDEX idx_users_active ON users(id) WHERE deleted_at IS NULL;
```

```typescript
// ORM-level filter: apply globally so callers cannot accidentally read deleted rows
// Prisma: use a middleware
// Sequelize: use defaultScope
// Drizzle: wrap in a helper that appends WHERE deleted_at IS NULL
```

## Audit Trails

Any table that requires a history of who changed what and when needs an audit trail.

```sql
-- Option 1: separate audit table (scalable, queryable history)
CREATE TABLE users_audit (
  id          BIGSERIAL PRIMARY KEY,
  user_id     BIGINT NOT NULL,
  changed_by  BIGINT REFERENCES users(id),
  change_type TEXT NOT NULL CHECK (change_type IN ('INSERT', 'UPDATE', 'DELETE')),
  old_data    JSONB,
  new_data    JSONB,
  changed_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Option 2: Postgres trigger
CREATE OR REPLACE FUNCTION audit_users() RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO users_audit(user_id, change_type, old_data, new_data, changed_at)
  VALUES (COALESCE(NEW.id, OLD.id), TG_OP, row_to_json(OLD), row_to_json(NEW), NOW());
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
```

## Connection Pooling

**Never create a new database connection per request.** Connection setup is expensive; pooling reuses connections.

```typescript
// Postgres with pg + pool
import { Pool } from "pg";
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 20,                    // max pool size
  idleTimeoutMillis: 30_000,  // close idle connections after 30s
  connectionTimeoutMillis: 2_000, // fail fast if pool exhausted
});

// Prisma handles pooling internally; configure via connection_limit in URL
// DATABASE_URL="postgresql://...?connection_limit=20"
```

In serverless environments (Lambda, Vercel Edge, Cloudflare Workers):
- Each function instance cannot share a pool across invocations
- Use `PgBouncer` (sidecar), `Supabase Pooler`, or `Neon serverless` for connection multiplexing
- Never use a traditional pool in serverless — you will exhaust database connections

## Named Anti-Patterns

**"Wide Table Syndrome"**
A table with 60+ columns because it was easier to add columns than design properly. Wide tables make schema changes dangerous, indexes enormous, and queries confusing. When a table grows beyond ~20 columns, audit whether a subset of columns belongs in a related table.

**"Implicit Schema Drift"**
Running raw migrations directly in production without version control. The schema diverges from what is in source control. Fix: use a migration tool (Flyway, Liquibase, Prisma Migrate, Drizzle Kit) and commit every migration to git. The database schema is code.

**"ORM Magic"**
Letting the ORM auto-generate production queries without reviewing the SQL. `include: { everything: true }` on a deep relation graph can execute 40 queries and load 10MB of data. Always inspect ORM queries with logging enabled in development.

**"Mutable Migration"**
Editing an already-committed migration file to "fix" it instead of creating a new migration. This permanently desynchronizes any environment that already ran the original migration. Migrations are append-only.

**"No Indexes on Foreign Keys"**
Every foreign key column that participates in a join or lookup needs an index. PostgreSQL does not create these automatically (unlike MySQL). Missing FK indexes cause sequential scans on large tables.
