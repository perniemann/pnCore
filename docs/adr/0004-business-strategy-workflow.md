---
title: "ADR-0004: Business strategy workflow"
updated: 2026-05-15
---

# ADR-0004: Business strategy workflow

## Status

Accepted

## Context

pnCore's existing workflows cover technical execution (design, full_dev, backend_audit) and domain-specific work (fsi_analyst_draft, engine_feature). No workflow addressed early-stage product and business strategy: problem validation, competitive framing, market sizing, and the question "should we build this at all?"

Users had two standalone commands — `/pn-pressure-test` (one-pass verdict) and `/pn-grill` (interactive interrogation) — but no structured multi-session workflow that combined evidence gathering, Socratic stress-testing, codebase-derived angle discovery, and a human-auditable lock gate before delivering a stakeholder-ready artifact.

A discovery + skeptic + grill session produced the following confirmed decisions:

1. **Discipline-first data sourcing with optional companion-MCP upgrade** — the workflow must run end-to-end using only host tools (WebSearch, WebFetch, localSearchCode). Companion MCPs (Tavily, FRED, Octocode) are auto-detected at runtime and upgrade evidence quality without being required.

2. **One `business_strategy` workflow with a conditional codebase-intake step** — `codebase_strategy` is not a separate workflow type. The repo-analysis path is step 1, skipped when `mode === "idea"`.

3. **`pn-pressure-test`'s 6-row scorecard as the single source of truth for verdict** — no competing rubric is introduced. Pain intensity, buyer clarity, urgency, differentiation, speed to validate, founder advantage.

4. **HTML primary + markdown machine-facing digest as deliverables** — the markdown digest is the canonical data source; the HTML brief is rendered from it. This aligns with `content/reference/human-facing-artifacts.md` (line 25: emit a companion digest for the next step).

## Decision

Add a `business_strategy` workflow type with the following architecture:

### Workflow structure (9 steps, 0-indexed)

| Index | Plan step | Gate | Conditional? |
|-------|-----------|------|-------------|
| 0 | Framing + mode detect | human | No |
| 1 | Codebase intake (`pn-codebase-to-strategy`) | human | Skip when `mode === "idea"` |
| 2 | Evidence gathering (companion-MCP-aware) | model | No |
| 3 | Strategic frame (market sizing, comps, JTBD, biz model, risks) | model | No |
| 4 | Grill discussion (`pn-grill`, Socratic) | human | No |
| 5 | Pressure-test verdict (`pn-pressure-test`) | human | Loop point |
| 6 | Skeptic challenge (`pn-skeptic-challenge`) | human | Skip when `includesImplementation !== true` |
| 7 | Verdict lock + user spot-check (`workflow_confirm`) | human | No |
| 8 | Deliver HTML brief + markdown digest | model | No |

### Reuse of `pn-pressure-test` scorecard as single source of truth

`pn-pressure-test`'s existing 6 rows are used directly. No new rubric, scorecard, or verdict-rubric reference doc is introduced. The orchestration skill (`pn-business-strategy-orchestration`) points to `pn-pressure-test` for the verdict gate.

### Companion-MCP optional layer (not env-coupled)

Companions are enumerated by tool-name prefix at runtime in steps 2–3. The detection logic lives in the orchestration skill content, not in environment variables. This ensures:
- Zero-config fallback (host-only runs are fully functional).
- Transparent provenance: every evidence entry records `companion` and `source_kind`.
- No hard dependency on any external service.

### Conditional steps via `requiredFromState`

Step 1 is skipped by the agent when `state.mode === "idea"` (documented in step instruction). Step 6 is skipped when `state.includesImplementation !== true`. The MCP server handles the Weak/Pivot routing at step 5 via dedicated logic in `getWorkflowStep`.

### Dual deliverable rationale

The markdown digest (`business-strategy-brief.md`) is written first because:
- It is the canonical machine-readable data source (parseable front-matter + tables).
- Future validators (e.g. `validate-strategy-brief.mjs`) can target markdown without re-parsing HTML.
- HTML is rendered from the markdown, making the pipeline reproducible.

The HTML brief (`business-strategy-brief.html`) is the human-facing primary:
- Single-file, inline CSS, no external fetch (offline and attachment-safe).
- Stakeholder section order matches the logical review flow.
- Design tokens from `.pncore-design.md` are substituted when present; otherwise `pn-core://reference/aesthetics-baseline.md` defaults apply.

### Evidence-log JSONL schema

Each claim is appended via `workflow_handoff_append` with:

