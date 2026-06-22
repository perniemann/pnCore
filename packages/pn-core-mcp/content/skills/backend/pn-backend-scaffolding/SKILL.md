---
name: pn-backend-scaffolding
description: Scaffolds new API routes, modules, or services in Node (Express, Fastify, Hono) or similar. Use when adding a new route/module/service; covers project layout, env/secrets pattern, error-handling stub, and stack-specific conventions. Reference pn-node-api and pn-backend-philosophy for design rules.
---

# Backend scaffolding

## When to use

- Adding a new API route, handler, or endpoint.
- Creating a new backend module, service, or domain.
- Setting up a new Node backend project from scratch.
- Adding a new resource to an existing API.

## Folder structure

Prefer domain-driven layout over technical-layer layout:

```
# Domain-driven (preferred)
src/
  users/
    users.router.ts     # Express/Fastify route definitions
    users.service.ts    # Business logic
    users.schema.ts     # Zod validation schemas
    users.types.ts      # TypeScript types for this domain
  orders/
    orders.router.ts
    orders.service.ts
    orders.schema.ts
  shared/
    db.ts               # DB connection/pool
    errors.ts           # AppError class, error codes
    middleware/
      authenticate.ts
      errorHandler.ts
  index.ts              # App entry point
```

vs. technical-layer (avoid for anything beyond a toy project):
```
# Avoid at scale
controllers/
models/
routes/
services/
```

## Express scaffold

```typescript
// src/users/users.router.ts
import { Router } from "express";
import { authenticate } from "../shared/middleware/authenticate.js";
import { asyncHandler } from "../shared/middleware/asyncHandler.js";
import { CreateUserSchema } from "./users.schema.js";
import { createUser, getUserById } from "./users.service.js";

export const usersRouter = Router();

usersRouter.post(
  "/",
  authenticate,
  asyncHandler(async (req, res) => {
    const body = CreateUserSchema.parse(req.body); // throws on validation fail
    const user = await createUser(body);
    res.status(201).json({ data: user });
  })
);

usersRouter.get(
  "/:id",
  authenticate,
  asyncHandler(async (req, res) => {
    const user = await getUserById(Number(req.params.id), req.user.id);
    res.json({ data: user });
  })
);
```

```typescript
// src/shared/middleware/asyncHandler.ts
import type { Request, Response, NextFunction, RequestHandler } from "express";

export function asyncHandler(
  fn: (req: Request, res: Response, next: NextFunction) => Promise<unknown>
): RequestHandler {
  return (req, res, next) => fn(req, res, next).catch(next);
}
```

## Fastify scaffold

```typescript
// src/users/users.plugin.ts
import type { FastifyPluginAsync } from "fastify";
import { Type } from "@sinclair/typebox"; // or use zod with fastify-zod
import { createUser } from "./users.service.js";

const CreateUserBody = Type.Object({
  email: Type.String({ format: "email" }),
  name: Type.String({ minLength: 1, maxLength: 100 }),
});

export const usersPlugin: FastifyPluginAsync = async (app) => {
  app.post(
    "/users",
    { schema: { body: CreateUserBody } },
    async (request, reply) => {
      const user = await createUser(request.body);
      return reply.status(201).send({ data: user });
    }
  );
};
```

## Hono scaffold

```typescript
// src/users/users.route.ts
import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { CreateUserSchema } from "./users.schema.js";
import { createUser } from "./users.service.js";

export const usersRoute = new Hono()
  .post("/", zValidator("json", CreateUserSchema), async (c) => {
    const body = c.req.valid("json");
    const user = await createUser(body);
    return c.json({ data: user }, 201);
  });
```

## Env and secrets

```typescript
// src/shared/config.ts — validate at startup, fail fast
const config = {
  databaseUrl: process.env.DATABASE_URL ?? (() => { throw new Error("DATABASE_URL required"); })(),
  jwtSecret: process.env.JWT_SECRET ?? (() => { throw new Error("JWT_SECRET required"); })(),
  port: Number(process.env.PORT ?? 3000),
  nodeEnv: process.env.NODE_ENV ?? "development",
};
export default config;
```

`.env.example` — always keep current with all required variables:
```
DATABASE_URL=postgresql://user:password@localhost:5432/myapp
JWT_SECRET=change-me-in-production
PORT=3000
NODE_ENV=development
```

## Error handling stub

```typescript
// src/shared/errors.ts
export class AppError extends Error {
  constructor(
    public readonly code: string,
    public readonly httpStatus: number,
    message: string
  ) {
    super(message);
    this.name = "AppError";
  }
}

// Common operational errors
export const Errors = {
  notFound: (entity: string) => new AppError("NOT_FOUND", 404, `${entity} not found`),
  forbidden: () => new AppError("FORBIDDEN", 403, "Access denied"),
  validationFailed: (msg: string) => new AppError("VALIDATION_FAILED", 422, msg),
};
```

## One-at-a-time rule

Add one route or one module per PR. Mixing multiple domain changes in a single diff makes reviews slow and merges risky.

## Guardrails

- **pn-node-api** — API design, DB access patterns, and error handling depth.
- **pn-backend-philosophy** — Authoritative backend rulebook (security, OWASP, REST, secrets).
- **pn-backend-architecture** — Use when designing the overall service structure before scaffolding individual routes.
