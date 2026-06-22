---
name: pn-session-retro
description: Run a blameless retrospective on an agent transcript. Classify mistakes under a 5-code taxonomy, emit a structured report at docs/refs/retros/, and recommend concrete hardening. Use after a session that felt off, before a quarterly audit, or via the /pn-retro command. v1 is manual-only; cross-session pattern counters and auto-trigger are deferred to v2.
---

# Session retro

**When used as a standalone skill, begin every response with** `[pn-skill] 🔺`

## When to use

- After a session that felt off (user corrected the agent more than usual, work was reverted, tests were skipped, a hallucinated file path appeared).
- Before a quarterly skill/rule audit (see [ADR-0002](../../../../../../docs/adr/0002-skill-rule-audit-cadence.md)) to provide evidence rather than memory.
- Invoked by the `/pn-retro` command, or directly by the user ("run pn-session-retro on the last session").
- **Not** when the user is asking for a code review or an artifact-level check — use `pn-review`, `pn-reality-check`, `pn-evidence-qa`, or `pn-deslop` instead.

## Mission

Produce a **blameless, evidence-anchored retro** of a single session (or a small window of recent sessions). Classify what the agent did wrong using a 5-code taxonomy, ground every finding in a verbatim quote from the transcript, and recommend the smallest concrete action that would prevent the mistake next time. **Do not** commit retro-driven edits to SKILL.md, rules, or `AGENTS.md`; only recommend changes in the report.

Tone matches SRE blameless-postmortem tradition (Google SRE Book Ch. 15): the system failed, not the human. Findings describe behaviour, not intent.

## Inputs

- **Transcript root**: `<project>/.cursor/projects/<workspace-id>/agent-transcripts/<uuid>/<uuid>.jsonl` (parent transcripts only; subagent transcripts under `subagents/` are evidence, not primary scope).
- **Default scope**: the most recent parent transcript with `lastWriteTime` older than now (i.e. the just-finished session).
- **Optional flags** (passed from `/pn-retro`): `--since=<YYYY-MM-DD>`, `--scope=session|recent|all`. `recent` = last 5 parent transcripts; `all` = every parent transcript modified since the last retro report.

Transcripts are JSONL with `{role: "user" | "assistant", message: {content: [...]}}`. Assistant prose is stripped (`"[REDACTED]"`); only **user text** and **tool calls** (name + input) are reliably present. Classification must work from `(user_text, tool_calls, tool_outputs)` alone.

## Taxonomy (v1, 5 codes)

| Code | Class | What you are looking for |
|------|-------|---------------------------|
| `USER-CORRECT` | Explicit user correction | A user message that *redirects* an agent action within ~2 turns. Polite forms count: "actually,", "did you really…?", "I meant…", "no, do X instead". Exclude initial scoping questions and plain follow-ups. |
| `REVERT` | Agent's own work reverted | A `git restore` / `git reset` / `git checkout HEAD -- <path>` tool call where the path was just *edited by the agent* in the same session. **Exclude** lockfile/dep restores and intentional rollback steps the user requested. |
| `VERIFY-SKIP` | Claimed completion without verification | An assistant turn that asserts "done" / "complete" / "fixed" with **no preceding** `npm run validate` / `test` / `format:check` / `lint` / `build` tool call in the same session, OR a user turn asking "did you run X?" after a "done" claim. |
| `RULE-MISS` | Always-apply rule existed but didn't fire | The session's effective rules included one whose glob matched the touched files, AND the agent's behavior diverged from that rule. Strong signal: user explicitly cites a rule name. |
| `HALLUCINATE` | Referenced nonexistent file/API | A tool call output containing `ENOENT` / "file not found" / "no such file" / "cannot find path" / "function X does not exist" where the path or symbol was *constructed by the agent* (not user-supplied). |

Each finding is recorded under exactly one code. If a behaviour matches two, pick the **earlier failure in the chain** (e.g. a HALLUCINATE that caused a VERIFY-SKIP is recorded as HALLUCINATE).

## Signature scheme

For each finding, emit a stable signature:

```
<CODE>:<kebab-normalized first-noun-phrase of the suggested fix>
```

Rules:

- Noun phrase from the **suggested fix**, not the mistake description (more stable across paraphrases).
- Normalize: lowercase ASCII, hyphenate whitespace, strip punctuation, keep only `[a-z0-9-]`.
- **Reject** (and emit no signature) if the phrase is `<3` chars after normalization, **or** matches the generic stopword set: `it`, `the-issue`, `this`, `that`, `the-problem`, `the-bug`, `the-fix`, `the-thing`.

Example: a VERIFY-SKIP where the fix is "Run `npm run validate` before claiming done on MCP edits" → `VERIFY-SKIP:run-npm-validate-before-commit`.

Signatures are recorded in the retro report but **no counters are persisted in v1**. v2 will read signatures from existing retros to detect repeats (see `## Deferred to v2`).

