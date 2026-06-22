---
name: pn-discipline-philosophy
description: Defines engineering discipline: test-first, root-cause before fix, minimal change, measure-before-optimize, review/second look, evidence over guess. Use when implementing features, debugging, planning, or establishing development practices. Aligns with TDD, systematic debugging, and RCA practices (current).
---

# Engineering Discipline Philosophy

## Purpose

Use this as a discipline rulebook for:

- Test-driven development (TDD)
- Systematic debugging and root cause analysis
- Implementation planning and work breakdown
- Code quality and verification
- Minimal, evidence-based change

It unifies how to work: test-first, confirm-before-fix, incremental, verifiable.

## When to use

- Implementing features or fixes (TDD workflow)
- Debugging failures with unclear cause
- Planning multi-step implementation
- Establishing team or AI agent discipline
- Reviewing for guess-and-patch, untested changes, or scope creep

For workflow, audit checklist, and templates, see [reference.md](reference.md).

---

## Core Philosophy (non-negotiables)

### Test before production code

Do not write production code before a failing test. If production code exists without a failing test, remove it and write the failing test first. Red–Green–Refactor: smallest failing test, minimal code to pass, then refactor.

### Root cause before fix

Reproduce → Isolate → Hypothesize → Confirm. Do not guess-and-patch. One hypothesis at a time; confirm or reject before the next. Fix only after root cause is confirmed.

### Minimal change

Smallest change that fixes the problem. Prefer targeted fixes over broad edits. Refactor only after tests pass. No "while I'm here" scope expansion without a new test.

### Measure before optimize

No performance work without a recorded baseline. State the metric (LCP, INP, query ms, allocation count), the measured current value, and the target. Optimization without numbers is decoration. Profile → identify hot path → change → re-measure. Reject "should be faster" — show the delta.

**Goodhart's Law caveat.** Once a metric becomes a target (a KPI, a budget cap, a "must hit"), it stops being a measure of the underlying property — it measures only itself. Token usage, test count, lighthouse score, "skills loaded" — useful as feedback, dangerous as goals. When citing a metric, state whether it is feedback or target; never optimize a target without also tracking the property it was meant to proxy.

### Evidence over assumption

State what you expect to see if the hypothesis is true. Check it. If wrong, revise and repeat. If right, fix with verification. No fixes based on "probably" or "usually."

### Plan before code (complex work)

For multi-step work: define scope, prior art, tasks, and verification before implementation. Bite-sized tasks (2–5 min); exact file paths; complete code in plan; DRY, YAGNI, TDD.

### Verify before claim

Run tests, read output, confirm result before claiming done. No "should work" without execution. Use pn-verification-before-completion when completing a step.

### Maintain or rot (Lehman)

Working software degrades unless actively maintained. Skills, rules, references, and dependencies drift as the runtime world moves under them. Schedule explicit upkeep — quarterly audit of high-leverage content (philosophy skills, rules, reference index) — and treat "still works on my machine" as an unverified claim until re-checked. See `docs/adr/0002-skill-rule-audit-cadence.md`.

---

## Design Rulebook (Do / Don't)

### A) TDD Rules

**Do**

- Write the smallest failing test first
- Run the test; it must fail for the right reason
- Write minimal production code to pass
- Refactor only while tests are green
- One behavior at a time
- Run tests after every change

**Don't**

- Don't write production code before a failing test
- Don't add extra behavior while making a test pass
- Don't skip the refactor step when duplication appears
- Don't fix a bug without a failing test that reproduces it first

### B) Debugging Rules

**Do**

- Reproduce reliably (steps, env, or test)
- Isolate to smallest failing unit (binary search, divide-and-conquer)
- Form one concrete hypothesis at a time
- State expected outcome if hypothesis is true
- Confirm with inspection, log, or debugger
- Fix with minimal change; re-run to verify

**Don't**

- Don't guess-and-patch without confirmed root cause
- Don't fix multiple things in one change without isolating each
- Don't assume the fix works—run verification
- Don't trust "it was probably X" without evidence

### C) Planning Rules

**Do**

- Define scope before build
- Break work into bite-sized tasks (2–5 min each)
- Include exact file paths and complete code in plan
- Define verification for each step (exact command, expected output)
- Pull security assumptions and design tone from discovery
- Reference prior art when adapting

**Don't**

- Don't write "add validation" — write the actual code
- Don't assume context—plan for zero-context handoff
- Don't mix multiple behaviors in one task
- Don't skip verification steps in the plan

### D) Change Rules

**Do**

- Make targeted fixes
- Keep behavior unchanged when refactoring
- Add tests for new behavior
- Commit small, logical units
- Document non-obvious decisions
- Boy Scout cleanup is permitted only when **bounded**: (a) within files already in your diff, (b) trivial (lint, typo, dead-import), (c) covered by existing tests. Anything else is a separate commit

**Don't**

- Don't make "while I'm here" changes without a test
- Don't change multiple concerns in one commit
- Don't leave tests failing or commented out
- Don't defer verification to "later"
- Don't add caching, memoization, or indices without a measured baseline showing the bottleneck
- Don't delete code, config, files, skills, or rules you cannot explain — the cost of removal is unknown until you understand why it exists (Chesterton's Fence). Trace usage, ask, or leave it

### E) Integration Rules

**Do**

- Run full test suite before claiming done
- Use CI for automated verification
- Tag tests by module and risk
- Quarantine flaky tests; fix or remove
- Maintain versioned, seeded test data
- Use mocks for external dependencies

**Don't**

- Don't claim "tests pass" without running them
- Don't ignore flaky tests—quarantine and fix
- Don't assume environment parity without check

### F) Review Rules (Linus's Law)

**Do**

- Self-review the diff before requesting human review (read every changed line as a stranger would)
- For non-trivial changes, get one second pair of eyes (human or reviewer agent) — bugs are shallow with eyeballs
- Use a review checklist: tests pass, root cause confirmed, no scope creep, no commented code, no debug logs, no secrets
- Prefer small PRs reviewable in <10 minutes

**Don't**

- Don't merge your own non-trivial change without a second look (human, `pn-reality-check`, or reviewer agent)
- Don't squash review feedback into "cleanup" — address each comment with a commit or reply
- Don't claim "reviewed" without reading the diff

---

## Final Principle

The target is not "I think it works."

It is:

**Failing test first + confirmed root cause + minimal change + verification before claim.**

That is the rulebook.
