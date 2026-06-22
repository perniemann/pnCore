---
title: "ADR-0005: Marketing UI design intent and ship gates (Taste parity v1)"
updated: 2026-06-04
---

# ADR-0005: Marketing UI design intent and ship gates (Taste parity v1)

## Status

Accepted

## Context

External **Taste Skill** ([Leonxlnx/taste-skill](https://github.com/Leonxlnx/taste-skill), MIT) packages anti-slop frontend guidance as a large single `SKILL.md` with brief inference, numeric tuning dials, and mechanical pre-flight checks. pnCore already covers anti-slop via `pn-frontend-design`, `pn-aesthetics-baseline`, and `pn-frontend-design-philosophy`, plus orchestration in `pn-design` and studio-specific `embedded-studio-dna`.

Gap: marketing and portfolio surfaces still drift generic because agents lack a **mandatory, lightweight intent declaration** (Design Read + dials) and a **pass/fail ship gate** integrated into the design workflow—not another 1,200-line monolith.

## Decision

**v1 (this ADR):**

1. Add two MCP references (progressive disclosure, not mega-skills):
   - `pn-core://reference/design-intent.md` — Design Read, `DESIGN_VARIANCE` / `MOTION_INTENSITY` / `VISUAL_DENSITY` dials, aesthetic presets.
   - `pn-core://reference/marketing-ship-gate.md` — tiered pre-flight (`standard` | `strict` | `studio`), AI Slop Test integration, project-truth overrides.
2. Extend `pn-frontend-design-philosophy/reference.md` with **Phase 0 — Design intent** (loads design-intent; maps dials to page mode).
3. Wire **`pn-design`** plan step: mandatory Design Read + three dial values; build step: `pn-preflight` for marketing page modes.
4. New command **`pn-preflight`** — emits PASS/FAIL table against marketing-ship-gate.
5. Optional `.pncore-design.md` field `Tuning dials` (variance / motion / density) when teams want persisted defaults.

**Non-goals (v1):**

- Cloning Taste’s full skill or maintaining banned-hex lists as the only guard.
- `pn-comp-board` / image-first pipeline (deferred v2).
- CI heuristic scanner for anti-slop patterns (deferred v2).
- Replacing `embedded-studio-dna` or shrinking product/dashboard scope of philosophy.

**Companion skills:** Teams may install Taste Skill via `npx skills add https://github.com/Leonxlnx/taste-skill` for verbatim dials/GSAP recipes. **`.pncore-design.md` and pnCore workflow gates take precedence** on conflict.

**Attribution:** Dial and brief-inference concepts are industry-common; pnCore tables are native formulations informed by public anti-slop practice, not verbatim copies of third-party skill text.

## Consequences

- **Positive:** Marketing UI runs declare intent before code; strict tier catches template UI mechanically; philosophy Phase 0 avoids duplicate scoring systems.
- **Negative:** Extra plan bullets on every `pn-design` run. Mitigation: skip dial re-declaration when `.pncore-design.md` already lists tuning dials and page kind is unchanged.
- **Audit:** ADR-0002 quarterly pass includes `design-intent.md` and `marketing-ship-gate.md`.
- **MCP workflow:** `workflow_step("design", …)` plan and build steps must load design-intent and run `pn-preflight` for marketing modes (parity with `pn-design` command).

## v1 success criteria

One dogfood `pn-design` run on a landing brief produces: (1) Design Read line, (2) three dial integers, (3) plan page mode, (4) `pn-preflight` PASS or enumerated FAIL fixes before done.

## References

- [ADR-0002: Quarterly skill and rule audit cadence](0002-skill-rule-audit-cadence.md)
- `packages/pn-core-mcp/content/reference/design-intent.md`
- `packages/pn-core-mcp/content/reference/marketing-ship-gate.md`
- `packages/pn-core-mcp/content/commands/pn-design.md`
