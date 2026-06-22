---
name: pn-business-strategy-orchestration
description: Conductor for the business_strategy workflow. Defines workflow state shape, companion-MCP detection, evidence-log protocol, HITL gate scripts, discussion-loop semantics, and explicit references to all sub-skills. Load at step 0 and keep loaded throughout the run.
---

# Business Strategy Orchestration

## When to use

- Loaded automatically by the `business_strategy` workflow (step 0). Do not load directly; use `/pn-strategy` or `workflow_step({ workflow_type: "business_strategy", ... })`.
- Referenced by all subsequent steps as the canonical behavioral contract for the run.

---

## Workflow identity

**Entry point:** `/pn-strategy` command (or `workflow_step("business_strategy", 0, {})`)
**Steps:** 9 (indices 0–8); two are conditional (step 1 on mode, step 6 on includesImplementation).
**Single source of truth for verdict:** `pn-pressure-test` 6-row scorecard (pain intensity, buyer clarity, urgency, differentiation, speed to validate, founder advantage). No competing rubric.
**Deliverables:** `docs/strategy/[slug]-strategy-brief.md` (machine-facing digest, canonical data source) + `docs/strategy/[slug]-strategy-brief.html` (human-facing stakeholder brief, built from the same evidence using its own template — not transformed from the markdown).

---

## Workflow state shape

```
business_strategy.mode                   : "idea" | "codebase" | "hybrid"
business_strategy.repoPath               : string (when mode != "idea")
business_strategy.framing                : { problem, audience, hypotheses[] }
business_strategy.candidates             : Array<{id, icp, value_prop_sentence, monetization_hypothesis, evidence_refs[file:line]}>
business_strategy.selectedAngle          : string  // candidate id chosen at step 1
business_strategy.evidenceLogPath        : string  // ".pncore/workflow-handoff.jsonl"
business_strategy.frames                 : { market_sizing, comps, jtbd, biz_model, risks }
business_strategy.includesImplementation : boolean
business_strategy.grillComplete          : boolean
business_strategy.discussionIterations   : number  // Weak loop counter; cap = 2
business_strategy.iterationCapApproved   : boolean // set after approval_checkpoint when cap exceeded
business_strategy.pressureTestVerdict    : "Strong" | "Weak" | "Pivot"
business_strategy.killCriteria           : string
business_strategy.firstTenCustomers      : string
business_strategy.skepticVerdict         : "proceed" | "revise" | "skipped"
business_strategy.verdictLocked          : boolean
```

Full schema with field-level documentation: `pn-core://reference/workflow-state-schema.md` (business_strategy section).

---

## Companion-MCP detection (run at steps 2 and 3)

Enumerate available tools in the current session and match by prefix:

| Role | Prefix / tool pattern | Fallback |
|------|-----------------------|----------|
| `codebase_intake` | `mcp_user-octocode_*` or `mcp_octocode_*` | host `localSearchCode` / `SemanticSearch` |
| `web_evidence` | Tavily (`tavily_*`), Brave (`brave_*`), Exa (`exa_*`) | host `WebSearch` / `WebFetch` |
| `market_data` | FRED (`fred_*`), Alpha Vantage (`alpha_vantage_*`) | host `WebFetch` + discipline flag |

Rules:
- Check availability before calling. Do not assume a companion is present.
- Pick the **first matching** companion per role in the order listed.
- Record the chosen companion in every evidence entry's `companion` field.
- When no companion is present for a role, use host tools and set `companion: "host_websearch"` or `"host_webfetch"` or `"host_localsearch"`.
- When `market_data` has no companion: flag uncited market stats with `[est.]`; refuse to fabricate TAM/SAM/SOM figures without a citation.

---

## Evidence-log protocol

Every factual claim becomes a JSONL entry appended via `workflow_handoff_append`:

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

**Evidence gate (enforced at step 5 before verdict lock):**
- Call `workflow_handoff_read` and group entries by `scorecard_row`.
- Each of the 6 scorecard rows (pain, buyer, urgency, differentiation, speed, founder) must have ≥1 entry.
- Any row with zero entries: return to grill (step 4) with `grillComplete: false` before running pressure-test.

**Skeptic gate (enforced at step 6 before delivery — step 8 cannot write the brief without this):**
- Group evidence entries by `kind`. **Each surviving angle (any angle not terminated by a Pivot verdict at step 5) must have ≥ 1 entry with `kind: "skeptic"`** in the evidence log.
- A `kind: "skeptic"` entry records the skeptic-challenge pass output for that angle: ≥ 2 alternative approaches considered, the inversion (pre-mortem) failure modes, and the proceed/revise verdict.
- Entries are appended via `workflow_handoff_append` with the same JSONL shape as `kind: "evidence"`, plus a `skeptic_verdict: "proceed" | "revise"` field and a `for_angle: "<angle_id>"` field.
- Any surviving angle missing a `kind: "skeptic"` entry: return to step 6 before step 8 is allowed to run. The brief MUST NOT ship with a "skeptic skipped" placeholder.

---

## HITL gate scripts

### Step 1 — Angle selection (codebase/hybrid mode)

