---
name: pn-tdd
description: Enforces test-driven development: RED-GREEN-REFACTOR; production code only after a failing test. Use when implementing features or fixes with TDD.
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
