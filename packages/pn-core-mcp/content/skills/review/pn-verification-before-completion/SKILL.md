---
name: pn-verification-before-completion
description: Requires running verification commands and confirming output before any success claim. Use when about to claim work is complete, fixed, or passing, before committing or creating PRs.
---

# Verification before completion

## Overview

Claiming work is complete without verification is dishonesty, not efficiency.

**Core principle:** Evidence before claims, always.

## The iron law

```
NO COMPLETION CLAIMS WITHOUT FRESH VERIFICATION EVIDENCE
```

If you haven't run the verification command in this message, you cannot claim it passes.

## The gate function

Before claiming any status or expressing satisfaction:

1. **Identify:** What command proves this claim?
2. **Run:** Execute the full command (fresh, complete).
3. **Read:** Full output, check exit code, count failures.
4. **Verify:** Does output confirm the claim?
   - If NO: State actual status with evidence.
   - If YES: State claim with evidence.
5. **Only then:** Make the claim.

Skip any step = lying, not verifying.

## Common failures

| Claim | Requires | Not sufficient |
|-------|----------|----------------|
| Tests pass | Test command output: 0 failures | Previous run, "should pass" |
| Linter clean | Linter output: 0 errors | Partial check, extrapolation |
| Build succeeds | Build command: exit 0 | Linter passing, logs look good |
| Bug fixed | Test original symptom: passes | Code changed, assumed fixed |
| Regression test works | Red-green cycle verified | Test passes once |
| Requirements met | Line-by-line checklist | Tests passing |

## Red flags — stop

- Using "should", "probably", "seems to"
- Expressing satisfaction before verification ("Great!", "Perfect!", "Done!", etc.)
- About to commit/push/PR without verification
- Trusting agent success reports
- Relying on partial verification
- **Any wording implying success without having run verification**

## Key patterns

**Tests:**
```
✅ [Run test command] [See: 34/34 pass] "All tests pass"
❌ "Should pass now" / "Looks correct"
```

**Regression tests (TDD red-green):**
```
✅ Write → Run (pass) → Revert fix → Run (MUST FAIL) → Restore → Run (pass)
❌ "I've written a regression test" (without red-green verification)
```

**Build:**
```
✅ [Run build] [See: exit 0] "Build passes"
❌ "Linter passed" (linter doesn't check compilation)
```

## When to use

Always before:
- Any variation of success/completion claims
- Any expression of satisfaction
- Committing, PR creation, task completion
- Moving to next task

## Output

Run the command. Read the output. Then claim the result. No shortcuts.
