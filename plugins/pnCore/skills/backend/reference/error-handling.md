# Error Handling

## Error Taxonomy

**Operational errors vs. programmer errors.** The distinction determines how to handle them.

| Type | Definition | What to do |
|------|-----------|------------|
| **Operational** | Expected failure in normal operation. Network timeout, DB row not found, validation failed, rate limit hit. | Catch, log at appropriate level, return meaningful response. |
| **Programmer** | Bug in the code. Null dereference, wrong type assertion, uncaught edge case. | Let it crash (or catch and crash), log with full stack trace, alert on-call. |

```typescript
// Operational error — recoverable, expected, return 4xx/5xx
class AppError extends Error {
  constructor(
    public readonly code: string,       // machine-readable stable string
    public readonly httpStatus: number,
    message: string,
    public readonly details?: unknown   // optional structured context (non-sensitive)
  ) {
    super(message);
    this.name = "AppError";
  }
}

// Usage
throw new AppError("USER_NOT_FOUND", 404, "No user with that ID");
throw new AppError("VALIDATION_FAILED", 422, "Email is required", { field: "email" });
throw new AppError("UPSTREAM_TIMEOUT", 502, "Payment provider did not respond");

// Programmer error — do NOT catch these silently
// Let them crash and create an alert
```

## Centralized Error Middleware

Handle all errors in one place. Never return raw errors directly from route handlers.

```typescript
// Express centralized error handler
import type { Request, Response, NextFunction } from "express";

interface ErrorResponse {
  error: {
    code: string;
    message: string;
    requestId: string;
    details?: unknown;
  };
}

export function errorHandler(
  err: unknown,
  req: Request,
  res: Response,
  _next: NextFunction
): void {
  const requestId = (req.headers["x-request-id"] as string) ?? crypto.randomUUID();

  if (err instanceof AppError) {
    // Operational — known, expected
    logger.warn({ err, requestId, path: req.path }, err.message);
    res.status(err.httpStatus).json({
      error: {
        code: err.code,
        message: err.message,
        requestId,
        ...(err.details ? { details: err.details } : {}),
      },
    } satisfies ErrorResponse);
    return;
  }

  // Programmer error — unknown, unexpected
  logger.error({ err, requestId, path: req.path }, "Unhandled error");
  // DO NOT expose internal details to the client
  res.status(500).json({
    error: {
      code: "INTERNAL_ERROR",
      message: "An unexpected error occurred",
      requestId,
    },
  } satisfies ErrorResponse);
}

app.use(errorHandler);
```

## Structured Logging

**Plain-text logs are unqueryable at scale.** Use structured JSON logs from day one.

```typescript
import pino from "pino";

export const logger = pino({
  level: process.env.LOG_LEVEL ?? "info",
  // In development: pretty-print; in production: JSON
  transport:
    process.env.NODE_ENV === "development"
      ? { target: "pino-pretty" }
      : undefined,
  // Redact sensitive fields before they hit the log sink
  redact: ["req.headers.authorization", "req.body.password", "*.creditCard"],
  base: {
    service: process.env.SERVICE_NAME ?? "api",
    env: process.env.NODE_ENV,
  },
});
```

Log levels — use them correctly:

| Level | Use for |
|-------|---------|
| `error` | Programmer errors, unhandled exceptions, critical failures |
| `warn` | Operational errors that are recovered from (4xx, expected failures) |
| `info` | Significant lifecycle events (server start, request completed, payment processed) |
| `debug` | Detailed diagnostic info (query details, cache hits/misses) — never in production by default |
| `trace` | Exhaustive per-operation traces — development only |

```typescript
// Structured context — always include relevant IDs
logger.warn({ userId: user.id, orderId: order.id, err }, "Payment failed — retrying");
logger.error({ requestId, path: req.path, err }, "Unhandled route error");
logger.info({ userId: user.id, plan: "pro" }, "Subscription upgraded");
```

## Correlation IDs

**Every request must have a traceable ID through all logs and downstream calls.** Without correlation IDs, debugging a distributed system is guesswork.

```typescript
import { randomUUID } from "crypto";

// Middleware: generate or forward requestId
app.use((req, res, next) => {
  const requestId =
    (req.headers["x-request-id"] as string) ?? randomUUID();
  req.requestId = requestId;
  res.setHeader("x-request-id", requestId);
  // Bind to async context so all logs in this request include it
  req.log = logger.child({ requestId });
  next();
});

// Downstream calls — propagate the ID
async function callPaymentService(requestId: string, payload: unknown) {
  return fetch("https://payments.internal/charge", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-request-id": requestId, // propagate for end-to-end tracing
    },
    body: JSON.stringify(payload),
  });
}
```

