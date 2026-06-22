# Orchestration Philosophy — Reference

Execution framework for applying the rulebook. For the core philosophy and Do/Don't rules, see [SKILL.md](SKILL.md).

---

## Orchestration Audit Workflow (run in order)

### Phase 1 | Discovery Audit

- Was discovery run before build? (or skip explicitly confirmed?)
- Are technical, security, design, and requirements covered?
- Were critical items (security, auth, data) asked—not inferred?
- Is spec saved to `docs/discovery/`?
- Was confirmation gate presented before proceed?

**Pass criteria:** Discovery complete; critical items explicit; user confirmed before proceed.

---

### Phase 2 | Prior Art Audit

- Was prior art research run (or explicitly skipped)?
- Are findings documented in plan header?
- If adapting: is first task clone/init + align?
- Is "Build from scratch" or "Adapting: [URL]" stated?

**Pass criteria:** Prior art considered; plan states source.

---

### Phase 3 | Plan Audit

- Is plan saved to `docs/plans/`?
- Does header include discovery ref and prior art ref?
- Are tasks bite-sized (2–5 min)?
- Are file paths exact?
- Is code complete (not "add X")?
- Are verification steps with exact commands included?

**Pass criteria:** Plan enables zero-context execution.

---

### Phase 4 | Gate Audit

- Was confirmation requested before implementation?
- Was execution choice offered (full loop vs manual)?
- Is next step clearly stated?

**Pass criteria:** No auto-proceed before user approval; handoff clear.

---

## Agent Templates (copy-paste)

### Discovery Spec Header

```
# [Feature/Project] Discovery Spec
Date: YYYY-MM-DD
Slug: <slug>

## Technical
Stack:
Scope:
Platform:
Persistence:
Prior art: yes/no

## Security (ask—never infer)
Data sensitivity:
Auth:
Compliance:
Threat surface:

## Design
Purpose:
Target users:
Tone:
A11y:
Differentiation:

## Requirements
Core functionality:
Success metrics:
Constraints:
Assumptions:

## Scope
Delivery tier: MVP | full
Out-of-scope:
```

### Plan Header

```
# [Feature] Implementation Plan

Discovery ref: docs/discovery/YYYY-MM-DD-<slug>.md
Prior art: docs/research/YYYY-MM-DD-<slug>-prior-art.md | Adapting: [URL] | Build from scratch

Goal:
Architecture:
Tech stack:
---
```

### Plan Task Template

```
### Task N: [Name]

Files:
- Create: path/to/file.ts
- Modify: path/to/existing.ts:123-145
- Test: tests/path/to/test.ts

Step 1: [Action]
[Code block]

Step 2: Verify
Run: [exact command]
Expected: [exact result]

Step 3: Commit
git add ... && git commit -m "feat: ..."
```

---

## Red Flag Checklist (fast QA)

Fail the orchestration if any are true:

- [ ] Build started without discovery (and no explicit skip)
- [ ] Security/auth/data sensitivity inferred rather than asked
- [ ] No user-approval gate before proceed
- [ ] Plan has "add X" without actual code
- [ ] Plan has no exact file paths
- [ ] No per-task verification command in the plan
- [ ] Prior art skipped without user confirmation
- [ ] Scope or out-of-scope undefined
- [ ] Assumptions scattered across multiple docs
- [ ] Handoff without clear next step
