# Loop: Flaky test hunter (`flaky-test-hunter`)

**Risk:** green · **Schedule:** manual after CI flake · **Default tier:** standard

## Goal

Reproduce a named flaky test, isolate, fix **one** root cause, verify with repeated runs.

## Boundaries

- Scope: single test file or describe block named in STATE.
- Run targeted test 3× per round before declaring fixed.

## STATE path

`.pncore/loops/flaky-test-hunter/STATE.md`

## Verification

```bash
npm test -- <path> --runInBand
```

Run 3 consecutive times; success = 3/3 pass. Paste all three summaries.

## Prompt

```markdown
Flaky target: <from STATE Meta>

Round:
1. Reproduce with 3 sequential runs; paste output.
2. If flake reproduced, one diagnostic change (quarantine timer, mock, race fix).
3. Re-run 3×; log in STATE.
4. Max 8 rounds.

Use pn-systematic-debugging inside loop. Checker Task (readonly, standard) on final diff if fix touches >1 file.
```

## Stop

3/3 passes on targeted test, or 8 rounds with hypothesis list in STATE Stuck.
