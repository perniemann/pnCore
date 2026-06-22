---
name: pn-testing-strategy
description: Testing strategy and pyramid. Unit/integration/E2E ratio, Vitest vs Playwright vs MSW, contract testing, and test-environment setup. Use when defining or reviewing a project's testing approach.
---

# Testing strategy

## When to use

- Deciding which types of tests to write for a new feature
- Reviewing a test suite for gaps, redundancy, or flakiness
- Setting up a project's test infrastructure from scratch
- Choosing between Vitest, Playwright, MSW, or other test tools
- Adding contract testing to a multi-service architecture

For full setup code, config examples, and CI configuration, see [reference.md](reference.md).

## The testing pyramid

```
         /\
        /E2E\       few, high-confidence, slow
       /------\
      /  Integ  \   moderate, key user flows
     /------------\
    /    Unit      \  many, fast, isolated
   /----------------\
```

| Layer | Target share | Tools | Speed | Confidence |
|---|---|---|---|---|
| Unit | 60–70% | Vitest | < 1ms per test | Logic correctness |
| Integration | 20–30% | Vitest + real DB / MSW | 10–100ms | Boundary contracts |
| E2E | 5–10% | Playwright | 1–30s | Full user journeys |

**Anti-pattern — the ice-cream cone:** too many E2E tests, few units. Result: slow CI, brittle tests, hard to pinpoint failures.

## Tool decision matrix

| Need | Tool | Notes |
|---|---|---|
| Unit tests (JS/TS) | **Vitest** | Fast, native ESM, compatible with Jest API |
| React component tests | **Vitest + Testing Library** | `@testing-library/react` for user-centric assertions |
| Server-side API tests | **Vitest + supertest** | Test handlers in-process; no network overhead |
| Mock HTTP requests | **MSW** | Intercepts at the network level; works in browser + Node |
| E2E / browser tests | **Playwright** | Multi-browser, reliable, built-in tracing |
| Visual regression | **Playwright + screenshots** or **Chromatic** | Catch unintended UI changes |
| Contract testing | **Pact** or **OpenAPI test** | Verify consumer/provider contracts |

## What to write for each layer

**Unit tests — always write for:**
- Pure functions with business logic
- Utility functions (formatting, validation, calculation)
- State machines and reducers
- Individual React components (behaviour, not snapshot)

**Integration tests — always write for:**
- API route handlers (request parsing, response shape, error paths)
- Database queries and ORM layer
- Auth middleware and guards
- External service clients (with MSW mocks)

**E2E tests — write for:**
- Critical user journeys (sign up, login, checkout, core CRUD)
- High-risk regression areas
- Happy path only; edge cases belong in integration tests

## Coverage targets

| Type | Target | Notes |
|---|---|---|
| Unit | ≥ 80% line coverage | Core logic packages |
| Integration | Key paths covered | Metric is flow coverage, not line % |
| E2E | Top 5–10 user journeys | Coverage tracked by journey, not code |

## Guardrails

- Reference `pn-tdd` for test-first methodology on new features.
- Reference `pn-smoke-tests` for production verification after deployment.
- Reference `pn-a11y-audit` for accessibility assertions in Playwright tests.
- Avoid testing implementation details — test behaviour from the user's perspective.
- Flaky tests must be fixed or quarantined within one sprint; accumulation is a CI quality signal.
