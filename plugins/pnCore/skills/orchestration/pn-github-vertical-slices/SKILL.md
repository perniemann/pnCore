---
name: pn-github-vertical-slices
description: Break a plan or PRD into tracer-bullet vertical slices and create GitHub Issues via GitHub MCP (official github/github-mcp-server). Dependencies first (AFK/HITL). Use after pn-writing-plans or pn-create-prd when work must ship as Issues.
---

# GitHub vertical slices

## When to use

- After **pn-writing-plans** or **pn-create-prd**, when implementation should be tracked as GitHub Issues (parallel agents or humans).
- User asks to “split this plan into Issues”, “vertical slices”, “tracer bullets”, or “one Issue per slice.”

## Prerequisites

- **[GitHub MCP server](https://github.com/github/github-mcp-server)** enabled with at least **`context`**, **`issues`**, and **`labels`** toolsets (add **`repos`** if repo metadata is needed). See [server configuration](https://github.com/github/github-mcp-server/blob/main/docs/server-configuration.md).
- **Repository scope:** Infer owner/repo from `git remote` or user-provided URL when ambiguous.

If GitHub MCP is **not** available: stop and tell the user to enable the official server or fall back to creating Issues manually — **do not** pretend Issues were created.

## Concepts

- **Tracer-bullet slice:** One thin vertical cut through schema/API/UI/tests — demoable or verifiable on its own. Prefer **many thin slices** over few thick ones.
- **AFK:** Can ship without human gate beyond normal review.
- **HITL:** Blocked on a decision, explicit approval, or design/sign-off.

Replace labels below with **your repo’s taxonomy** when different.

## Instructions

### 1. Gather input

Use conversation context, an attached plan (`docs/plans/…`), or a GitHub Issue URL/number if the user references one.

### 2. Draft slices

Produce slices as numbered candidates. For each slice include:

| Field | Content |
|--------|---------|
| **Title** | Short, actionable |
| **Type** | AFK or HITL |
| **Blocked by** | None or slice numbers / Issue refs once known |
| **Stories covered** | References to user stories from source material if present |

Rules:

- Each slice delivers **end-to-end behavior**, not “layer N only.”
- Order **dependencies first**: unblockers before blocked work.

### 3. Confirm with user

Present the list; ask whether granularity, dependencies, and AFK/HITL tagging match expectations. Iterate until approved.

### 4. Create Issues via GitHub MCP

Use the MCP tools exposed for **`issues`** (create/update/search); **`labels`** for applying categories/state labels after creation.

**Creation order:**

1. Create **blocker Issues first** (no inward deps).
2. Create dependent Issues next.
3. **Edit bodies** to insert real `#<number>` links in **Blocked by** sections once numbers exist.

**Issue body template** (adapt wording to match MCP-created markdown):

```
## Parent

(Optional: reference parent Issue #…)

## What to build

[Concise description of this slice — user-visible behavior, stack cuts]

## Acceptance criteria

- [ ] …
- [ ] …

## Blocked by

- None — can start immediately

<!-- OR: Blocked by #NN -->

```

Do **not** close or rewrite unrelated Issues unless the user asks.

### 5. Summarize

Return URLs or numbers for created Issues and the dependency graph in plain language.

## Integration

- **Official GitHub MCP:** [github/github-mcp-server](https://github.com/github/github-mcp-server). Capability wording (“create issue”, “set labels”) stays stable; tool identifiers evolve — follow upstream docs when naming tools explicitly.
- **Related:** **pn-writing-plans** for the upstream plan artifact; **pn-github-issue-triage** if Issues must enter maintainer workflow labels next.
