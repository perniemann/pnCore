# Testing Strategy — Code Patterns Reference

Full setup configs, examples, and CI configuration. For pyramid, tool selection, and what to test, see [SKILL.md](SKILL.md).

---

## Vitest setup

```typescript
// vitest.config.ts
import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./src/test/setup.ts"],
    coverage: {
      provider: "v8",
      reporter: ["text", "lcov"],
      thresholds: { lines: 80, functions: 80 },
    },
  },
});
```

```typescript
// src/test/setup.ts
import "@testing-library/jest-dom";
import { server } from "./msw-server";

beforeAll(() => server.listen({ onUnhandledRequest: "error" }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());
```

---

## MSW — mock HTTP at the network level

```typescript
// src/test/msw-server.ts (Node)
import { setupServer } from "msw/node";
import { http, HttpResponse } from "msw";

export const server = setupServer(
  http.get("/api/users/:id", ({ params }) => {
    return HttpResponse.json({ id: params.id, name: "Alice" });
  }),
  http.post("/api/orders", async ({ request }) => {
    const body = await request.json();
    return HttpResponse.json({ id: "order-1", ...body }, { status: 201 });
  })
);

// Override handler in a specific test:
server.use(
  http.get("/api/users/:id", () => HttpResponse.json(null, { status: 404 }))
);
```

MSW is preferred over `jest.mock(fetch)` — it tests the actual fetch/axios call path.

---

## Integration test pattern (real DB)

```typescript
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { createApp } from "../src/app";
import supertest from "supertest";
import { db } from "../src/db";

describe("POST /api/users", () => {
  let app: ReturnType<typeof createApp>;

  beforeAll(async () => {
    app = createApp();
    await db.$connect();
    await db.$executeRaw`DELETE FROM users`;
  });
  afterAll(() => db.$disconnect());

  it("creates a user and returns 201", async () => {
    const res = await supertest(app)
      .post("/api/users")
      .send({ email: "test@example.com", name: "Test User" })
      .expect(201);
    expect(res.body).toMatchObject({ email: "test@example.com" });
  });
});
```

---

## Playwright E2E setup

```typescript
// playwright.config.ts
import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  retries: process.env.CI ? 2 : 0,
  reporter: process.env.CI ? [["github"], ["html"]] : "list",
  use: {
    baseURL: process.env.BASE_URL ?? "http://localhost:3000",
    trace: "on-first-retry",
    screenshot: "only-on-failure",
  },
  projects: [
    { name: "chromium", use: { ...devices["Desktop Chrome"] } },
    { name: "Mobile Safari", use: { ...devices["iPhone 14"] } },
  ],
  webServer: {
    command: "npm run dev",
    url: "http://localhost:3000",
    reuseExistingServer: !process.env.CI,
  },
});
```

```typescript
// e2e/checkout.spec.ts
import { test, expect } from "@playwright/test";

test("user can complete checkout", async ({ page }) => {
  await page.goto("/products");
  await page.getByRole("button", { name: "Add to cart" }).first().click();
  await page.getByRole("link", { name: "View cart" }).click();
  await expect(page.getByRole("heading", { name: "Your cart" })).toBeVisible();
  await page.getByRole("button", { name: "Checkout" }).click();
  await expect(page.getByText("Order confirmed")).toBeVisible();
});
```

---

## Contract testing with Pact

```typescript
import { PactV3, MatchersV3 } from "@pact-foundation/pact";

const provider = new PactV3({ consumer: "web-app", provider: "user-api", dir: "pacts/" });

describe("User API consumer", () => {
  it("gets a user by id", async () => {
    await provider
      .given("user 123 exists")
      .uponReceiving("a request for user 123")
      .withRequest({ method: "GET", path: "/users/123" })
      .willRespondWith({
        status: 200,
        body: { id: "123", name: MatchersV3.string("Alice") },
      })
      .executeTest(async (mockProvider) => {
        const user = await fetchUser(mockProvider.url, "123");
        expect(user.id).toBe("123");
      });
  });
});
```

---

## CI configuration

```yaml
# .github/workflows/test.yml
- name: Unit and integration tests
  run: npx vitest run --coverage

- name: E2E tests
  run: npx playwright test
  env:
    BASE_URL: http://localhost:3000

- name: Upload Playwright report
  if: always()
  uses: actions/upload-artifact@v4
  with:
    name: playwright-report
    path: playwright-report/
```
