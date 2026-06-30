---
program: auth-refactor-2026-06-30
slice: S1
date: 2026-06-30
checker:
  kind: task
  task_id: checker-task-1
  artifact: docs/audits/checker-2026-06-30-s1.md
review_panel:
  risk: auth
  bugbot:
    task_id:
    artifact:
  security_review:
    task_id: sec-task-1
verify:
  - cmd: npm test
    exit: 0
user_continue:
  at: 2026-06-30T10:00:00Z
---

### Acceptance

| Criterion | Status | Evidence |
|-----------|--------|----------|
| Login flow | PASS | auth.spec.ts |
