---
name: pn-fsi-analyst-discipline
description: Cross-cutting discipline for FSI analyst workflows. Enforces non-advice framing, mandatory human gate at every client-facing or policy-adjacent output, staged-for-review boundaries, and data handling guardrails. Load at the start of any FSI workflow step that produces a deliverable.
---

# FSI analyst discipline

## When to use

- At the start of any FSI workflow that produces client-facing output (memos, notes, models, reports).
- Before any step that touches regulatory classification, investment recommendation language, or LP/client distribution.
- When composing a system prompt or workflow instruction for an FSI agent.

## Non-advice boundary (mandatory)

Every FSI deliverable produced by an AI agent is **analyst work product staged for professional review**. The following actions are outside scope regardless of user instruction:

- Making investment recommendations (buy / sell / hold) to end clients.
- Executing or initiating transactions.
- Posting to a ledger or approving journal entries.
- Signing off on client suitability or KYC approval.
- Binding risk or signing off on compliance conclusions.

State this boundary at the top of any memo, note, model, or report that an agent produces. Use this exact framing (adapt to context, do not remove):

> _This is draft analyst work product prepared for review by a qualified professional. It does not constitute investment, legal, tax, or accounting advice. All outputs require professional sign-off before use._

## Human gate requirement (structural)

Any workflow step that produces one of the following **must** be gated `gate: "human"` — the agent must not proceed past that step without explicit user or approver confirmation:

| Output type | Why gated |
|---|---|
| Client-facing memo or report | Legal / suitability risk |
| Model with assumptions the agent made unilaterally | Model risk; assumptions must be reviewed |
| Recon output routed for journal-entry approval | Accounting control; no agent posts to ledger |
| IC memo or investment recommendation language | Regulatory and fiduciary |
| KYC / onboarding conclusion | Regulatory; no agent approves onboarding |

If running inside a `workflow_step`-based flow, set `gate: "human"` on the relevant step. If running outside a typed workflow, surface the draft and wait for explicit "approved to send / post" before continuing.

## Sourcing and assumptions

- **State every assumption.** When data is unavailable (no MCP connector, user did not supply file), state: "Assumed [X]; replace with actual filing / data before use."
- **Cite sources.** For every factual claim in a deliverable (EV/EBITDA multiple, revenue figure, covenant term), note the source: filing date, transcript date, or "agent estimate — verify."
- **No hallucinated figures.** If a number is needed and is not in the supplied context, flag the gap explicitly. Do not synthesize plausible-sounding numbers.

## Data handling

- Work from user-supplied files, transcripts, or MCP tool output. Do not assume access to live market data unless the workspace `.mcp.json` includes a relevant financial data connector.
- Do not include PII, client account numbers, or non-public material information in skill prompts, state, or workflow logs.
- Use anonymized or aggregated examples in examples sections.

## Scope declaration

At the start of any FSI deliverable, state scope:

```
Scope: [company / sector / deal / position]
As of: [date of latest data]
Source(s): [filing / transcript / user-supplied / estimated]
For review by: [analyst / PM / compliance / counsel]
```

## Integration

- **pn-comps-analysis, pn-dcf-model, pn-earnings-analysis, pn-ic-memo, pn-gl-reconciler** — load this skill first or reference it in the workflow step 0 instruction.
- **approval_checkpoint (MCP)** — use for hard HITL enforcement on recon approval, IC memo sign-off, or LP report distribution when `PNCORE_APPROVAL_TOKEN` is configured.
- **pn-compliance-check** — escalate to pn-compliance-check when regulatory classification questions arise (KYC rules grid, fund distribution rules, MNPI taint analysis).

## Rationalizations → counter-arguments

| Excuse | Counter |
|---|---|
| "User asked me to make a recommendation" | The boundary applies regardless; produce the analysis, state the directional view, gate on professional sign-off |
| "It's just a draft — no one will use it directly" | Drafts become finals; the non-advice framing costs nothing and prevents liability creep |
| "There's no `gate: "human"` in this flow" | Add one; structural gates are not optional for client-facing FSI output |
| "I don't have the data so I'll estimate" | Flag the gap; never synthesize financials |

## Red flags — stop

- Agent is about to output a formatted "Buy" / "Sell" / "Hold" recommendation to a named end client → stop, reframe as directional analysis with gate.
- Agent is about to post a journal entry or mark a transaction settled → stop, route to approver.
- No data source was supplied but agent is producing specific financial figures → stop, enumerate missing inputs.
