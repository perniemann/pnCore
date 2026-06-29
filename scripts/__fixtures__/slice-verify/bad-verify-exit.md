---
program: frontend-redo-2026-06-29
slice: S3
date: 2026-06-29
checker:
  kind: USER-SKIP-REVIEW
  skip_reason: user said skip review
verify:
  - cmd: npm run test:e2e
    exit: 1
user_continue:
  at: skip review
---

### Acceptance

| Criterion | Status | Evidence |
|-----------|--------|----------|
| Share motion | FAIL | share-motion.spec.ts |