```jsonc
{
  "kind": "evidence",
  "run_id": "string",
  "claim": "string",
  "source_url": "string",
  "retrieved_at": "ISO-8601",
  "quote": "string (verbatim from source)",
  "confidence_0_1": 0.0,
  "scorecard_row": "pain | buyer | urgency | differentiation | speed | founder | fatal_flaw | competition | market_size",
  "source_kind": "web | repo | user | doc",
  "companion": "octocode | tavily | brave | exa | fred | alpha_vantage | host_websearch | host_webfetch | host_localsearch | none"
}
```

The evidence gate at step 5 reads the log via `workflow_handoff_read` and blocks verdict lock if any of the 6 scorecard rows has zero entries.

### Honesty contract (mechanical vs. human)

1. **Mechanical — log existence**: verdict lock refuses to proceed without entries.
2. **Mechanical — scorecard-row coverage gate**: all 6 rows must have ≥1 entry.
3. **Mechanical — iteration cap**: Weak loops capped at 2; over-cap requires `approval_checkpoint`.
4. **Mechanical — Pivot terminates**: Pivot cannot be refined in-run; forces fresh start.
5. **Human-guaranteed — citation truthfulness**: audit gate at step 7 (`workflow_confirm` with confirm/revise/audit options). The workflow states this explicitly at every lock gate.
6. **Provenance transparency**: provenance breakdown (entries per companion) shown before lock.

## Non-goals

- **No new MCP tools** inside `pn-core-mcp`. Real-world data goes through host capabilities or auto-detected companion MCPs.
- **No JSON contract resource** in v1. The markdown digest's front-matter + parseable tables are sufficient machine-readability.
- **No `business-strategy-rubric.md` reference doc**. The rubric is `pn-pressure-test`'s 6 rows; the orchestration skill points there.
- **No `pn-business-strategy-evidence-gate.mdc` rule** in v1. Deferred until a downstream project uses `docs/strategy/**`.
- **No `codebase_strategy` workflow type**. Codebase intake is a conditional step inside `business_strategy`.
- **No changes to existing skeptic, verifier, or pressure-test contracts**.

## New files

| Path | Purpose |
|------|---------|
| `packages/pn-core-mcp/src/workflows.ts` | `WorkflowType` union + `businessStrategySteps` + `workflowSteps` registration + step-5 routing logic |
| `packages/pn-core-mcp/src/index.ts` | `workflowTypeEnum` entry |
| `packages/pn-core-mcp/content/reference/workflow-state-schema.md` | `business_strategy` section |
| `packages/pn-core-mcp/content/skills/orchestration/pn-business-strategy-orchestration/SKILL.md` | Conductor skill |
| `packages/pn-core-mcp/content/skills/review/pn-codebase-to-strategy/SKILL.md` | Repo → N≤3 candidate angles |
| `packages/pn-core-mcp/content/commands/pn-strategy.md` | Slash command entry point |
| `packages/pn-core-mcp/content/reference/templates/business-strategy-brief.md.template` | Machine-facing digest template |
| `packages/pn-core-mcp/content/reference/templates/business-strategy-brief.html.template` | Human-facing HTML brief template |
| `docs/companion-mcp-catalog.md` | Business Strategy Companions section |

## Consequences

**Positive:**
- Fills the "should we build this?" gap between idea and execution workflows.
- Evidence-log protocol makes fabrication visible at the audit gate.
- Codebase-to-strategy path lets teams derive positioning from existing code rather than blank-slate ideation.
- Companion-MCP auto-detection upgrades evidence quality without requiring env config.

**Negative:**
- 9-step workflow is the longest in the system; sessions may span multiple hours.
- HTML brief generation at step 8 adds latency vs. plain markdown output. Mitigation: markdown is written first and is usable standalone.
- Evidence-log coverage gate may surprise users who expect a quick verdict. Mitigation: the gate condition is documented in the command help and the step 5 instruction.

## References

- [ADR-0001: Record architecture decisions](0001-record-architecture-decisions.md)
- [ADR-0002: Quarterly skill and rule audit cadence](0002-skill-rule-audit-cadence.md)
- [ADR-0003: Governance without AGP protocol](0003-governance-without-agp-protocol.md)
- `packages/pn-core-mcp/content/reference/workflow-state-schema.md` — full state schema with field docs
- `packages/pn-core-mcp/content/reference/human-facing-artifacts.md` — dual deliverable rationale
- `docs/companion-mcp-catalog.md` — companion MCP install hints and roles
- Plan: `c:\Users\tool\.cursor\plans\business_strategy_workflow_63caa24a.plan.md`
