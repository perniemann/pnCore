---
name: pn-migration-planning
description: Plan upgrade paths for frameworks and packages (Next 14→15, React 18→19, Node, etc.). Use when upgrading major versions or migrating stacks.
---

# Migration planning

## When to use

- Upgrading frameworks (Next.js, React, Astro, Node)
- Migrating between stacks (e.g. CRA to Next, vanilla to React)
- Package major-version upgrades with breaking changes
- User asks "how do I upgrade X to Y"

## Workflow

1. **Identify source and target:** Current versions and target versions (from package.json, lockfile, or user input).
2. **Research:** Use prior-art research (pn-prior-art-research) or official migration guides. Check changelogs, codemods, and community reports.
3. **Create plan:** Bite-sized steps in dependency order. Example: upgrade transitive deps first, then framework, then app code.
4. **List breaking changes:** From official docs; map each to affected files or patterns.
5. **Order steps:** One step per breaking change or logical phase; include verification (tests, build) after each phase.
6. **Output:** Migration plan document (e.g. `docs/plans/YYYY-MM-DD-migrate-next-15.md`) with steps, risks, and rollback notes.

## Guardrails

- Do not infer migrations; use official guides and changelogs.
- Include codemod commands when available (e.g. `npx @next/codemod`).
- Flag high-risk steps (e.g. data model changes, API contract changes).
- Recommend running tests after each phase.

## Output

- Migration plan with numbered steps
- Breaking changes mapped to fixes
- Verification checkpoints
- Rollback or branch strategy when risky

## Integration

- **pn-deprecation-and-removal** — sunsetting **product APIs, features, or flags** and zombie code; this skill is **stack/version upgrades** (e.g. Next 14→15). Big refactors may need both.
- **pn-source-driven-implementation** — official migration guides per detected versions.
