---
name: pn-monorepo
description: "Monorepo setup and maintenance with Turborepo, Nx, and pnpm workspaces. Build caching, publishConfig, shared package configuration, and workspace dependency graphs. Use when setting up or refactoring a monorepo."
---

# Monorepo

## When to use

- Setting up a new monorepo with Turborepo, Nx, or pnpm workspaces
- Adding a new package or app to an existing monorepo
- Configuring build caching and task pipelines
- Publishing shared packages (`publishConfig`, changesets)
- Diagnosing slow builds or dependency resolution issues
- Migrating a multi-repo project into a monorepo

For full config files, package.json examples, and CI setup, see [reference.md](reference.md).

## Tool decision matrix

| Tool | When to prefer |
|---|---|
| **Turborepo** | Simple task orchestration, JS/TS focused, minimal config, Vercel deployment |
| **Nx** | Large monorepos, cross-language, plugin ecosystem, IDE integration |
| **pnpm workspaces** (standalone) | Lightweight setups where you only need workspace linking |
| **Nx + pnpm** | Large teams with complex graph, best cache and affected analysis |
| **Turborepo + pnpm** | Most common 2026 default for JS/TS stacks |

## Structure

```
my-monorepo/
├── apps/
│   ├── web/          (Next.js)
│   └── api/          (Node.js / Hono)
├── packages/
│   ├── ui/           (shared React components)
│   ├── config-ts/    (shared tsconfig)
│   └── utils/        (shared utilities)
├── turbo.json
├── package.json
└── pnpm-workspace.yaml
```

## Key rules

**Shared tsconfig:** Keep a base `config-ts/base.json`; each app extends it. Shared internal packages point `exports` directly to `./src/index.ts` for zero-build dev.

**Publishable packages:** Set `"private": false` with `publishConfig`, `exports`, and `files: ["dist"]`. Build with `tsup`.

**Internal packages:** Set `"private": true`, exports to `./src/index.ts`. Consuming apps declare `"@my-org/utils": "workspace:*"`.

**Changesets:** Use `npx changeset add` per PR, `npx changeset version` to bump, `npx changeset publish` to release.

**Remote caching:** Connect to Vercel remote cache or self-host with `TURBO_API` + `TURBO_TOKEN`.

## Common pitfalls

- **Hoisting conflicts** — set `shamefully-hoist=false` in the project npm config file to prevent phantom dependencies
- **Circular dependencies** — extract shared logic to a new leaf package; Turbo detects cycles
- **Missing `^build` dependency** — if B imports A, `turbo.json` must have `"dependsOn": ["^build"]`
- **Dev server cache** — set `"cache": false` for `dev` task

## Guardrails

- Reference `pn-docker` for multi-service Docker builds in a monorepo context.
- Reference `pn-devops-automation` for CI/CD pipeline patterns with monorepo filters.
- Keep the root `package.json` lean — install tools globally at root, not duplicated per package.
