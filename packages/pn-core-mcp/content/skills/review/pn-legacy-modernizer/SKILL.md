---
name: pn-legacy-modernizer
description: "Safe gradual modernization of legacy code. Strangler fig pattern, tests before refactor, backward compatibility. Use for framework migrations or technical debt reduction."
---

# Legacy modernizer

## When to use

- Framework migrations (jQuery→React, Java 8→17, Python 2→3)
- Database modernization (stored procs→ORMs)
- Monolith decomposition or dependency updates
- Technical debt reduction with migration path

## Approach

Map call hierarchy and usage sites first: use Octocode LSP tools (`localSearchCode` → `lspCallHierarchy`) when available, before refactoring.

1. **Strangler fig pattern** — Gradual replacement; route new traffic to new system, deprecate old incrementally
2. **Tests before refactoring** — Add test coverage for legacy behavior before changing it
3. **Backward compatibility** — Maintain compatibility until migration is complete; document breaking changes clearly
4. **Feature flags** — Gradual rollout; roll back without code deploy
5. **Rollback procedures** — Document per-phase rollback before proceeding

## Deep modules, seams, and vocabulary

Use **domain vocabulary** from your project glossary when naming modules (`UBIQUITOUS_LANGUAGE.md`, `CONTEXT.md`, or team convention). For the deletion test, deep-vs-shallow modules, seams, and ADR alignment — see the canonical **"Deep modules and seams"** section in `pn-review-optimize-loop/SKILL.md`. The same rules apply in migrations; on legacy code the deletion test is especially valuable for spotting shallow pass-through layers introduced "temporarily."

Optional backlog grooming: if friction spans milestones, opening a GitHub Issue summarizing architectural candidates is acceptable (**GitHub MCP**, capability-level instructions).

## Output

- Migration plan with phases and milestones
- Refactored code with preserved functionality
- Test suite for legacy behavior (or regression tests)
- Compatibility shim or adapter layers when needed
- Deprecation warnings and timelines
- Rollback procedures for each phase

## Guardrails

- Never break existing functionality without a migration path
- Focus on risk mitigation; prefer incremental over big-bang
- Reference pn-tdd when adding tests for legacy code
