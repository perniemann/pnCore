---
name: pn-slice-contracts
description: How to define and lock interface contracts between feature_program slices, emit .cursor/worktrees.json, and run contract-conformance tests at the verifier gate. Use at feature_program step 1 (lock contracts) and step 4 (verify conformance).
---

# Slice contracts

**When used as a standalone skill, begin every response with** `[pn-skill] 🔺`

## When to use

Use this skill at `feature_program` step 1 to define and lock interface contracts between slices, and to generate `.cursor/worktrees.json`. Also use at step 4 (verifier gate) to author contract-conformance tests and interpret verifier reports.

## Purpose

Contracts are the seams between slices. They must be locked before fan-out so every slice works against the same interface. Without locked contracts, parallel agents invent incompatible field names (`userId` vs `user_id` vs `uid`) and the merge phase becomes a semantic debugging session.

## Contract types and when to use each

| Type | When | Example |
|------|------|---------|
| **TypeScript interfaces** | Shared data models, request/response shapes in a TS monorepo | `interface CreateOrderRequest { userId: string; items: OrderItem[] }` |
| **JSON Schema** | Language-agnostic APIs, config files, event envelopes | `{ "type": "object", "properties": { "userId": { "type": "string" } } }` |
| **OpenAPI stubs** | REST endpoints consumed across slices | `paths: /orders: post: requestBody: ...` |
| **GraphQL schema fragment** | Shared types in a GraphQL API | `type Order { id: ID! userId: ID! items: [OrderItem!]! }` |

Use the **simplest format that covers the consuming slice's needs**. TypeScript interfaces for all-TS repos; OpenAPI stubs when contracts cross language boundaries.

## Where contracts live

```
docs/refs/contracts/<programSlug>/
├── shared-types.ts         ← TypeScript shared interfaces
├── api-stubs.yaml          ← OpenAPI stubs (paths only, no implementation)
├── events.schema.json      ← JSON Schema for event envelopes
└── README.md               ← Contract index (auto-generated at step 1)
```

Rules:
- All contract files live in `docs/refs/contracts/<programSlug>/`.
- Contract files are read-only to slice worktrees — slices consume but do not edit them.
- Any edit to contracts re-triggers step 1 review (major patch path).

## Contract authoring checklist (step 1)

1. **Enumerate cross-slice dependencies.** For each pair of slices (A, B) where A consumes what B produces, list the shared types.
2. **Write minimal contracts.** Include only what the consuming slice needs — no implementation details. Keep fields required unless genuinely optional.
3. **Name fields consistently.** Agree on `camelCase` vs `snake_case` before writing. Set the convention in `README.md`.
4. **Version the contracts.** Add a `// Contract v1.0 — locked <date>` comment (or YAML `x-contract-version: 1.0`). Increment on each approved patch.
5. **Symlink (or copy) contracts into each slice worktree.** On contract lock, ensure each worktree can reference `docs/refs/contracts/<programSlug>/`. Since worktrees share the `.git` object store, a relative path from the worktree root works when contracts live in the main tree.

## Minor vs major contract patches

| Patch type | Definition | Allowed in-flight? |
|------------|------------|-------------------|
| **Minor (additive)** | Adding optional fields, new endpoints with no breaking changes to existing shapes | Yes — update contract files, notify consuming slices via `workflow_handoff_append`, continue fan-out |
| **Major (breaking)** | Renaming/removing required fields, changing field types, restructuring response envelopes | No — rewind to step 1: pause all slice work, update contracts, re-confirm with user, re-fan-out |

When in doubt, treat the patch as major and rewind.

## Emitting `.cursor/worktrees.json` (step 1, required)

Cursor uses `.cursor/worktrees.json` to set up each worktree when an agent starts in it. Generate one entry for the whole file (not per-slice; Cursor applies the same setup to every worktree of the repo):

**Local secrets in worktrees:** Never commit live credentials. Copy only the root worktree’s **environment template** (e.g. `env.example` at repo root) via a project script such as `node scripts/bootstrap-worktree-env.mjs`. Do not document `cp` of secret-bearing files in SKILL.md.

### Node.js / npm project

```json
{
  "setup-worktree": [
    "npm ci",
    "node scripts/bootstrap-worktree-env.mjs"
  ]
}
```

### Node.js / pnpm project

```json
{
  "setup-worktree": [
    "pnpm install",
    "pnpm run build",
    "node scripts/bootstrap-worktree-env.mjs"
  ]
}
```

### Python project

```json
{
  "setup-worktree": [
    "python -m venv venv",
    "source venv/bin/activate && pip install -r requirements.txt",
    "node scripts/bootstrap-worktree-env.mjs"
  ]
}
```

### Project with database migrations

```json
{
  "setup-worktree": [
    "npm ci",
    "node scripts/bootstrap-worktree-env.mjs",
    "npm run db:migrate"
  ]
}
```

### Windows + Unix cross-platform

```json
{
  "setup-worktree-unix": [
    "npm ci",
    "node scripts/bootstrap-worktree-env.mjs"
  ],
  "setup-worktree-windows": [
    "npm ci",
    "node scripts/bootstrap-worktree-env.mjs"
  ]
}
```

**Detection heuristic:** Check for `package.json` (npm/pnpm/yarn), `requirements.txt` / `pyproject.toml` (Python), `go.mod` (Go), `Cargo.toml` (Rust), `Gemfile` (Ruby). Use the matching template. When in doubt, ask the user.

**Do not symlink `node_modules` into the worktree** — use `npm ci` or `pnpm install` inside the worktree for correct isolation (per Cursor docs).

## Contract-conformance test pattern (step 4 verifier gate)

At step 4, each slice must pass a contract-conformance check before merging. This is distinct from unit/integration tests — it verifies the slice's implementation matches the locked interface.

### For TypeScript contracts

Add a test file in the slice:

```typescript
// __tests__/contract.test.ts
import type { CreateOrderRequest } from "../../docs/refs/contracts/my-prog/shared-types";
// If the slice exports a function that accepts this shape, compile-check it:
import { createOrder } from "../api/orders";

// Type-level assertion — fails at compile time if types diverge
const _typeCheck: (req: CreateOrderRequest) => unknown = createOrder;
```

Run `npx tsc --noEmit` as part of the verifier step to catch contract drift at compile time.

### For OpenAPI stubs

Use `openapi-diff` or `swagger-parser` to validate the slice's actual endpoint shape against the stub:

```bash
npx openapi-diff docs/refs/contracts/my-prog/api-stubs.yaml src/openapi/generated.yaml
```

### For JSON Schema event contracts

Use `ajv` to validate sample payloads produced by the slice:

```bash
npx ajv validate -s docs/refs/contracts/my-prog/events.schema.json -d src/__fixtures__/sample-event.json
```

### Verifier report shape

After conformance checks, produce a `verifierReport` to set in the slice's state entry:

```json
{
  "passed": true,
  "evidence": "tsc --noEmit: 0 errors; 34/34 unit tests pass; contract conformance: 3/3 endpoints match stubs"
}
```

If `passed: false`, list what failed in `evidence`. The slice cannot merge until `passed: true`.