## Workflow

1. **Resolve scope.** Pick the target transcript(s) based on the default rule or flags. Confirm the path with the user before reading if the workspace has > 1 candidate from the last hour.

2. **Read transcript.** Parse each JSONL line. Build a flat event list: `{turn, role, text?, tool_calls[]?, tool_outputs[]?}`. Note timestamps when present.

3. **Classify mistakes.** Walk the event list once per code:
   - Scan user text for `USER-CORRECT` markers. Verify the *adjacent* assistant turn(s) actually changed direction.
   - Scan tool calls for `REVERT`. Cross-check the path was edited earlier in the same session by the agent; otherwise skip.
   - Scan for `VERIFY-SKIP` by locating "done"/"complete" claims (user-side too: "did you run…?") and checking the prior 10 tool calls for a verification command.
   - Scan for `RULE-MISS` by reading any cited `.cursor/rules/*.mdc` paths in the session and comparing prescribed behaviour against tool-call evidence.
   - Scan tool outputs for `HALLUCINATE` markers; verify the failing input was agent-constructed.

4. **Quote evidence.** Every finding records **≤ 200 chars** of verbatim transcript content. Redact secrets, file contents, and PII. If the evidence quote would need redaction beyond 20% of its length, summarize in third person instead and mark `[paraphrased]`.

5. **Write suggested fix.** One sentence. Action-oriented. Prefer the **smallest behaviour change** that would have prevented the mistake — a rule line, a skill clause, a verification step — not a new system.

6. **Compute signature.** Apply `## Signature scheme`. Reject signatures that fail the rules; emit `signature: null` and a `reason:` note.

7. **Render report.** Use `docs/refs/retros/_template.md` as the starting point. Filename: `docs/refs/retros/YYYY-MM-DD-<short-slug>.md` where `<short-slug>` is 3-5 kebab words drawn from the session's first user query (e.g. `2026-05-17-resolve-prs`). If a retro already exists for the same transcript, append a `## Re-review` section rather than overwriting.

8. **Present and gate.** Show the report to the user. **Do not write to AGENTS.md, skills, or rules from this skill.** When a finding implies a skill/rule change, recommend in prose: "Suggested follow-up: open PR to tighten rule `pn-...`." The user decides.

   **Continual-learning bridge:** After showing recommendations, if one or more findings imply a durable preference or workspace fact, ask exactly:

   > "Run `pn-continual-learning` now to apply these as AGENTS.md bullets? (yes / no)"

   - If **yes**: immediately invoke the `pn-continual-learning` skill. It handles its own confirmation loop per bullet.
   - If **no**: note in prose "Run `pn-continual-learning` later to persist these."
   - If the session has **zero findings**: skip the offer (nothing to persist).

## Output contract (per-session report)

```
# Session retro — <date> — <slug>

**Transcript:** `<uuid>.jsonl`
**Turns:** <n>  **Tool calls:** <n>  **User messages:** <n>

## Session summary
2-3 sentences naming the session's goal and outcome.

## Detected mistakes
| # | Code | Evidence (≤200 chars verbatim) | Suggested fix | Signature |
|---|------|--------------------------------|---------------|-----------|
| 1 | ... | ... | ... | ... |

## Root cause(s)
- 1 bullet per finding, or grouped when findings share a cause.

## Recommendations
- 1-3 prose bullets, each pointing to a concrete next action: a PR, an AGENTS.md bullet via pn-continual-learning, or a rule sharpen.

## Calibration delta (optional)
Note any case the 5-code taxonomy could not classify cleanly; this seeds v2 taxonomy expansion.
```

If a session has **zero detected mistakes**, write the report anyway with `## Detected mistakes` empty and a one-line `## Session summary` — these clean-session retros are evidence for the quarterly audit.

## Calibration (seed corpus, 2026-05-17)

Hand-classification of 3 representative transcripts (~80 turns total):

| Transcript | Turns | Findings | Codes hit |
|------------|-------|----------|-----------|
| `f27ba468` (resolve PRs) | ~44 | 1 | `VERIFY-SKIP` (committed with mis-scoped message; self-amended next turn) |
| `bbc896b3` (open PRs) | ~13 | 0 | — (clean fallback when env blocked `gh`/API) |
| `b48d55b4` (pressure-test skill) | ~50 | 2 | `VERIFY-SKIP` × 2 (user asked "all tests pass?" then directed `npm audit fix` rerun) |

**Aggregate precision (hand-graded): 67-100%** depending on reading strictness — clears the **≥70%** bar. Per-code observations:

