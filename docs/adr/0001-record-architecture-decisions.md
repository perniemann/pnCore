---
title: "ADR-0001: Record architecture and product decisions"
updated: 2026-04-22
---

# ADR-0001: Record architecture and product decisions

## Status

Accepted

## Context

pnCore ships orchestration, skills, and MCP content. As the system grows, rationale for non-obvious choices (workflows, content layout, tool boundaries) can live only in chat or implicit code. That raises **bus factor** and makes handoff harder. Industry practice: lightweight Architecture Decision Records (ADRs), as described by Michael Nygard, to log decisions in version control.

## Decision

- Use `docs/adr/NNNN-short-title.md` (four-digit number, kebab-case title).
- New decisions get the next free number. Keep each ADR short: **Status, Context, Decision, Consequences** (Nygard template).
- Record decisions that would surprise a new maintainer or that we would need to re-argue in six months (new workflow phase, breaking MCP behavior, content ownership rules, etc.).

## Consequences

- **Positive:** Shared memory for *why* something is the way it is; better onboarding; aligns with `CONTRIBUTING.md` and discipline/orchestration philosophies.
- **Negative:** Slight process overhead. Mitigation: only document non-obvious calls; one screen per ADR is enough.

## References

- Michael Nygard, "Documenting Architecture Decisions" (2011) — Nygard ADR template
- [CONTRIBUTING.md](../../CONTRIBUTING.md) for repo layout and where decisions live
