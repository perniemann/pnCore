---
name: pn-source-driven-implementation
description: Ground framework and library choices in official docs for the versions in the repo — detect stack, fetch authoritative sources, implement documented patterns, cite links. Use when correctness depends on vendor APIs, not for pure refactors or typos.
---

# Source-driven implementation

## When to use

- Implementing or fixing behavior that depends on a specific framework or library version
- Boilerplate that will be copied widely (auth, routing, data fetching, build config)
- User asks for "current" or "documented" patterns
- Training-data uncertainty: new major versions, niche APIs, recent deprecations

## When not to use

- Renames, moves, formatting, logic independent of vendor APIs
- User explicitly prioritizes speed over citation ("quick hack only")

## Process

1. **Detect stack and versions** from lockfiles and manifests (`package.json`, `pnpm-lock.yaml`, `Cargo.toml`, etc.). State them explicitly in one block.
2. **Fetch official sources** — docs, migration guides, release notes for **those** versions. Prefer primary sources over tertiary blogs.
3. **Implement** following the documented pattern; do not combine with undocumented shortcuts unless labeled **unverified experiment**.
4. **Cite** — include links (or doc paths) for non-obvious API usage so reviewers can verify.
5. **Flag gaps** — if docs are silent or ambiguous, say so and state the assumption.

```
STACK DETECTED:
- <name> <version> (from <file>)
→ Consulting: <official doc URL or section>
```

## Rationalizations

| Excuse | Reality |
|--------|---------|
| "I know how React/Next/etc. works." | Your cut-off date may predate their current defaults; verify. |
| "Blog post says to do X." | Tertiary; confirm against release notes or official guide. |
| "I'll cite docs after it works." | Citation during implementation catches wrong API before merge. |
| "Lockfile is wrong; I'll use latest mentally." | Implement for **committed** versions or request an upgrade path first. |

## Red flags — stop

- Implementing breaking API changes without reading the framework's migration section for the **target** version.
- No reproducible link when the user asked for documented behavior.

## Verification

- At least one **primary** doc reference for each non-trivial vendor call added or changed.
- Build/test passes **or** explicit list of what was not run and why.

## Guardrails

- **pn-prior-art-research** is for codebase, ecosystem, and patterns comparison — not a substitute for vendor docs on API correctness.
- Do not present blog opinion as vendor guidance without checking the official page.

## Integration

- **pn-prior-art-research** — complements: prior art for *what exists*; this skill for *what the vendor says*.
- **pn-migration-planning** — version jumps demand official migration sequences.
- **pn-testing-strategy** / **pn-tdd** — doc-backed code still needs tests at boundaries.

## Output

- Stack/version block, cited sources, implementation notes, and explicit **verified** vs **assumed** behaviors.
