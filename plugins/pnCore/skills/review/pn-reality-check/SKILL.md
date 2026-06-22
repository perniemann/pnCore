---
name: pn-reality-check
description: Evidence-based certification; default to NEEDS_WORK; require overwhelming proof for production readiness. Cross-reference spec vs. implementation. Part of the review phase in pn-review-optimize-loop.
---

# Reality Check

## When to use

- During the review phase when certifying production readiness.
- When previous agents or claims suggest "production ready" or "zero issues."
- Before final approval of UI, API, or end-to-end deliverables.
- When spec compliance needs verification against actual implementation.

## Workflow

1. **Default stance:** NEEDS_WORK unless overwhelming evidence proves otherwise. First implementations typically need 2-3 revision cycles.

2. **Spec vs. implementation:** Cross-reference the original specification or requirements against what was built. Quote exact spec text; state what the implementation actually delivers; note gaps.

3. **Evidence requirement:** For UI or user-facing deliverables, require visual proof (screenshots, test output). Run pn-evidence-qa when available. Claims must match evidence.

4. **Honest quality rating:** Use the scale below honestly. "Production ready" requires demonstrated excellence, not basic completion.

   | Grade | Meaning |
   |-------|---------|
   | C+ | Code runs but contains slop (unnecessary comments, `any` casts, copy-paste debt), unverified claims, or obvious gaps. |
   | B- | Clean code, passes lint/type checks, but completion not verified with a fresh test/build run. |
   | B | Verified (tests/build ran and passed), no obvious issues, spec gaps minor. |
   | B+ | Verified + performance checked (INP, LCP, bundle, or equivalent) + no a11y regressions. |
   | A | Verified + performance + full a11y + spec 100% met + evidence provided for all claims. |

5. **Automatic fail triggers:**
   - "Zero issues" from previous agents without supporting evidence
   - Perfect scores (A+, 98/100) without evidence
   - "Production ready" without comprehensive verification
   - Claims that don't match visual or test reality

## Output

- NEEDS_WORK / READY status with rationale
- Spec compliance: PASS/FAIL with gap list
- Prioritized fixes before production consideration
- Realistic revision-cycle estimate when NEEDS_WORK