- **`VERIFY-SKIP` is the dominant signal** in this seed corpus. The strongest detector is *user reverification questions* ("did you run…?", "all tests pass?"), not agent self-omission.
- **`REVERT` needs nuance.** `git restore` / `git reset` fired in clean sessions too — they were *deliberate repair tools*, not mistakes. The taxonomy now requires the restored path to have been edited by the agent earlier in the *same* session.
- **`USER-CORRECT` markers are polite/indirect**. The canonical "no, actually" did not fire. Detection must include reverification asks and softened directives.
- **`HALLUCINATE` did not fire** in the seed corpus. The detector is included for completeness; refine after first real hit.
- **`RULE-MISS` could not be evaluated** from the seed corpus (no transcripts cited a `.cursor/rules/*.mdc` path). Carry the detector untested into v1; first hit becomes the test case.

Refresh this section after every ~10 retros or when a `Calibration delta` note repeats across reports.

## Candidate codes (deferred until evidence)

Promote a code from this list to `## Taxonomy` when ≥ 3 retros surface it manually:

- `TOOL-MISUSE` — wrong tool / wrong params / repeated identical failing call.
- `SKILL-MISS` — relevant skill not invoked when its trigger phrases were present.
- `SCOPE-DRIFT` — did more or less than asked; abandoned ACs.
- `SLOP` — hedging language ("possibly", "should", "might") or aesthetic-baseline violations.
- `PLAN-DEVIATE` — `docs/PLAN.md` exists, edits do not match.
- `COMMAND-MISMATCH` — user invoked `/pn-X` but the actual ask does not match command X's `## When to use` contract; the agent silently re-routed (instead of acknowledging the mismatch in its first response). Distinct from `RULE-MISS` (which is the *surface symptom* — the `[pn-command] ▲` / `[pn-agent] ▲` / `[pn-skill] 🔺` start-marker didn't fire) because the root cause sits one level up at command selection. When both apply, record one finding under `COMMAND-MISMATCH` after promotion; until promotion, record as `RULE-MISS` with a `Calibration delta` note. **Instances so far:** 1 (2026-05-17 slash-palette consolidation; evidence in `pn-build-gate` § Command-contract acknowledgement).

## Integration

- **`pn-continual-learning`** — when a finding implies a durable preference or workspace fact, recommend (in the report) running `pn-continual-learning` to add the bullet to `AGENTS.md`. The two skills do not write to `AGENTS.md` in parallel; this one only proposes.
- **`pn-review` / `pn-reality-check` / `pn-evidence-qa` / `pn-deslop`** — artifact-level reviewers. This skill is interaction-level. Do not duplicate their checks; reference them in recommendations when the right next action is a code review.
- **[ADR-0002](../../../../../../docs/adr/0002-skill-rule-audit-cadence.md)** — quarterly audit reads retros in `docs/refs/retros/` as evidence. v2 will automate the rollup.
- **`pn-systematic-debugging`** — when a retro surfaces a recurring tool-call failure, the right next action is often this skill (used in-session) rather than a rule edit.

## Guardrails

- **Read-only on transcripts.** Never modify, redact in place, or move transcript files.
- **No auto-edits.** Do not touch `AGENTS.md`, `.mdc` rules, or `SKILL.md` files from this skill. Recommendations are prose; the user opens the PR.
- **Quote, do not paraphrase**, unless redaction would exceed 20% of the quote (then summarize and tag `[paraphrased]`).
- **One code per finding.** If two codes match, pick the *earlier link* in the failure chain.
- **No numeric score.** Do not aggregate findings into a "mistake score". Goodhart-resistant by design.
- **Blameless tone.** Findings describe behaviour, not intent. "The agent claimed done before running `npm run validate`" — not "the agent was lazy".

## Limitations

- **Assistant prose is stripped from transcripts** (`"[REDACTED]"`); the skill works from user text + tool calls + tool outputs only. Some classes of mistake — confidently-stated wrong claims that the user did not push back on — are invisible.
- **v1 is manual.** No stop-hook trigger. The skill runs when the user invokes `/pn-retro` or asks for a retro.
- **No cross-session pattern detection in v1.** Signatures are recorded but not aggregated. A v2 with `retro-patterns.json` will surface repeat offenders; until then, the user spots patterns by reading `docs/refs/retros/`.
- **`RULE-MISS` detector is untested in v1** (no seed-corpus hit). First real hit will validate it.

## Deferred to v2 (with exit criteria)

| Item | Promote when |
|------|--------------|
| `pn-session-retro-stop.mjs` auto-trigger | ≥ 4 weeks of manual retros AND hook arbitration with `pn-continual-learning-stop` is designed (single `followup_message` slot) |
| `.cursor/hooks/state/retro-patterns.json` cross-session counters | ≥ 10 retros exist AND ≥ 3 surface the same signature manually |
| `scripts/rollup-retros.mjs` quarterly aggregation | ≥ 1 full quarter of retros AND explicit reconciliation with [ADR-0002](../../../../../../docs/adr/0002-skill-rule-audit-cadence.md)'s "policy not automation" stance |
| Auto-diff proposals against `.mdc` / `SKILL.md` | Recommendation-to-PR conversion measurable across ≥ 5 retros |
