---
name: pn-observability
description: "Production observability with OpenTelemetry, structured logging, Sentry error tracking, and Datadog/Grafana APM. Use when instrumenting a service for traces, metrics, logs, and alerts."
---

# Observability

## When to use

- Instrumenting a new service with traces, metrics, and structured logs
- Adding Sentry for error tracking and performance monitoring
- Setting up OpenTelemetry with a collector (Datadog, Grafana Tempo, OTLP)
- Implementing health-check endpoints (`/health`, `/ready`)
- Defining SLOs and alert thresholds
- Diagnosing a performance regression or production incident

## Three pillars

| Pillar | What it answers | Tools |
|---|---|---|
| **Logs** | What happened? | Pino, Winston → Datadog Logs, CloudWatch, Loki |
| **Traces** | Why did it happen? (request flow) | OpenTelemetry → Datadog APM, Jaeger, Grafana Tempo |
| **Metrics** | How often? How fast? | `prom-client`, OTel metrics → Prometheus/Datadog/Grafana |

## Structured logging with Pino

```typescript
import pino from "pino";

export const logger = pino({
  level: process.env.LOG_LEVEL ?? "info",
  // pretty-print in dev, JSON in prod
  transport: process.env.NODE_ENV === "development"
    ? { target: "pino-pretty", options: { colorize: true } }
    : undefined,
  redact: ["req.headers.authorization", "body.password", "body.token"],
  base: { service: "api", version: process.env.APP_VERSION },
});

// Usage — always log structured fields, not interpolated strings
logger.info({ userId, orderId }, "Order placed");
logger.error({ err, requestId }, "Payment failed");

// Request logger middleware (Fastify auto-logs; Express manual)
app.use((req, res, next) => {
  req.log = logger.child({ requestId: req.headers["x-request-id"] });
  req.log.info({ method: req.method, url: req.url }, "Request received");
  next();
});
```

**Rules:**
- Log as JSON in production — log aggregators parse JSON, not strings.
- Always include `requestId` / `traceId` in every log line for correlation.
- Redact sensitive fields — never log tokens, passwords, or full PII.
- Use log levels correctly: `debug` for dev details, `info` for business events, `warn` for degraded state, `error` for failures.

## OpenTelemetry

```typescript
// instrumentation.ts (Next.js) or tracing.ts (Node.js)
import { NodeSDK } from "@opentelemetry/sdk-node";
import { OTLPTraceExporter } from "@opentelemetry/exporter-trace-otlp-http";
import { getNodeAutoInstrumentations } from "@opentelemetry/auto-instrumentations-node";
import { Resource } from "@opentelemetry/resources";
import { SemanticResourceAttributes } from "@opentelemetry/semantic-conventions";

const sdk = new NodeSDK({
  resource: new Resource({
    [SemanticResourceAttributes.SERVICE_NAME]: "my-api",
    [SemanticResourceAttributes.SERVICE_VERSION]: process.env.APP_VERSION ?? "unknown",
  }),
  traceExporter: new OTLPTraceExporter({
    url: process.env.OTEL_EXPORTER_OTLP_ENDPOINT ?? "http://localhost:4318/v1/traces",
  }),
  instrumentations: [getNodeAutoInstrumentations()],
});

sdk.start();
process.on("SIGTERM", () => sdk.shutdown());
```

```typescript
// Manual spans for business-critical operations
import { trace, SpanStatusCode } from "@opentelemetry/api";

const tracer = trace.getTracer("payment-service");

async function chargeCard(orderId: string, amount: number) {
  return tracer.startActiveSpan("charge_card", async (span) => {
    span.setAttributes({ "order.id": orderId, "payment.amount": amount });
    try {
      const result = await stripeClient.charge(orderId, amount);
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

## Sentry

```typescript
// Next.js — sentry.server.config.ts
import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  tracesSampleRate: process.env.NODE_ENV === "production" ? 0.1 : 1.0,
  profilesSampleRate: 0.1,
  environment: process.env.NODE_ENV,
  release: process.env.APP_VERSION,
  integrations: [Sentry.prismaIntegration()], // DB query tracing
  beforeSend(event) {
    // Strip PII before sending
    if (event.user) delete event.user.email;
    return event;
  },
});

// Capture custom errors with context
try {
  await processOrder(order);
} catch (err) {
  Sentry.captureException(err, {
    extra: { orderId: order.id, userId: order.userId },
    tags: { feature: "checkout" },
  });
  throw err;
}

// Performance transaction
const transaction = Sentry.startTransaction({ name: "checkout.complete", op: "task" });
// ... work ...
transaction.finish();
```

## Health check endpoints

Every service must expose `/health` (liveness) and `/ready` (readiness) endpoints.

```typescript
// /health — is the process alive?
app.get("/health", (_req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// /ready — is the service ready to serve traffic? (checks dependencies)
app.get("/ready", async (_req, res) => {
  try {
    await db.$queryRaw`SELECT 1`;            // DB reachable
    await redis.ping();                       // Redis reachable
    res.json({ status: "ok", db: "ok", redis: "ok" });
  } catch (err) {
    res.status(503).json({ status: "error", error: (err as Error).message });
  }
});
```

## Key metrics to instrument

| Metric | Type | Description |
|---|---|---|
| `http_request_duration_ms` | Histogram | Request latency by route and status |
| `http_requests_total` | Counter | Request count by method, route, status |
| `db_query_duration_ms` | Histogram | DB query latency by operation |
| `cache_hits_total` / `cache_misses_total` | Counter | Cache efficiency |
| `queue_depth` | Gauge | Pending jobs in background queues |
| `error_rate` | Derived | `5xx / total` — primary SLO signal |

## SLO / alert thresholds (example)

| SLO | Target | Alert at |
|---|---|---|
| P99 API latency | < 500 ms | > 800 ms for 5 min |
| Error rate | < 0.1% | > 1% for 2 min |
| DB connection pool | < 80% utilised | > 90% for 2 min |
| Uptime | 99.9% | Any health-check failure for 1 min |

## Guardrails

- Reference `pn-backend-philosophy` for error-boundary patterns and secrets.
- Do not log PII or secrets — configure `redact` in Pino and `beforeSend` in Sentry.
- Instrument at service entry points and critical business operations; avoid over-instrumenting hot paths (sampling).
- Store DSN and OTLP endpoint in environment variables; never hardcode.