Present N≤3 candidates from `pn-codebase-to-strategy`. Use `workflow_confirm` with options:
- One option per candidate id + one-sentence value prop
- "None of these — describe the angle I want"

Gate: do not proceed to step 2 until user selects or overrides.

### Step 5 — Verdict (pressure-test)

After presenting scorecard output, call `workflow_step(step=6)` with the verdict in state. The workflow server routes Weak/Pivot/Strong automatically.

### Step 7 — Verdict lock spot-check

Present the evidence count per scorecard row and per companion. Use `workflow_confirm` with exactly three labeled options:

1. **confirm** — "Lock verdict and proceed to delivery"
2. **revise** — "Send specific rows back to grill (state which rows)"
3. **audit** — "Show me 3 random citations with their verbatim quotes"

**Audit-default rule:** When the companion-MCP detection at step 2/3 found **no `market_data` companion** (FRED / Alpha Vantage absent — every market entry's `companion` field is `host_websearch`, `host_webfetch`, or `host_localsearch`), the orchestrator MUST pre-select **audit** as the default option in `workflow_confirm` and surface a notice:

> No `market_data` MCP companion was bound for this run; every market claim above is host-tool sourced. The default action is **audit** — you can confirm or revise after seeing the spot-check sample.

This is mechanical: no companion ⇒ audit-by-default ⇒ user must explicitly choose `confirm` after seeing the citations. The user retains all three options; only the default shifts.

When user selects **audit**: sample 3 entries from the log at random, display each as:
```
[N] Claim: <claim>
    Source: <source_url>
    Quote: "<quote>"
    Confidence: <confidence_0_1>
    Row: <scorecard_row> | Companion: <companion>
```
Then return to the same step 7 prompt.

State explicitly before any option:
> **Note:** This workflow guarantees auditable evidence, not absolute truth. Citation truthfulness depends on your spot-check here. A brief produced entirely from host WebSearch reads differently from one backed by a market-data MCP — and you can see the provenance breakdown above before locking.

---

## Discussion-loop semantics (Weak verdict)

When `pressureTestVerdict === "Weak"`:
1. Increment `discussionIterations` (starting at 0).
2. If `discussionIterations < 2`: return to grill (step 4) with `grillComplete: false`.
3. If `discussionIterations >= 2` and `iterationCapApproved !== true`: require `approval_checkpoint`. Emit error directing user to call it with `workflow_type: "business_strategy", workflow_step: 5`.
4. If `iterationCapApproved === true`: allow one more grill cycle; each additional cycle requires a new checkpoint.

**Pivot terminates cleanly**: a Pivot verdict cannot be silently refined. The run ends, the pivot-path artifact ships, and the user starts a fresh run for the new thesis.

---

## Sub-skill references

| Skill | Used at step | Role |
|-------|-------------|------|
| `pn-grill` | 4 | Socratic interrogation; one question at a time with recommended answers |
| `pn-pressure-test` | 5 | 6-row scorecard verdict (Strong/Weak/Pivot); single source of truth |
| `pn-skeptic-challenge` | 6 | Implementation plan stress-test (skipped when no roadmap) |
| `pn-evidence-qa` | 2–3 (optional) | Visual or document evidence capture when applicable |
| `pn-fsi-analyst-discipline` | 2–3 (when market_data companion absent) | Flag uncited estimates; refuse fabrication |
| `pn-market-research` | 3 | Market sizing and competitive landscape when needed |
| `pn-prior-art-research` | 3 | Solution/technology landscape when applicable |
| `pn-trend-research` | 3 | Emerging trend identification and market intelligence |
| `pn-codebase-to-strategy` | 1 | Repo → N≤3 candidate angles (codebase/hybrid mode only) |
| `canvas` (Cursor built-in, **external**) | 8 (optional) | IDE-bound live review of the brief; not shipped by pnCore — use only when Cursor's user-installed `canvas` skill is detected in the session |

---

## Honesty contract

1. **Mechanical — log existence**: the verdict-lock step refuses to proceed unless the evidence log contains entries.
2. **Mechanical — scorecard-row coverage gate**: all 6 rows must have ≥1 entry before verdict locks.
3. **Mechanical — skeptic coverage gate**: every surviving angle must have ≥1 `kind: "skeptic"` evidence entry before delivery (step 8). No "skeptic skipped" placeholders.
4. **Mechanical — audit-default on missing `market_data`**: when no `market_data` companion-MCP is bound, step 7 pre-selects the `audit` option in `workflow_confirm`. The user must explicitly override to `confirm`.
5. **Mechanical — iteration cap**: Weak loops capped at 2; over-cap requires `approval_checkpoint`.
6. **Mechanical — Pivot terminates**: Pivot cannot be refined in-run; forces fresh start.
7. **Human-guaranteed — citation truthfulness**: the audit path at step 7 is the only place fabricated or misquoted citations are detected. The workflow states this explicitly at every lock gate.
8. **Provenance transparency**: provenance breakdown (entries per companion) is shown at step 7 before lock. The user knows how many claims came from each source before confirming.
