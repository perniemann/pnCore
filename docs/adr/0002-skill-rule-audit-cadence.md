---
title: "ADR-0002: Quarterly skill and rule audit cadence"
updated: 2026-04-22
---

# ADR-0002: Quarterly skill and rule audit cadence

## Status

Accepted

## Context

pnCore ships a large content surface: many skills, rules, and reference documents; the MCP and model ecosystem (frameworks, tools, prompts) changes quickly. **Lehman's Laws** (among others) state that a software system that is used must keep evolving, or it becomes progressively less valid in a changing world. Ad-hoc maintenance risks silent rot: content that reads well but no longer matches runtime behavior, dependencies, or activation patterns.

`pn-continual-learning` already mines transcripts to update `AGENTS.md` and learned preferences; that addresses **inbound** learning from sessions. A complementary practice is required for **outbound** governance content (skills, always-apply rules, reference index).

## Decision

- Run a **quarterly audit pass** on high-leverage content: philosophy skills, always-apply rules, and the main reference set (e.g. `best-practices.md`, workflow norms).
- Record findings in `docs/refs/audit-YYYY-Qn.md` (one note per quarter, or a dated section within it). Stale, incorrect, or misleading items become issues or follow-up PRs, not drive-by edits in unrelated work.
- **First audit** is scheduled for the next calendar quarter boundary after this ADR lands; the note may be minimal ("no drift found" + spot-check list) or list concrete updates.

## Consequences

- **Positive:** Predictable maintenance cost; fewer surprises when a skill fire during a run but describes last year's stack; clear paper trail of when content was last reviewed; complements transcript-side learning.
- **Negative:** Process overhead. Mitigation: one pass per quarter, scope limited to high-leverage files; the audit is not a full rewrite of all skills.
- This ADR is **policy**, not automation: no new tooling is required; optional scripts or checklists can be added later.

## References

- [ADR-0001: Record architecture and product decisions](0001-record-architecture-decisions.md) — Nygard template and `docs/adr/` conventions
- `pn-discipline-philosophy` — *Maintain or rot (Lehman)*
- `pn-continual-learning` — transcript-based updates to `AGENTS.md` and user preferences
- [CONTRIBUTING.md](../../CONTRIBUTING.md) for repo layout and knowledge distribution
