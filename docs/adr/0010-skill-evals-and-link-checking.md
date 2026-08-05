# ADR-0010: Skill EVAL convention and offline link checking

## Status

Accepted — 2026-08-05 (amended 2026-08-05: promote offline link gate + new-skill EVAL requirement)

## Context

Remigiusz Samborski's "Behind the scenes: How we build, test, and scale Google Agent Skills" (Google Cloud Blog / X article, 2026-08-03) describes how Google keeps skill quality at scale: standardized layout, prefer remote MCP tools, CI linters + link checkers, continuous evals (with/without skill; Accuracy × Efficiency), long-term ownership, and authoring support.

pnCore already has strong static validators (`validate-skill-schema`, SkillSpector, orphan checks), progressive disclosure via `list_skills` / `get_skill`, and quarterly rot audits ([ADR-0002](0002-skill-rule-audit-cadence.md)). Gaps relative to that article:

- No per-skill EVAL suite convention or scaffolder
- No offline checker for `pn-core://` and relative markdown links
- No documented MCP-over-CLI authoring rule
- No lightweight ownership field (and [ADR-0001 feature-program](0001-feature-program-workflow.md) rejected fragile ownership-glob enforcement)

A full continuous LLM eval harness (on-submit scoring + weekly regression jobs across frameworks) is valuable but invasive; it must not block this incremental governance step.

## Decision

1. **EVAL.yaml convention:** Document schema at `pn-core://reference/eval-convention.md`. `scripts/validate-eval-yaml.mjs` **fails** on malformed suites and on **newly added** `SKILL.md` without sibling `EVAL.yaml`. Missing suites on pre-existing skills remain advisory (backfill via ADR-0002 quarterly audits). Escape: `PNCORE_STRICT_EVALS=0`.
2. **Scaffolder:** `npm run scaffold:eval` writes a non-overwriting starter suite.
3. **Offline link checker:** `scripts/check-doc-links.mjs` checks `pn-core://` URIs and relative markdown links under `content/` and `docs/` (skips fenced code examples). **Fails by default** on broken offline links; escape `PNCORE_STRICT_LINKS=0`. External URLs stay on a scheduled lychee workflow (`continue-on-error`), not PR-blocking CI.
4. **Ownership:** Optional `owner:` frontmatter + docs. **No CODEOWNERS** until real GitHub teams exist.
5. **Author guidance:** `pn-writing-skills` and `best-practices.md` state prefer remote MCP tools over CLI/API, progressive-disclosure size advisory (~400 lines), and EVAL requirements for new skills.
6. **Wire into `validate-parallel`** so `npm run validate` / `test:full` always run these scripts.
7. **Still out of scope:** Runtime LLM scoring / weekly automated skill regressions; mass stub backfill of all skills; promoting unrelated schema section warnings to errors; changing `agents-internal` sync.

## Consequences

**Positive:** Closes the largest documented gaps (evals convention, link hygiene, MCP-first authoring, ownership signal) without breaking the existing skill-schema error set or sync contract. Offline links and new-skill EVAL suites are now merge gates. Pilots prove the EVAL format.

**Negative:** Pre-existing skills may still lack EVAL.yaml until quarterly backfill. Lychee remains non-blocking for external URLs. A full LLM with/without harness is still deferred (needs runner, scoring, baselines, and CI budget).

## References

- Remigiusz Samborski, [Behind the scenes: How we build, test, and scale Google Agent Skills](https://cloud.google.com/blog/topics/developers-practitioners/behind-the-scenes-how-we-build-test-and-scale-google-agent-skills) (2026-08-03); X: https://x.com/RemikSamborski/article/2084285529651093530
- [ADR-0002](0002-skill-rule-audit-cadence.md) — quarterly audit cadence (policy, not automation)
- [ADR-0001 feature-program](0001-feature-program-workflow.md) — ownership glob validator rejected
- `packages/pn-core-mcp/content/reference/eval-convention.md`
