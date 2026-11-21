---
name: pn-tdd
description: "Enforces test-driven development: RED-GREEN-REFACTOR; production code only after a failing test. Use when implementing features or fixes with TDD, or when generating tests for existing code."
---

# TDD (Test-Driven Development)

## When to use

- Implementing a new feature or bug fix with test-first discipline (RED-GREEN-REFACTOR).
- Production code was written before a failing test and needs to be reset to follow TDD correctly.
- You want to enforce one-behavior-at-a-time discipline and prevent speculative code.

## Iron rule

**Do not write production code before a failing test.** If production code was written before a failing test, delete that production code and restart with a failing test first.

## Workflow (RED-GREEN-REFACTOR)

1. **RED:** Write the smallest failing test that defines the desired behavior. Run it; it must fail.
2. **GREEN:** Write the minimal production code to make the test pass. No extra behavior.
3. **REFACTOR:** Improve the code (naming, duplication, structure) while keeping tests green.
4. Repeat for the next behavior.

## Guardrails

- One behavior at a time; small test, minimal code.
- Run tests after every change.
- If you wrote production code first, remove it and write the failing test first.

## Output

- Failing test (RED), then passing (GREEN), then refactor summary.
- Clear link between each test and the production code that satisfies it.

<!-- merged from pn-test-generation (0.22.0) -->
## Test generation

### When to use

- Adding test coverage to a module or function that has none.
- Scaffolding tests from acceptance criteria, specs, or existing code before implementing (TDD setup).
- Backfilling unit or integration tests for code that was written without them.
- Detecting and matching the project's test framework (Vitest, Jest, Playwright, pytest, etc.).

### Workflow

1. **Identify scope:** Module, function, or feature to test. If specs or acceptance criteria exist, use them as the contract.
2. **Match framework:** Detect or ask which test framework the project uses (Vitest, Jest, Playwright, Cypress, Mocha, pytest, etc.).
3. **Generate tests:**
   - Unit: one describe/test block per function or behavior; arrange-act-assert structure.
   - Integration: cover interactions between modules, APIs, or DB; use real or mocked dependencies per project convention.
4. **Run tests:** Execute the generated tests and fix failures (assertions, mocks, setup).
5. **Iterate:** Adjust coverage or add edge cases if the user requests more.

### Guardrails

- Do not generate tests that only assert implementation details (e.g. private method calls). Test observable behavior and outcomes.
- Use project conventions: file location (e.g. `*.test.ts` beside source or in `__tests__/`), naming, mocking style.
- Avoid flaky tests: no arbitrary sleeps; use deterministic waits and explicit assertions.
- When backfilling, prefer behavior over implementation; refactor code if needed to make it testable.

### Output

- Test file(s) in the correct location
- Tests passing after generation (or a clear list of fixes needed)
- Brief summary of what is covered and what is not
