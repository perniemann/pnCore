---
name: pn-database-migrations
description: "Database migration patterns for Prisma, Drizzle, TypeORM. Covers zero-downtime column changes, rollback strategies, seed data, and index hygiene. Use when adding, altering, or dropping schema objects in production."
---

# Database migrations

## When to use

- Adding, altering, or dropping columns/tables in a production database
- Writing or reviewing a migration file (Prisma, Drizzle, TypeORM, raw SQL)
- Planning zero-downtime deployments that involve schema changes
- Seeding reference data or test fixtures
- Reviewing index coverage or query performance regressions

## Core principles

1. **Migrations are immutable once committed** — never edit a migration file that has been applied to any shared environment; create a new migration instead.
2. **Always pair with a rollback** — every `up` migration must have a safe `down` path; document when `down` is destructive (irreversible data loss).
3. **Expand/contract for zero downtime** — break breaking changes into two migrations: (a) add new column/table (expand), (b) backfill + switch app code, (c) drop old column (contract). Never rename or drop in one step.
4. **Gate on review** — migrations that touch > 10M rows or add a non-concurrent index require explicit review before deploying to production.
5. **Never mix data and schema** — separate DDL migrations (schema) from DML migrations (data backfills) to allow independent rollback.

## Workflow

### Prisma

```bash
# Generate migration from schema changes
npx prisma migrate dev --name add_user_email_index

# Apply pending migrations in production (CI/CD)
npx prisma migrate deploy

# Inspect current migration status
npx prisma migrate status

# Reset dev database (destructive — dev only)
npx prisma migrate reset
```

- Store `migrations/` directory in version control; commit with the code change that requires it.
- Use `prisma db seed` with `prisma/seed.ts` for reference data; keep seed idempotent (upsert, not insert).
- For large table changes, use `--create-only` flag, then edit the SQL before applying.

### Drizzle

```bash
# Generate migration
npx drizzle-kit generate:pg   # or :mysql, :sqlite

# Apply migrations
npx drizzle-kit push:pg       # dev: push directly
# Production: use drizzle-orm/node-postgres migrator in startup script
```

- Schema file is the single source of truth; keep it colocated with the migration folder.
- Use `db.transaction()` for multi-step migrations when the ORM supports it.

### TypeORM / Raw SQL

```bash
# TypeORM CLI
npx typeorm migration:generate src/migrations/AddUserEmailIndex -d src/data-source.ts
npx typeorm migration:run -d src/data-source.ts
npx typeorm migration:revert -d src/data-source.ts
```

- For raw SQL migrations (Flyway, Liquibase, golang-migrate): use sequential numbering `V001__add_users.sql`; never modify applied files.

## Zero-downtime patterns

| Change | Safe approach |
|---|---|
| Add nullable column | Single migration — safe, no downtime |
| Add NOT NULL column | Expand: add nullable → backfill → add constraint → contract |
| Rename column | Expand: add new column → dual-write in app → backfill → contract |
| Drop column | Contract only after app no longer reads/writes it |
| Add index | Use `CONCURRENTLY` (Postgres); monitor lock wait |
| Add foreign key | Add deferrable or use shadow table pattern for large tables |
| Change column type | Expand/contract with explicit cast in migration |

## Index hygiene

- Add indexes for all foreign key columns and frequent WHERE / ORDER BY columns.
- Use `EXPLAIN ANALYZE` before and after to verify index use.
- Avoid over-indexing write-heavy tables — each index adds write overhead.
- Remove unused indexes: query `pg_stat_user_indexes` where `idx_scan = 0`.
- For Postgres: prefer partial indexes (`WHERE deleted_at IS NULL`) over full-table indexes when filtering a subset.

## Seeding

- Keep seeds **idempotent** using upsert or `INSERT … ON CONFLICT DO NOTHING`.
- Separate reference data seeds (currencies, roles) from test/dev fixture seeds.
- Never run fixture seeds in production; gate with `NODE_ENV !== 'production'`.

## Guardrails

- Never run migrations without a backup or point-in-time restore snapshot.
- Test rollback (`down`) in a staging environment before deploying to production.
- Document destructive migrations (drops, truncates) with explicit sign-off in the PR.
- Reference `pn-backend-philosophy` for transaction and error-boundary patterns.
- Reference `pn-devops-automation` for CI/CD pipeline integration of migration steps.
