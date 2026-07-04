---
name: pn-systematic-debugging
description: "Root cause analysis with triage mode — Phase 0 feedback loop, investigate first, one question max, then isolate, hypothesize, confirm. Outputs TDD fix plan with RED-GREEN cycles; optional GitHub issue via GitHub MCP. Use when debugging a failure or bug."
---

# Systematic debugging

## When to use

- A test, build, or runtime failure with unclear cause
- User reports "this is broken" or "why does this fail?"
- Intermittent or hard-to-reproduce bugs

## Triage mode (default when bug is reported)

When the user reports a bug or failure, enter triage mode:

1. **One question maximum.** Ask ONE question at most to clarify the problem, then immediately investigate the codebase. Do not ask follow-up questions — explore first.
2. **Investigate deeply** before asking anything else:
   - Trace the relevant code path using Octocode `lspCallHierarchy`, `lspGotoDefinition`, and `lspFindReferences` when available.
   - Look at related source files, existing tests, and recent changes (`git log` on relevant files).
   - Find where the bug manifests, what code path is involved, and why it fails (root cause, not symptom).
3. **Identify the fix approach** based on investigation: minimal change, modules affected, behaviors to verify.
4. **Output structured root cause analysis** — see Output section below.

## Phase 0 — Feedback loop (before hypotheses)

Spend disproportionate effort here. Without a fast pass/fail signal, bisection and hypothesis testing cannot land.

Construct **one** deterministic feedback loop before Phase 1 (Reproduce), trying roughly this order until one works:

1. **Failing automated test** at the seam that reaches the bug (unit or integration).
2. **Scripted HTTP** (`curl` / small script) against a dev server for API regressions.
3. **CLI invocation** with fixture input; diff stdout/stderr against a snapshot.
4. **Replay artifact** — captured request, payload, or event log replayed through the code path.
5. **Throwaway harness** — minimal subset of the system exercising one path with one call.
6. **Property or fuzz loop** when output is nondeterministic — narrow until failure mode appears.
7. **`git bisect run`** when regression window is bounded by known-good and known-bad commits.

Iterate on the loop until it is **fast** (seconds, not minutes) and **sharp** (asserts the symptom, not “did not crash”). For flaky bugs, raise reproduction rate before debugging logic.

If no loop is achievable after genuine attempts, stop and list what was tried; ask for environment access or captured artifacts (HAR, logs, dump). Do not hypothesize without a loop.

## Workflow (four phases)

1. **Reproduce:** Run the Phase 0 loop. Get a reliable reproduction (steps, env, or test). If flaky, note conditions and try to make it deterministic.
2. **Isolate:** Narrow the failure to the smallest unit (one test, one call, one file). Use binary search or divide-and-conquer (comment out code, run smaller subsets). Use Octocode `lspCallHierarchy` and `lspFindReferences` when available to trace call flow and narrow the failure point.
3. **Hypothesize:** Form **3–5 ranked** hypotheses before testing one (single-hypothesis anchors on the first plausible idea). Show the ranked list when the user can re-rank by domain knowledge.
4. **Confirm:** Check the hypothesis (inspect state, add a log or assertion, run under debugger). If wrong, revise hypothesis and repeat. If right, fix with minimal change and re-run to confirm.

## Guardrails

- Do not guess-and-patch without a confirmed root cause.
- One hypothesis at a time in execution; confirm or reject before the next.
- Prefer minimal, targeted fixes over broad changes.
- For log-based debugging: use pn-error-log-analysis (log parsing, stack traces, correlation across services).

## Output

**Root cause analysis** (behavior-level — do not couple to specific file paths or line numbers; describe modules, behaviors, and contracts so findings remain useful after refactors):

- What happens (actual behavior) vs. what should happen (expected)
- The code path involved and why it fails
- Any contributing factors

**TDD fix plan** (RED-GREEN cycles, one vertical slice at a time):

```
1. RED: Write a test that [describes expected behavior]
   GREEN: [Minimal change to make it pass]

2. RED: Write a test that [describes next behavior]
   GREEN: [Minimal change to make it pass]

...

REFACTOR: [Any cleanup needed after all tests pass]
```

**Acceptance criteria:**
- [ ] All new tests pass
- [ ] Existing tests still pass
- [ ] Root cause addressed at its source

### Filing a GitHub issue (when requested)

If the user asks to track work on GitHub:

1. **Prefer [GitHub MCP server](https://github.com/github/github-mcp-server)** (`issues` + `labels` toolsets minimum). Use capability-style steps: create issue, add labels — exact tool names match the enabled server version; see [server configuration](https://github.com/github/github-mcp-server/blob/main/docs/server-configuration.md).
2. **If GitHub MCP is unavailable:** say so clearly and suggest enabling it or use **`gh issue create`** as fallback — do not silently skip filing.
3. Issue body: Problem / Expected vs actual / **Repro signal** (how the loop fails) / Ranked hypotheses / **Root cause** (behavior-level, not brittle file:line unless user needs ticket granularity). Avoid coupling the ticket to layout that will rot after refactors.
4. Optional label such as `needs-triage` — **replace with the repo’s taxonomy** when different.

## Related skills

- **pn-error-log-analysis** — Log parsing, stack traces, correlating errors across services.
- **pn-tdd** — After root cause is confirmed, add or update tests before or with the fix.
