---
name: pn-codebase-to-strategy
description: "Analyzes a repository and produces N≤3 candidate strategic angles, each with ICP, value proposition, monetization hypothesis, and file-level evidence references. Used by the business_strategy workflow step 1 (codebase/hybrid mode)."
---

# Codebase to Strategy

## When to use

- Step 1 of the `business_strategy` workflow when `state.mode !== "idea"`.
- When a user wants to discover positioning angles from an existing codebase rather than starting from a blank-slate idea.
- When `--from-repo <path>` is passed to `/pn-strategy`.

## Output

Produce **N≤3 candidate strategic angles**. Each candidate:

```
{
  id: string,                    // short slug, e.g. "b2b-api-platform"
  icp: string,                   // ideal customer profile, specific (not "SMBs")
  value_prop_sentence: string,   // one sentence: "X helps [ICP] do [job] without [pain]"
  monetization_hypothesis: string, // e.g. "usage-based SaaS, $0.01/API call + $49/mo floor"
  evidence_refs: string[]        // ["path/to/file.ts:42", "README.md:15"]
}
```

## Procedure

### 1. Explore structure

Use available tools in order of preference:

**With Octocode MCP** (`mcp_user-octocode_*` or `mcp_octocode_*`):
1. `localViewStructure` — top-level directory layout (depth=2).
2. `localSearchCode` — search for customer-facing strings, public API routes, pricing mentions, README value statements.
3. `lspCallHierarchy(outgoing)` on key public entry points (CLI mains, HTTP handlers, exported module roots) to trace what the code actually does for a caller.

**Without Octocode** (host tools):
1. `SemanticSearch` — "What does this codebase do for end users?" and "What public APIs or interfaces does it expose?"
2. `Glob` — find `README*`, `package.json`, `Cargo.toml`, `pyproject.toml`, `*.routes.*`, `*.api.*`, `openapi*`.
3. `Read` — inspect README, manifest, and one or two key public interface files.

### 2. Mine signal sources

For each of the following, note exact file and line number for `evidence_refs`:

| Source | What to look for |
|--------|-----------------|
| README | Value proposition language, target audience, use-case examples |
| Package metadata | `description`, `keywords`, `homepage`, dependency mix (reveals domain) |
| Public API routes / exports | Surface area — what can a caller do with this? |
| Customer-facing strings | UI copy, error messages, onboarding text, pricing page snippets |
| CLI help text | Verbs and nouns used → reveals mental model of the tool |
| Dependency mix | Heavy ML deps → AI play; heavy finance libs → fintech; heavy media → content |
| Tests / examples | What scenarios does the author think are the canonical use cases? |

### 3. Synthesize ≤3 angles

Each angle must be **differentiated** from the others — do not produce three variations of the same thesis. Consider:

- **User type angle**: different ICP (developer vs. ops vs. business user).
- **Monetization angle**: same product, different commercial model (self-serve vs. enterprise).
- **Wedge angle**: narrower initial market with a path to broader expansion.

For each angle:
1. Write the ICP in specific terms (e.g. "solo SaaS founders with <$50K MRR needing automated customer support", not "small businesses").
2. Write the value prop as a single concrete sentence.
3. State the monetization hypothesis with numbers if the evidence supports them.
4. List ≥2 `evidence_refs` as `file:line` strings.

### 4. Present and gate

Present the N≤3 candidates clearly. Use `workflow_confirm` (or `ask_question` when available) with one option per candidate id plus a free-text override ("None of these — describe the angle I want").

Do not proceed to evidence gathering (step 2) until the user selects an angle or provides an override.

## Guardrails

- Never fabricate file paths or line numbers — only cite lines you have actually read.
- If the codebase is private or inaccessible, ask the user to share key files before proceeding.
- If structure is ambiguous after exploration, produce one "most likely" angle and flag the ambiguity rather than inventing confidence.
- Do not run full codebase indexing — bound exploration to the sources listed in section 2. Stop when you have ≥2 strong evidence refs per angle.
- If fewer than 2 angles are defensible from the evidence, produce 1 and explain why more are not supported.

## Integration

- **business_strategy workflow** — called at step 1; output feeds `workflow_confirm` angle selection gate.
- **pn-business-strategy-orchestration** — behavioral contract for the surrounding run.
- **pn-prior-art-research** — complementary; use when competitive landscape context is needed alongside codebase evidence.
