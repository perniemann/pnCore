# Supabase — Code Patterns Reference

Full implementation examples. For decisions, key patterns, and security checklist, see [SKILL.md](SKILL.md).

---

## Client setup (Next.js App Router)

```typescript
// utils/supabase/server.ts — for Server Components and Route Handlers
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

export function createClient() {
  const cookieStore = cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll: (cookiesToSet) => {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          );
        },
      },
    }
  );
}

// utils/supabase/client.ts — for Client Components
import { createBrowserClient } from "@supabase/ssr";

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
```

---

## Row Level Security (RLS)

```sql
ALTER TABLE todos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Own todos: select" ON todos FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Own todos: insert" ON todos FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Own todos: update" ON todos FOR UPDATE
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Own todos: delete" ON todos FOR DELETE USING (auth.uid() = user_id);

-- Org/team access
CREATE POLICY "Org members can view" ON documents FOR SELECT
  USING (org_id IN (SELECT org_id FROM org_members WHERE user_id = auth.uid()));

-- service_role key bypasses RLS — use only in trusted server-side code
```

```typescript
// RLS testing: should only return the authenticated user's records
const { data, error } = await supabase.from("todos").select("*");
```

---

## Realtime subscriptions

```typescript
// Subscribe to INSERT events
const channel = supabase
  .channel("todos-changes")
  .on(
    "postgres_changes",
    { event: "INSERT", schema: "public", table: "todos", filter: `user_id=eq.${userId}` },
    (payload) => setTodos((prev) => [...prev, payload.new as Todo])
  )
  .subscribe();

return () => { supabase.removeChannel(channel); };

// Presence (users online)
const presenceChannel = supabase.channel("room:123");
presenceChannel
  .on("presence", { event: "sync" }, () => {
    const state = presenceChannel.presenceState();
    console.log("Online users:", state);
  })
  .subscribe(async (status) => {
    if (status === "SUBSCRIBED") {
      await presenceChannel.track({ user_id: userId, online_at: new Date().toISOString() });
    }
  });
```

---

## Edge Functions

```typescript
// supabase/functions/send-notification/index.ts
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

serve(async (req) => {
  const { userId, message } = await req.json();
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );
  const { error } = await supabase.from("notifications").insert({ user_id: userId, message });
  if (error) return new Response(JSON.stringify({ error }), { status: 500 });
  return new Response(JSON.stringify({ ok: true }), { status: 200 });
});
```

```bash
npx supabase functions deploy send-notification
npx supabase functions serve send-notification --env-file .env.local
```

---

## Storage

```typescript
// Upload
const { data, error } = await supabase.storage
  .from("avatars")
  .upload(`${userId}/avatar.webp`, file, { contentType: "image/webp", upsert: true });

// Public URL (public buckets)
const { data: { publicUrl } } = supabase.storage.from("avatars").getPublicUrl(`${userId}/avatar.webp`);

// Signed URL (private buckets, 1-hour expiry)
const { data: { signedUrl } } = await supabase.storage
  .from("documents")
  .createSignedUrl(`${userId}/report.pdf`, 3600);
```

```sql
-- Storage RLS: users can only access their own files
CREATE POLICY "Own avatar" ON storage.objects FOR SELECT
  USING (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text);
```

---

## Auth middleware (Next.js)

```typescript
// middleware.ts
import { createServerClient } from "@supabase/ssr";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({ request });
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll: (cookiesToSet) => {
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
        },
      },
    }
  );
  await supabase.auth.getUser(); // refreshes session cookie
  return response;
}

export const config = { matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"] };
```
