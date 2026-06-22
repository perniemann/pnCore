# Engineering Discipline Philosophy — Reference

Execution framework for applying the rulebook. For the core philosophy and Do/Don't rules, see [SKILL.md](SKILL.md).

---

## Discipline Audit Workflow (run in order)

### Phase 1 | TDD Compliance Audit

- For each feature/fix: was there a failing test first?
- Are tests run after every change?
- Is refactor done only when green?
- Are behaviors covered by tests?

**Pass criteria:** No production code without preceding failing test; tests run frequently.

---

### Phase 2 | Debugging Discipline Audit

- For recent fixes: was root cause confirmed before fix?
- Was there a reproduction (steps, test, env)?
- Was the failure isolated to smallest unit?
- Was hypothesis kept to one at a time?

**Pass criteria:** No guess-and-patch; evidence-based fixes.

---

### Phase 3 | Planning Audit (for multi-step work)

- Is scope defined before implementation?
- Are tasks bite-sized (2–5 min)?
- Are file paths exact?
- Is code complete in plan (not "add X")?
- Are verification steps included?

**Pass criteria:** Plan enables zero-context execution; verification defined per step.

---

### Phase 4 | Verification Audit

- Are tests run before completion claims?
- Is output read and confirmed?
- Are there flaky tests (quarantined or fixed)?
- Is CI passing?

**Pass criteria:** No "should work" without execution; flakiness addressed.

---

## Agent Templates (copy-paste)

### TDD Cycle Block

```
Behavior:
Failing test (code):
Run command:
Expected failure:
Minimal implementation:
Refactor (if any):
```

### Debugging Block

```
Reproduction:
Isolation (smallest unit):
Hypothesis:
Expected if true:
Confirmation method:
Fix:
Verification:
```

### Plan Task Block

```
Task:
Files (exact paths):
Steps (numbered):
Code (complete):
Verification command:
Expected result:
```

---

## Red Flag Checklist (fast QA)

Fail the discipline if any are true:

- [ ] Production code written without preceding failing test
- [ ] Fix applied without confirmed root cause
- [ ] Multiple hypotheses "fixed" in one change
- [ ] "Should work" claimed without running tests
- [ ] Plan has "add X" without actual code
- [ ] No verification step for completed work
- [ ] Flaky tests left untreated
- [ ] Scope expanded without new test/plan
- [ ] Commit mixes unrelated changes
- [ ] Refactor without green tests
