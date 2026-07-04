---
name: pn-loop
description: "Autonomous iteration until verification passes. Keep working on the same task, re-running verification commands each turn, until they succeed. Use for fix-until-green, migration completion, or any task with clear verification criteria."
---

# Loop

## Overview

**pn-loop** runs an autonomous fix-until-pass cycle: work on the task, run verification, if it fails then fix and repeat. Completion is determined by **verification command output**, not by self-declared phrases. This aligns with pn-verification-before-completion: evidence before claims.

Inspired by the Ralph Wiggum technique but uses pnCore's verification-first approach: the loop ends when the verification command succeeds, not when the agent says "done."

## When to use

- **Fix CI until green** — Run CI/tests each turn; fix failures; repeat until pass.
- **Get tests passing** — Run test command; fix failures; repeat until 0 failures.
- **Complete a migration** — Run migration verification; fix issues; repeat until clean.
- **Build until success** — Run build; fix errors; repeat until exit 0.
- Any task with **clear, runnable verification** and a known success condition.

**Not a good fit:** Tasks needing human judgment, ambiguous goals, or no single verification command.

## Workflow

1. **Define verification** — Identify the command that proves success (e.g. `npm test`, `npm run build`, `npx playwright test`). State the expected output (e.g. "0 failures", "exit 0").

2. **Work** — Implement or fix the task using relevant skills (pn-ci-fix, pn-tdd, pn-systematic-debugging, etc.).

3. **Verify** — Run the verification command. Read full output and exit code.

4. **Decide**
   - **Pass:** Verification output confirms success → task complete. Use pn-verification-before-completion: state the evidence, then claim done.
   - **Fail:** Verification shows failures → fix the issues, then go to step 3. Do not claim done.

5. **Safety limit** — If a max iteration count is specified (e.g. 10), stop after that many verification attempts and report remaining issues. Do not loop indefinitely without a cap when the user expects one.

## Key principles

- **Verification is the gate** — The loop ends when the verification command succeeds. No shortcuts.
- **Re-run verification each turn** — Fresh run, full output. No "should pass" or extrapolation.
- **Fix, then verify again** — After each fix, run the verification command again before claiming anything.
- **Evidence before completion** — Follow pn-verification-before-completion: run the command, read output, then state result.

## Example prompt pattern

```markdown
Run a pn-loop until CI is green.

**Task:** Fix the failing tests in src/auth/.

**Verification:** `npm test` — success = 0 failures, exit 0.

**Max iterations:** 10. If still failing after 10 attempts, report remaining failures and stop.
```

## Guardrails

- **pn-verification-before-completion** — The loop uses this for the completion gate. Before claiming done, run verification and confirm output.
- **pn-review-optimize-loop** — Single pass (review then optimize, fix once). pn-loop is multi-pass until verification succeeds.
- **pn-ci-fix / pn-ci-triage** — Use these inside the loop when interpreting CI failures and deciding fixes.
- **pn-systematic-debugging** — Use when failures need reproduce → isolate → fix → verify.

## Output

- Each iteration: what was fixed, verification command output, pass/fail.
- Final: verification evidence (command output, exit code) and confirmation of completion, or prioritized fix list if stopped at max iterations.
