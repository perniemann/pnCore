---
name: pn-audit-data
description: Design or review database schema — normalization, indexing strategy, migration plan, and data model decisions. Surgical command for database design. Use standalone or as part of pn-backend-audit.
slash: false
---

# pn-audit-data

**Start every response with:** `[pn-command] 🔺`

> **Advanced (palette-hidden).** Not in the `/` slash palette. Invoked by the `/pn-backend-audit` umbrella, or directly via `get_command("pn-audit-data")`.

Focused data model pass: design or review database schema, indexing strategy, migration approach, and data integrity constraints. No API design changes (use `pn-audit-api`), no query optimization (use `pn-audit-performance`) — data model only.

## Flow

### 1. Context

Check `.pncore-stack.md` for ORM, database type, and existing schema info. If not found, ask:
- "What database? (PostgreSQL / MySQL / SQLite / MongoDB / other)"
- "What ORM? (Prisma / Drizzle / Sequelize / SQLAlchemy / ActiveRecord / sqlx / none)"
- "Designing from scratch or reviewing existing schema?"

### 2. Scope

If reviewing existing: "Which tables or domains should I focus on? Or reply 'all' for full schema review."
If designing: "Describe the domain in 2–3 sentences — what entities need to be stored and how do they relate?"

### 3. Audit or Design

Consult `pn-core://skills/backend/reference/database-patterns.md` and load `get_skill("pn-database-migrations")`.

**For reviewing existing schema:**

*Normalization:*
- Tables beyond 20 columns? Candidate for splitting?
- Repeating groups of columns (`tag1`, `tag2`, `tag3`)? → Normalize to junction table.
- Denormalized fields that drift from source? → Document the sync strategy.

*Constraints:*
- Foreign keys declared as DB constraints (not just app-level)?
- NOT NULL defaults where appropriate?
- CHECK constraints for enum-like columns?
- Money stored as float? → Should be integer cents.

*Indexing:*
- Foreign key columns missing indexes?
- High-traffic WHERE columns missing indexes?
- Composite indexes for multi-column filter patterns?
- Unused indexes slowing writes? (Check `pg_stat_user_indexes`)

*Soft deletes:*
- `deleted_at` without partial index? → Add `WHERE deleted_at IS NULL` partial index.
- Queries missing `WHERE deleted_at IS NULL`?

*Migrations:*
- Migrations committed to version control and immutable?
- Breaking changes (dropping columns, renaming) in single deployments? → Use expand-contract pattern.

**For designing a new schema:**

Walk through the domain:
1. **Identify entities** — nouns in the domain (User, Order, Product, etc.)
2. **Identify relationships** — one-to-many, many-to-many, optional vs. required
3. **Identify constraints** — uniqueness, not-null, enums, ranges
4. **Identify access patterns** — what queries will be most frequent? Design indexes for them.
5. **ID strategy** — integer PKs internally, UUID exposed externally?
6. **Timestamp conventions** — all UTC, `created_at`/`updated_at` on every table?
7. **Audit requirement** — any table needing change history?

Output: proposed schema in SQL DDL or ORM model format, with indexes and constraints.

**Gate:** Confirm schema design/issues before applying changes.

### 4. Apply

For existing schema: write migrations using expand-contract where needed. Never edit existing migration files.
For new schema: write initial migration and ORM model definitions.

```sql
-- Example: expand-contract for renaming a column
-- Phase 1 migration: add new column, keep old
ALTER TABLE users ADD COLUMN display_name TEXT;

-- Phase 2 migration (after deploy + backfill): drop old
ALTER TABLE users DROP COLUMN full_name;
```

### 5. Summary

Schema changes applied, indexes added, migrations created, open questions for the team.

## Skills to Use

- **pn-database-migrations** — Migration workflow and expand-contract pattern
- **pn-backend-architecture** — Database selection and schema design principles
- *reference/database-patterns.md* — Indexing strategy, N+1, audit trails, named anti-patterns
