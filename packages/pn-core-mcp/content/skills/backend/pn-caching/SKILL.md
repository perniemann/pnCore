---
name: pn-caching
description: "Caching strategies for backend services and frontend apps. Redis patterns (read-through, write-behind, TTL), HTTP cache headers, Next.js fetch caching, Vercel Edge Config, and SWR/React Query. Use when optimising response times or reducing database load."
---

# Caching

## When to use

- Reducing database query load or external API call volume
- Adding in-memory or Redis caching to a backend service
- Configuring HTTP cache headers and CDN behaviour
- Using Next.js server-side caching (`fetch` options, `unstable_cache`, route segment config)
- Adding SWR or React Query for client-side data fetching with stale-while-revalidate

## Cache hierarchy

```
Browser Cache (memory / disk)
    ↓ miss
CDN / Edge Cache (Vercel Edge, Cloudflare)
    ↓ miss
Application Cache (Redis / in-memory)
    ↓ miss
Database / External API
```

## Redis patterns

### Read-through (most common)

```typescript
import { Redis } from "ioredis";

const redis = new Redis(process.env.REDIS_URL!);

async function getProduct(id: string): Promise<Product> {
  const cached = await redis.get(`product:${id}`);
  if (cached) return JSON.parse(cached) as Product;

  const product = await db.product.findUniqueOrThrow({ where: { id } });
  await redis.setex(`product:${id}`, 300, JSON.stringify(product)); // TTL: 5 min
  return product;
}
```

### Write-through (keep cache consistent on writes)

```typescript
async function updateProduct(id: string, data: Partial<Product>): Promise<Product> {
  const product = await db.product.update({ where: { id }, data });
  await redis.setex(`product:${id}`, 300, JSON.stringify(product));
  return product;
}
```

### Cache invalidation on write

```typescript
async function deleteProduct(id: string): Promise<void> {
  await db.product.delete({ where: { id } });
  await redis.del(`product:${id}`);
  await redis.del("products:list"); // invalidate list caches too
}
```

### Stampede protection (dogpile prevention)

```typescript
async function getWithLock<T>(key: string, ttl: number, fetcher: () => Promise<T>): Promise<T> {
  const cached = await redis.get(key);
  if (cached) return JSON.parse(cached) as T;

  const lockKey = `lock:${key}`;
  const acquired = await redis.set(lockKey, "1", "NX", "EX", 5); // 5s lock
  if (!acquired) {
    await new Promise((r) => setTimeout(r, 100));
    return getWithLock(key, ttl, fetcher); // retry after brief wait
  }
  try {
    const value = await fetcher();
    await redis.setex(key, ttl, JSON.stringify(value));
    return value;
  } finally {
    await redis.del(lockKey);
  }
}
```

### TTL guidelines

| Data type | Suggested TTL |
|---|---|
| User session | 15 min (short-lived session / JWT TTL) |
| Product/catalogue data | 5–30 min |
| Aggregated counts / stats | 1–5 min |
| Search results | 30 s – 2 min |
| Static reference data (currencies, categories) | 1–24 h |
| Rate-limit counters | Window duration (e.g. 60s) |

## HTTP cache headers

```typescript
// Express / Node.js
res.setHeader("Cache-Control", "public, max-age=3600, stale-while-revalidate=86400");

// Next.js Route Handler
return new Response(JSON.stringify(data), {
  headers: { "Cache-Control": "s-maxage=300, stale-while-revalidate=600" },
});
```

| Directive | Meaning |
|---|---|
| `public` | CDN can cache the response |
| `private` | Only the browser can cache (not CDN) |
| `no-store` | Never cache (sensitive data) |
| `max-age=N` | Browser cache TTL in seconds |
| `s-maxage=N` | CDN cache TTL (overrides `max-age` for shared caches) |
| `stale-while-revalidate=N` | Serve stale while revalidating in background |
| `must-revalidate` | Must revalidate after TTL expires |

## Next.js fetch caching

```typescript
// Per-request revalidation (ISR-style)
const data = await fetch("https://example.invalid/products", {
  next: { revalidate: 300 }, // 5 min
});

// Cache indefinitely until explicitly invalidated
const data = await fetch("https://example.invalid/config", {
  next: { tags: ["config"] },
});

// Opt out of caching (dynamic data)
const data = await fetch("https://example.invalid/cart", {
  cache: "no-store",
});

// Revalidate by tag (in Server Action or Route Handler)
import { revalidateTag } from "next/cache";
revalidateTag("config");
```

```typescript
// unstable_cache for non-fetch async functions (DB queries etc.)
import { unstable_cache } from "next/cache";

const getCachedProducts = unstable_cache(
  async () => db.product.findMany({ where: { active: true } }),
  ["products-list"],
  { revalidate: 300, tags: ["products"] }
);
```

## Upstash Redis (serverless / edge)

```typescript
import { Redis } from "@upstash/redis";

const redis = Redis.fromEnv(); // UPSTASH_REDIS_REST_URL + TOKEN

const cached = await redis.get<Product>(`product:${id}`);
if (!cached) {
  const product = await fetchProduct(id);
  await redis.setex(`product:${id}`, 300, product);
  return product;
}
return cached;
```

## SWR (client-side)

```typescript
import useSWR from "swr";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

function ProductPage({ id }: { id: string }) {
  const { data, error, isLoading } = useSWR(`/api/products/${id}`, fetcher, {
    revalidateOnFocus: false,
    dedupingInterval: 60_000, // 1 min dedup window
  });
  // ...
}

// Optimistic update
const { mutate } = useSWR("/api/cart");
await mutate(
  async (currentData) => {
    const updated = await addToCart(item);
    return updated;
  },
  { optimisticData: (curr) => [...(curr ?? []), item], rollbackOnError: true }
);
```

## Common mistakes

- **Caching user-specific data with a shared key** — always include user/tenant ID in cache keys.
- **Missing cache invalidation on write** — write-through or explicit `del` after mutations.
- **Caching error responses** — only cache successful responses; let errors fall through.
- **Over-caching dynamic data** — rate-limit counters, cart state, and live prices should not be cached long.
- **Unbounded cache growth** — always set TTL; never cache without expiry.

## Guardrails

- Reference `pn-backend-philosophy` for idempotency and error-boundary patterns.
- Reference `pn-rate-limiting` for Redis-based rate limit counter patterns.
- Reference `pn-observability` for cache hit/miss metrics and alerting.
