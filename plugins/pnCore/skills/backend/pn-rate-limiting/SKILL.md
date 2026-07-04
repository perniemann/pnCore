---
name: pn-rate-limiting
description: "API rate limiting patterns. Token-bucket, sliding window, Redis-based counters, Upstash rate-limit, 429 responses, and abuse prevention. Use when protecting API endpoints from overuse or DoS."
---

# Rate limiting

## When to use

- Protecting public or authenticated API endpoints from overuse
- Implementing per-user, per-IP, or per-API-key rate limits
- Adding abuse prevention to auth endpoints (login, password reset, OTP)
- Configuring edge-level rate limiting (Vercel, Cloudflare)
- Returning correct `429 Too Many Requests` responses with `Retry-After`

## Algorithm choice

| Algorithm | Characteristics | Use when |
|---|---|---|
| **Fixed window** | Simple, burst-friendly at window edges | Low-stakes limits; not recommended for auth |
| **Sliding window** | Smoother, no edge burst | General API protection |
| **Token bucket** | Allows short bursts up to bucket capacity | APIs where occasional bursts are acceptable |
| **Leaky bucket** | Strictly uniform output rate | Rate-shaping queues, not request rejection |

**Default recommendation:** sliding window for API protection; token bucket for background jobs.

## Redis sliding window (ioredis)

```typescript
import { Redis } from "ioredis";

const redis = new Redis(process.env.REDIS_URL!);

interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAt: number; // Unix ms
}

async function rateLimit(
  key: string,
  limit: number,
  windowMs: number
): Promise<RateLimitResult> {
  const now = Date.now();
  const windowStart = now - windowMs;
  const redisKey = `rl:${key}`;

  const pipeline = redis.pipeline();
  pipeline.zremrangebyscore(redisKey, 0, windowStart); // remove old entries
  pipeline.zadd(redisKey, now, `${now}-${Math.random()}`); // add current request
  pipeline.zcard(redisKey);                               // count in window
  pipeline.pexpire(redisKey, windowMs);                   // auto-expire key

  const results = await pipeline.exec();
  const count = results?.[2]?.[1] as number ?? 0;

  return {
    allowed: count <= limit,
    remaining: Math.max(0, limit - count),
    resetAt: now + windowMs,
  };
}
```

```typescript
// Middleware (Express)
export async function rateLimitMiddleware(req: Request, res: Response, next: NextFunction) {
  const key = `ip:${req.ip}`; // or `user:${req.user?.id}` for authenticated
  const result = await rateLimit(key, 100, 60_000); // 100 req / min

  res.setHeader("X-RateLimit-Limit", 100);
  res.setHeader("X-RateLimit-Remaining", result.remaining);
  res.setHeader("X-RateLimit-Reset", Math.ceil(result.resetAt / 1000));

  if (!result.allowed) {
    res.setHeader("Retry-After", Math.ceil((result.resetAt - Date.now()) / 1000));
    return res.status(429).json({ error: "Too many requests", retryAfter: result.resetAt });
  }
  next();
}
```

## Upstash rate-limit (serverless / edge)

```typescript
import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

const ratelimit = new Ratelimit({
  redis: Redis.fromEnv(),
  limiter: Ratelimit.slidingWindow(100, "1 m"), // 100 req per minute
  analytics: true,
  prefix: "api",
});

// Next.js Route Handler or Middleware
export async function middleware(req: NextRequest) {
  const ip = req.ip ?? req.headers.get("x-forwarded-for") ?? "anonymous";
  const { success, remaining, reset, limit } = await ratelimit.limit(ip);

  if (!success) {
    return new Response("Too many requests", {
      status: 429,
      headers: {
        "Retry-After": String(Math.ceil((reset - Date.now()) / 1000)),
        "X-RateLimit-Limit": String(limit),
        "X-RateLimit-Remaining": "0",
        "X-RateLimit-Reset": String(reset),
      },
    });
  }
  return NextResponse.next();
}
```

## Auth endpoint protection (stricter limits)

Auth endpoints need much tighter limits to prevent brute-force attacks.

```typescript
const authLimits = {
  login:          { limit: 5,  windowMs: 15 * 60_000 }, // 5 per 15 min per IP
  passwordReset:  { limit: 3,  windowMs: 60 * 60_000 }, // 3 per hour per email
  otpVerify:      { limit: 10, windowMs: 10 * 60_000 }, // 10 per 10 min per user
};

// Key: combine IP AND account identifier to prevent distributed attacks
const key = `login:ip:${req.ip}:email:${normalise(body.email)}`;
```

## Multi-tier rate limiting

Apply limits at multiple layers for defence in depth:

| Layer | Tool | Limit type |
|---|---|---|
| Edge / CDN | Cloudflare Rate Limiting or Vercel WAF | Per-IP, coarse-grained |
| Application middleware | Upstash / Redis | Per-user or per-API-key |
| Database / service | Semaphore / concurrency limit | Prevent DB overload |

## Response format

Always return `429` with:
- `Retry-After` header (seconds until retry is safe)
- `X-RateLimit-Limit`, `X-RateLimit-Remaining`, `X-RateLimit-Reset` headers
- JSON body with `error` and `retryAfter` fields

```json
{
  "error": "Too many requests",
  "retryAfter": 1742086800000
}
```

## Dynamic limits (API keys / plans)

```typescript
async function getLimitForKey(apiKey: string): Promise<{ limit: number; windowMs: number }> {
  const plan = await redis.get(`plan:${apiKey}`);
  return plan === "pro"
    ? { limit: 10_000, windowMs: 60_000 }
    : { limit: 100,    windowMs: 60_000 };
}
```

## Guardrails

- Reference `pn-auth-patterns` — auth endpoints must have their own stricter rate-limit keys.
- Reference `pn-caching` — rate-limit counters are short-TTL Redis keys; do not cache them beyond the window.
- Reference `pn-observability` — track `rate_limit_hits_total` as a metric to detect abuse patterns.
- Never rate-limit health check endpoints (`/health`, `/ready`) — this causes false load-balancer failures.
