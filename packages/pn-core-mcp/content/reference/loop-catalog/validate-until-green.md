# Loop: Validate until green (`validate-until-green`)

**Risk:** green · **Schedule:** manual or `/loop 5m` while watching · **Default tier:** standard

Wraps the **`pn-loop`** skill with catalog STATE and paste-proof completion.

## Goal

Fix the scoped task until `npm run validate` (or project equivalent) exits 0.

## Boundaries

- One task scope per run (named in STATE Meta).
- Max 10 verification rounds unless user raises cap.
- No scope creep beyond the named task.

## STATE path

`.pncore/loops/validate-until-green/STATE.md`

## Verification

```bash
npm run validate
```

## Prompt

```markdown
Load get_skill("pn-loop") and pn-core://reference/loop-catalog/validate-until-green.md.

Task: <describe in STATE Meta>

Verification: `npm run validate` — exit 0.
Max iterations: 10.

Maintain `.pncore/loops/validate-until-green/STATE.md` each round.

Completion (paste-proof): paste full validate output showing exit 0 before claiming done.
```

## Stop

Verification exit 0, or max iterations with prioritized remaining failures in STATE.
