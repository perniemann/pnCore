---
name: pn-test-generation
description: "Generate unit or integration tests from code, specs, or acceptance criteria. Use when adding test coverage, scaffolding TDD, or backfilling tests for existing code."
---

# Test generation

## When to use

- Adding test coverage to a module or function that has none.
- Scaffolding tests from acceptance criteria, specs, or existing code before implementing (TDD setup).
- Backfilling unit or integration tests for code that was written without them.
- Detecting and matching the project's test framework (Vitest, Jest, Playwright, pytest, etc.).

## Workflow

1. **Identify scope:** Module, function, or feature to test. If specs or acceptance criteria exist, use them as the contract.
2. **Match framework:** Detect or ask which test framework the project uses (Vitest, Jest, Playwright, Cypress, Mocha, pytest, etc.).
3. **Generate tests:**
   - Unit: one describe/test block per function or behavior; arrange-act-assert structure.
   - Integration: cover interactions between modules, APIs, or DB; use real or mocked dependencies per project convention.
4. **Run tests:** Execute the generated tests and fix failures (assertions, mocks, setup).
5. **Iterate:** Adjust coverage or add edge cases if the user requests more.

## Guardrails

- Do not generate tests that only assert implementation details (e.g. private method calls). Test observable behavior and outcomes.
- Use project conventions: file location (e.g. `*.test.ts` beside source or in `__tests__/`), naming, mocking style.
- Avoid flaky tests: no arbitrary sleeps; use deterministic waits and explicit assertions.
- When backfilling, prefer behavior over implementation; refactor code if needed to make it testable.

## Output

- Test file(s) in the correct location
- Tests passing after generation (or a clear list of fixes needed)
- Brief summary of what is covered and what is not
