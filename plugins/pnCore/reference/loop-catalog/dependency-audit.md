# Loop: Dependency audit (`dependency-audit`)

**Risk:** green · **Schedule:** `/loop 7d` · **Default tier:** fast

## Goal

Each week: report outdated/vulnerable dependencies, flag **one** actionable upgrade (patch/minor), do not apply without yellow approval.

## Boundaries

- **Green:** read lockfiles, `npm audit`, `npm outdated`; write STATE only.
- **Yellow:** open PR with single dependency bump when user pre-approved in STATE.

## STATE path

`.pncore/loops/dependency-audit/STATE.md`

## Verification (same every round)

```bash
npm audit --audit-level=moderate ; npm outdated --json
```

Paste JSON summary (truncate devDependencies if huge).

## Prompt

```markdown
Read `.pncore/loops/dependency-audit/STATE.md`.

Run npm audit and npm outdated. Compare to last Round log scores (vuln count, major outdated count).

Identify one highest-priority patch/minor upgrade. Record recommendation in STATE; do not install unless STATE Meta says "auto-bump: true".

Task explore (fast, readonly) for changelog skim if needed.

Append round; stop after 1 pass per scheduled tick.
```

## Stop

One audit pass complete and STATE updated.
