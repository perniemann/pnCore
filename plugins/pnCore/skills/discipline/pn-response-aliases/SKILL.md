---
name: pn-response-aliases
description: "Expand whole-token response aliases (scr, eli, foc, ref, scp) into compression, simplify, focus, reference-point rewrite, or scope-lock instructions. Use when the user types those aliases or asks to shorten/refocus the last answer."
---

# Response aliases

## When to use

- User message is (or contains as a whole token) `scr`, `eli`, `foc`, `ref`, or `scp`
- User asks to compress, simplify, or scope-lock the previous assistant reply
- Rule `pn-communication-contract` is loaded and points here

## Mission

Treat matching aliases as if their expansions were given directly. Rewrite or continue accordingly. Do not invent new aliases mid-session without documenting them.

## Exact-token rule

Expand only when the alias is a **whole token** (whitespace- or punctuation-bounded). Do **not** expand if the letters appear inside a longer word or identifier (e.g. `script`, `focus`, `refcount`, `scp-client`).

Case-insensitive match for the five aliases below.

## Alias table

| Alias | Expansion |
|-------|-----------|
| `scr` | Simplify, compress, and repeat your last response. Cut filler; keep facts and decisions. |
| `eli` | Explain like I am 18. Simplify language. Shorten the response. |
| `foc` | Focus on what matters most. What is the true signal and value? Boil down to the single most important point. |
| `ref` | Rewrite using reference points: `F#` findings, `D#` decisions, `O#` options, `R#` risks, `Q#` questions, `A#` actions. Preserve codes for the rest of the session. |
| `scp` | Scope lock: deliver only what was requested. Drop unsolicited cleanup, refactors, docs, or adjacent features. |

## Process

1. Detect whole-token aliases in the latest user message (may combine, e.g. `scr foc`).
2. Apply expansions in order listed if multiple; prefer the stricter compression when `scr` and `foc` both appear.
3. For `ref`, follow the reference-point protocol in **pn-context-engineering**.
4. For `scp`, do not widen work; if prior reply already over-scoped, rewrite to requested scope only.
5. Optionally load `get_rule("pn-communication-contract")` and `pn-core://reference/communication-contract.md` for tone examples.

## Guardrails

- Aliases reshape **communication**, not a license to skip verification or build gates.
- Do not expand aliases embedded in code, paths, or quoted strings the user is discussing as literals.
- If the user only sends an alias with no prior answer to reshape, ask what to apply it to — one short question.

## Integration

- **pn-communication-contract** — agent-requested rule; points here for aliases.
- **pn-context-engineering** — reference-point protocol (`ref`); session codes in handoff.
- **pn-budget-cost-monitor** — shorter completions cut output tokens; do not add always-on rules for this.

## Output

- The rewritten (or scoped) response only — no meta preamble about which alias fired unless the user asks.
