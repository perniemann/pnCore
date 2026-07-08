# Loop: Docs drift catcher (`docs-drift-catcher`)

**Risk:** green · **Schedule:** `/loop 7d` · **Default tier:** fast

## Goal

Find docs that contradict code (README commands, API paths, env vars). Fix **one** doc drift per round or file issue.

## Boundaries

- **Green:** read code + docs; patch docs only when explicitly allowed in STATE Meta.
- Prefer opening a STATE Open question over guessing API behavior.

## STATE path

`.pncore/loops/docs-drift-catcher/STATE.md`

## Verification

```bash
npm run check:context-index
```

Plus spot-check one doc claim against code (grep). Paste check output.

## Prompt

```markdown
Read STATE. Run check:context-index.

Pick one doc/code mismatch from prior audit or sample README vs package.json scripts.

Verify claim with grep/read. If drift confirmed and auto-fix allowed, patch doc only (surgical). Else log Open question.

Append round. One drift per tick.
```

## Stop

One pass per scheduled tick.
