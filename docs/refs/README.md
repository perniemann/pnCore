---
title: Reference bundle (docs/refs/)
updated: 2026-05-12
---

# Reference bundle (`docs/refs/`)

Machine-oriented and canonical pointers for this repo live alongside human-facing docs.

---

## Files

| File | Purpose |
|------|---------|
| [context-index.json](context-index.json) | Layered handoff manifest: semver, `last_reviewed`, pointers to workspace/product docs, optional PRD/discovery, owned paths, optional `AC-*` ids, suggested verify commands. Validated in CI via `npm run check:context-index`. |
| [context-index.schema.json](context-index.schema.json) | JSON Schema for `context-index.json`. |

Schema upgrades: run `node scripts/migrate-context-index.mjs [--dry-run]` from the repo root when the JSON Schema contract bumps.

**Consumers:** [Adopter CI and conventions](../context-index-adopters.md) (optional GitHub Actions, `check:context-index` / `check:ac-traceability`).

---

## Workflow state (pnCore MCP)

For `workflow_step` resume payloads, the normative schema is in the MCP content tree:

`packages/pn-core-mcp/content/reference/workflow-state-schema.md`

Clients may persist state (e.g. `.pncore/workflow-state.json`) as described there.

---

## Strict drift checks

- **`npm run check:ac-traceability`** (part of `npm run validate`): every id in `acceptance_criteria_ids` must appear as a whole word in at least one text file outside `context-index.json` (traceability). **AC-1** anchors the repo validation pipeline.

---

## External references

Frameworks and talks that align with pnCore's layered rules, skills, MCP, and `context-index.json` approach.

### 12-Factor Agents

[humanlayer/12-factor-agents](https://github.com/humanlayer/12-factor-agents) â€” production-oriented patterns: own your context window, compact errors, small focused agents, humans contacted via structured steps, unified state concepts. Particularly relevant:

- [Factor 3: Own your context window](https://github.com/humanlayer/12-factor-agents/blob/main/content/factor-03-own-your-context-window.md)
- [Factor 7: Contact humans with tools](https://github.com/humanlayer/12-factor-agents/blob/main/content/factor-07-contact-humans-with-tools.md)
- [Factor 9: Compact errors](https://github.com/humanlayer/12-factor-agents/blob/main/content/factor-09-compact-errors.md)

### HumanLayer / CodeLayer

[humanlayer/humanlayer](https://github.com/humanlayer/humanlayer) â€” CodeLayer IDE and human-in-the-loop infrastructure for high-stakes tool use; complementary to soft gates in Cursor, not a drop-in substitute.

### Hard approval in pn-core MCP

The **`approval_checkpoint`** tool succeeds only if `approval_token` matches **`PNCORE_APPROVAL_TOKEN`** on the MCP server process (set in MCP config `env`, not in the model context). That is stronger than `workflow_confirm` (prompt-only): the model cannot pass the checkpoint without the user supplying the shared secret when calling the tool. It is not as strong as a separate human channel (email/Slack) but closes the "model skipped asking" gap for configured workflows.

### Related docs

- [Acceptance criteria convention](../acceptance-criteria-convention.md)
- [agents-md-guide.md](../agents-md-guide.md) â€” AGENTS.md vs rules vs skills
- MCP runbook: `pn-core://reference/RUNBOOK.md` (when MCP is enabled)
- Human-facing artifacts (HTML / canvas / markdown): `pn-core://reference/human-facing-artifacts.md`

---

## Refresh policy

Update `context-index.json` after discovery sign-off, PRD changes that affect scope, or major pnCore workflow phases. Prefer **manual merge** of proposed updates. Bump `version` (semver) when the **contract** meaning changes; update `last_reviewed` on every material edit.

See [Acceptance criteria convention](../acceptance-criteria-convention.md) and the [External references](#external-references) section above.
