---
name: pn-supabase
description: Supabase patterns for Row Level Security, realtime subscriptions, Edge Functions, storage, and auth helpers. Use when building features on a Supabase-backed project.
---

# Supabase

## When to use

- Writing or reviewing RLS (Row Level Security) policies
- Setting up realtime subscriptions for live data feeds
- Deploying Supabase Edge Functions (Deno runtime)
- Using Supabase Storage for file uploads and CDN delivery
- Integrating Supabase Auth with Next.js (App Router / Pages Router)
- Migrating a schema or using Supabase CLI migrations

**When Supabase MCP is available:** Use its tools to inspect schema, query tables, manage migrations, and list Edge Functions. Combine with this skill for RLS patterns, auth helpers, and production best practices.

For code patterns and full implementation examples, see [reference.md](reference.md).

## Setup

```bash
npm install @supabase/supabase-js @supabase/ssr  # SSR helpers for Next.js
npm install -D supabase
npx supabase init
npx supabase start  # starts local Postgres, Studio, Auth, etc.
```

## Key patterns

**RLS:** Enable on every user-facing table. Use `auth.uid()` for user-scoped policies; service role key for admin overrides (server-side only). See [reference.md](reference.md) for policy SQL and org/team patterns.

**Realtime:** Subscribe to `postgres_changes` with user-scoped filters. Always `removeChannel` on cleanup. See [reference.md](reference.md) for subscription and presence patterns.

**Edge Functions:** Deno runtime; use service role client inside functions (never expose to browser). Deploy with `npx supabase functions deploy`. See [reference.md](reference.md) for full scaffold.

**Storage:** Private buckets by default; use signed URLs for access. Enforce RLS on `storage.objects`. See [reference.md](reference.md) for upload/URL patterns.

**Auth (Next.js):** Use `@supabase/ssr` with `createServerClient` for server components; `createBrowserClient` for client components. Refresh session via middleware. See [reference.md](reference.md) for full middleware.

**CLI migrations:**
```bash
npx supabase migration new add_notifications_table
npx supabase db reset    # apply locally
npx supabase db push     # push to remote
npx supabase db pull     # pull remote schema
```

## Security checklist

- [ ] RLS enabled on every user-facing table
- [ ] Service role key never exposed to the browser — server-side only
- [ ] Storage buckets are private by default; sign URLs for access
- [ ] Edge Functions validate JWT and use least-privilege keys
- [ ] Realtime subscriptions include user-scoped filters

## Output

- RLS, realtime, Edge Functions, storage, auth, or migration guidance consistent with Supabase practices; deeper code lives in [reference.md](reference.md).

## Guardrails

- Reference `pn-auth-patterns` for Supabase Auth + NextAuth.js comparison and session management.
- Reference `pn-backend-philosophy` for secrets handling — never expose service role key client-side.
- Reference `pn-database-migrations` for migration workflows and zero-downtime schema changes.
