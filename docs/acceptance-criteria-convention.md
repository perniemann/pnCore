---
title: Acceptance criteria IDs (AC-*)
updated: 2026-04-22
---

# Acceptance criteria IDs (`AC-*`)

---

## Purpose

Stable identifiers in PRDs and discovery specs so implementation, tests, and automation can reference the same requirement without paraphrasing. Supports anti–plan-drift checks (manual or CI) without NLP.

---

## Format

- Use **`AC-1`**, **`AC-2`**, … or **`AC-001`** consistently within a document.

### AC-1 (this repo)

**AC-1:** Context index and repo validation pipeline stay wired: `docs/refs/context-index.json` lists `AC-1` under `acceptance_criteria_ids`, and the same id appears outside that file (see `scripts/check-ac-traceability.mjs`). CI runs `npm run validate`, which includes schema check + traceability.

### AC-2 (this repo)

**AC-2:** Cold-session project context is an MCP **pull** (`project_context` tool), not a `sessionStart` inject. `docs/refs/context-index.json` may list typed `artifacts`; derived completion requires attestations (`workflow_verify` / acceptance in `.pncore/run-events.jsonl`), never markdown checkboxes or authored `status: complete` alone. `npm run check:artifact-status` enforces that.
- One criterion per ID; do not reuse IDs after removal (use a new number or document supersession in prose).

---

## Where they live

- **PRD** (`docs/refs/PRD.md` or `docs/PRD.md` when your project uses those paths).
- **Discovery** (`docs/discovery/…`).
- Optional listing in [`docs/refs/context-index.json`](refs/context-index.json) under `acceptance_criteria_ids` for high-signal IDs CI or reviewers should grep.

---

## Tests and code

- Reference the ID in test titles, file headers, or comments: e.g. `it('AC-3 rejects unauthenticated access', …)`.
- v1: convention + review; stricter CI (changed paths must cite ACs) is optional when false positives are acceptable.

---

## PRD vs workspace context

Product acceptance lives in the PRD. Workspace bootstrap (Cursor rules, MCP) lives in `project-context.mdc` / AGENTS-style files. See [agents-md-guide](agents-md-guide.md) and [context-index.json](refs/context-index.json).
