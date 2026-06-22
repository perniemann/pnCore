# Parallel Phase Rules

Reference for multi-specialist plans where `workflow_step` returns `parallel: true`.

## File ownership during parallel phases

| File | Owner | Rule |
|------|-------|------|
| `package.json` / `package-lock.json` | Scaffolder (Phase 1 only) | All `npm install` calls in Phase 1. Later specialists note "pre-phase dependency" — not added mid-run. |
| `tsconfig.json` / `jsconfig.json` | Scaffolder (Phase 1 only) | Set once. Others reference; do not modify. |
| `src/styles/globals.css` / `tokens.css` | Frontend developer | Scaffolder creates empty + `# OWNER: pn-frontend-developer` comment. Backend must not write here. |
| `.env` / `.env.example` | Backend developer | Scaffolder creates placeholder keys; backend fills values. Frontend reads; does not add keys. |
| `README.md` / `CHANGELOG.md` | Reviewer (post-parallel) | Updated after all specialist phases complete. |
| `next.config.*` / `astro.config.*` / `vite.config.*` | Scaffolder (Phase 1 only) | Set in Phase 1; specialists read, do not modify. |

## Encoding in the plan

Add a **"Parallel boundaries"** note at each parallel phase header:

```markdown
## Phase 2: Core features
<!-- Parallel boundaries: owns src/components/, src/styles/. Reads but does not modify package.json, tsconfig.json, next.config.* -->
```

## Post-parallel merge step (required when parallel: true)

Add a **"Phase N+1: Merge + conflict check"** task after all parallel phases:

```markdown
## Phase [N+1]: Merge + conflict check

### Task [N]: Run pn-merge-conflict-fix

**Steps:**
1. `git diff --name-only HEAD` — list modified files.
2. `git status | grep "both modified"` — check for conflicts.
3. If conflicts: `get_skill("pn-merge-conflict-fix")` and resolve.
4. `npm run build` — verify merged codebase compiles.
5. `git add . && git commit -m "chore: merge parallel specialist output"`

**Verification:** Build exits 0; no `<<<<<<<` markers in tracked files.
**Blocking:** Do not start review phase until this passes.
```

Omit when the plan has only one specialist or all specialists run sequentially.