## Graceful Degradation

**Services fail. Design for it.**

```typescript
// Circuit breaker pattern — stop hammering a failing downstream
import CircuitBreaker from "opossum";

const paymentBreaker = new CircuitBreaker(callPaymentAPI, {
  timeout: 3000,          // fail if not resolved in 3s
  errorThresholdPercentage: 50, // open circuit when 50% of calls fail
  resetTimeout: 10000,    // try again after 10s
});

paymentBreaker.fallback(() => ({
  status: "queued",
  message: "Payment queued for processing",
}));

// Graceful shutdown — drain in-flight requests before exiting
process.on("SIGTERM", async () => {
  logger.info("SIGTERM received — graceful shutdown starting");
  server.close(async () => {
    await db.pool.end();
    logger.info("Graceful shutdown complete");
    process.exit(0);
  });
  // Force shutdown after 10s if still draining
  setTimeout(() => {
    logger.error("Graceful shutdown timed out — forcing exit");
    process.exit(1);
  }, 10_000);
});
```

## Client-Safe Error Shapes

**Never expose internal context in error responses.** The client gets a stable code and a human-readable message. Diagnostics live in logs, not responses.

```typescript
// BAD — exposes internal detail
res.status(500).json({
  error: "PrismaClientKnownRequestError: Unique constraint failed on field email",
  stack: "Error: ...\n    at Object.<anonymous> (/app/src/routes/users.ts:42:3)",
});

// GOOD — client sees only what it needs
res.status(409).json({
  error: {
    code: "EMAIL_ALREADY_EXISTS",
    message: "An account with this email already exists",
    requestId: "req_01HXY...",
  },
});
// Server logs the Prisma error with full stack and requestId for correlation
```

**Error code contract:**
- Codes are `SCREAMING_SNAKE_CASE` strings — never change them once clients depend on them
- Codes map to HTTP status + meaning: `NOT_FOUND` → 404, `FORBIDDEN` → 403, `VALIDATION_FAILED` → 422
- New codes are additive — clients should handle unknown codes gracefully (fall back to HTTP status)

## OpenTelemetry Integration

```typescript
import { trace, SpanStatusCode } from "@opentelemetry/api";

const tracer = trace.getTracer("api");

async function processOrder(orderId: string) {
  return tracer.startActiveSpan("order.process", async (span) => {
    span.setAttributes({ "order.id": orderId });
    try {
      const order = await fetchOrder(orderId);
      span.setAttributes({ "order.total": order.totalCents });
      const result = await chargePayment(order);
      span.setStatus({ code: SpanStatusCode.OK });
      return result;
    } catch (err) {
      span.recordException(err as Error);
      span.setStatus({ code: SpanStatusCode.ERROR, message: (err as Error).message });
      throw err;
    } finally {
      span.end();
    }
  });
}
```

## Named Anti-Patterns

**"Swallowed Catch"**
```typescript
// BAD — error disappears; caller receives success response for a failed operation
try {
  await sendWelcomeEmail(user.email);
} catch {
  // intentionally blank — "it's just an email"
}
res.status(201).json({ data: user });
```
Always log at minimum. If the operation is genuinely optional, log a warning and record a metric. Never silently eat failures.

**"Leaked Stacktrace"**
Returning `err.stack` or raw ORM error messages in API responses. Stack traces expose internal file paths, dependency names, and code structure to attackers. Log them server-side; never serialize them into responses.

**"Magic 500"**
Every error returns 500 regardless of cause. Clients cannot distinguish "your input was invalid" from "our server crashed." Map errors to correct HTTP status codes.

**"String-Matched Error Types"**
```typescript
// BAD — brittle, breaks on library version upgrades
if (err.message.includes("unique constraint")) { ... }

// GOOD — match on error code or type
if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") { ... }
```

**"Async Void Leak"**
```typescript
// BAD — unhandled promise rejection crashes the process silently
app.get("/data", (req, res) => {
  fetchData().then(data => res.json(data));
  // no .catch() — if fetchData rejects, nothing handles it
});

// GOOD — wrap async handlers
app.get("/data", asyncHandler(async (req, res) => {
  const data = await fetchData();
  res.json(data);
}));
// asyncHandler catches thrown errors and passes to Express error middleware
```
