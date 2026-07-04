---
name: pn-openapi-design
description: "API-first design with OpenAPI 3.1. Contract-first workflow, zod-to-openapi, ts-to-openapi, spec validation, and client/server code generation. Use when designing, documenting, or reviewing HTTP APIs."
---

# OpenAPI design

## When to use

- Designing a new API before writing implementation code (contract-first)
- Generating a spec from existing TypeScript types or Zod schemas
- Producing client SDKs, server stubs, or typed fetch clients from a spec
- Reviewing API design for REST conformance, versioning, or schema consistency
- Setting up interactive API documentation (Swagger UI, Redoc, Scalar)

## Core principles

1. **Spec is the contract** — the OpenAPI document is the authoritative source of truth; implementation must conform to it, not the other way around.
2. **Contract-first, not code-first** — write or review the spec before writing handlers; this forces deliberate API design and catches breaking changes early.
3. **One spec, many consumers** — a single spec generates server types, client SDKs, mock servers, and docs; treat it as a build artifact.
4. **Explicit over implicit** — every field in request/response schemas must have a type, description, and `example`; avoid `additionalProperties: true` at boundaries.
5. **Version at the URL** — use `/api/v1/` path prefix; document deprecation notices in `info.x-deprecated` or `x-sunset` header.

## Workflow

### Contract-first with Zod (TypeScript)

```typescript
// 1. Define schema with Zod
import { z } from "zod";

export const CreateUserBody = z.object({
  email: z.string().email().describe("User email address"),
  name: z.string().min(1).max(100).describe("Display name"),
});

export const UserResponse = z.object({
  id: z.string().uuid(),
  email: z.string().email(),
  name: z.string(),
  createdAt: z.string().datetime(),
});

// 2. Register with zod-to-openapi
import { OpenAPIRegistry, OpenApiGeneratorV31 } from "@asteasolutions/zod-to-openapi";

const registry = new OpenAPIRegistry();

registry.registerPath({
  method: "post",
  path: "/users",
  summary: "Create a user",
  request: { body: { content: { "application/json": { schema: CreateUserBody } } } },
  responses: {
    201: { description: "Created", content: { "application/json": { schema: UserResponse } } },
    422: { description: "Validation error" },
  },
});

// 3. Generate spec
const generator = new OpenApiGeneratorV31(registry.definitions);
const spec = generator.generateDocument({ openapi: "3.1.0", info: { title: "API", version: "1.0.0" } });
```

### Hono / Fastify integration

- **Hono:** use `@hono/zod-openapi` — route definitions include schema and spec registration in one call.
- **Fastify:** use `fastify-swagger` + `@fastify/swagger-ui`; schemas defined with `ajv` are auto-exposed.
- **Express:** use `express-openapi-validator` to validate requests/responses against the spec at runtime.

### Code generation

```bash
# TypeScript client from spec
npx openapi-typescript openapi.yaml -o src/generated/api.d.ts
# then use openapi-fetch for typed fetch calls

# Full client SDK
npx @openapitools/openapi-generator-cli generate \
  -i openapi.yaml -g typescript-fetch -o src/generated/client

# Server stubs
npx @openapitools/openapi-generator-cli generate \
  -i openapi.yaml -g nodejs-express-server -o src/generated/server
```

### Spec validation

```bash
# Lint the spec
npx @stoplight/spectral-cli lint openapi.yaml --ruleset @stoplight/spectral-oas

# Validate against live server
npx openapi-backend -s openapi.yaml -u http://localhost:3000
```

## Schema design rules

- Use `$ref` to avoid duplicating schemas — define reusable components in `components/schemas`.
- Use `oneOf` / `discriminator` for polymorphic response types; avoid untyped `object`.
- Every error response must include a schema (not just a description); use a shared `ErrorResponse` component.
- Use `nullable: false` explicitly (OAS 3.1 uses `type: ["string", "null"]` instead of `nullable: true`).
- Always include `examples` or `example` on request bodies and primary responses.

## Versioning

| Strategy | When to use |
|---|---|
| URI path `/api/v1/` | Default; simple, cache-friendly |
| Header `API-Version: 2024-01-01` | Date-based (Stripe pattern); good for iterative APIs |
| Query param `?version=2` | Avoid — not REST-idiomatic; hard to cache |

- Document deprecated endpoints with `deprecated: true` in the path object; set a sunset date in `x-sunset`.
- Never break a published contract without a new major version.

## Documentation hosting

- **Scalar** — modern, recommended for 2026 (`@scalar/api-reference` component or CDN).
- **Redoc** — clean read-only docs; good for public APIs.
- **Swagger UI** — interactive, widely recognized; heavier bundle.

## Output

- `openapi.yaml` at repo root or `docs/api/openapi.yaml`
- Generated TypeScript types in `src/generated/`
- Validation middleware wired to all routes
- CI lint step: `spectral lint openapi.yaml`

## Guardrails

- Reference `pn-backend-philosophy` for REST conventions, error shapes, and versioning strategy.
- Reference `pn-security-audit` for auth scheme definitions (`securitySchemes`) and OAuth2 flows.
