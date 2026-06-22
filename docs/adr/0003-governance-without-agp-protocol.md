---
title: "ADR-0003: Governance and lifecycle without adopting AGP as a protocol"
updated: 2026-04-28
---

# ADR-0003: Governance and lifecycle without adopting AGP as a protocol

## Status

Accepted

## Context

Research literature (e.g. Autogenesis / “AGP”) argues that agent stacks should treat prompts, agents, tools, environments, and memory as **first-class resources** with explicit **lifecycle**, **versioning**, and **closed-loop** propose–assess–commit flows with **lineage** and **rollback**. MCP standardizes tool discovery and invocation but does not specify full resource governance.

pnCore already layers **git**, **`sync:content`**, **validators**, **workflows**, **skeptic gates**, and optional **approval checkpoints** on top of MCP. A skeptic pass concluded that adopting AGP (or RSPL/SEPL) as a **parallel product protocol** would add coordination cost without proof of unique value over those existing mechanisms.

## Decision

1. **Default stance:** Use AGP-style ideas **descriptively** only—checklists and docs that clarify lifecycle, versioning, rollback, and gates—**without** implementing Autogenesis or branding user-facing copy as “AGP-compliant.”
2. **Primitive mapping:** Before any roadmap or external narrative references Autogenesis by name, maintain an explicit **mapping** from AGP-style primitives to pnCore mechanisms (see appendix). **N/A** rows mark host or product limits, not hidden features.
3. **No second protocol:** Do not add a runtime AGP/RSPL/SEPL layer inside pnCore. Governance stays **repo + CI + MCP** as today.
4. **Human gates:** Any “commit” of improvements remains **human-reviewed** git history and existing HITL tools (`approval_checkpoint`, user-confirmed skeptic passes). No autonomous merge of governance content.
5. **Optional pilot:** If docs are insufficient, pilot **one** artifact class (recommended: skills under `packages/pn-core-mcp/content/skills/`) for a documented change → validate → rollback story before broader generalization.

## Consequences

- **Positive:** Clear contributor path for publish/validate/revert without new vocabulary or specs; research informs direction without fad-chasing; bus factor improves via ADR + runbook checklists.
- **Negative:** No interoperability badge with an external AGP ecosystem until such ecosystems exist and we explicitly choose integration. Mitigation: revisit if industry converges on a concrete spec with multiple implementations.

## Appendix: AGP-style primitive → pnCore mechanism

| Primitive (conceptual) | pnCore mechanism | Notes / limits |
|------------------------|--------------------|----------------|
| Register prompts / agent definitions | Files under `packages/pn-core-mcp/content/` (agents, skills, commands); loaded via MCP `get_agent` / `get_skill` / `get_command` | **N/A:** No single runtime registry beyond MCP lists + filesystem. |
| Register tools | `regTool(...)` in MCP server; descriptors from code + content | Tool surface is code-owned; not arbitrary user-registered tools without a PR. |
| Environment | Cursor workspace, `.cursor/rules/`, MCP server env vars | **N/A:** No AGP-style environment ID spanning all hosts. |
| Memory / long-horizon context | Repo `AGENTS.md`, optional `.pncore/*` logs, user memory skills; workflow state files | **N/A:** Not one unified memory substrate; project-dependent. |
| Resource state (draft / published) | Git branch + PR; canonical edits in `packages/pn-core-mcp/content/` only | “Published” = merged to mainline; no separate protocol state machine. |
| Versioned interfaces | Git history; package semver; `sync:content` copies canonical content to `plugins/pnCore/` | Plugin copy is derived; edit canonical side only. |
| Propose change | PR, agent-assisted edits, plans in session | |
| Assess change | `npm run validate`, CI, `npm run test:full` when MCP/content/scripts touched; `pn-skeptic-challenge`, `pn-reviewer` in workflows | |
| Commit change | Human `git commit` / merge | |
| Lineage | `git log`, ADRs, audit notes (`docs/refs/audit-YYYY-Qn.md` per ADR-0002) | |
| Rollback | `git revert`, restore from tag/release | |
| Closed-loop improvement | Workflows + skeptic on plan and output; transcript learning (`pn-continual-learning`) for preferences | **N/A:** Not automatic self-modification of canonical content without review. |

## References

- [ADR-0001: Record architecture and product decisions](0001-record-architecture-decisions.md)
- [ADR-0002: Quarterly skill and rule audit cadence](0002-skill-rule-audit-cadence.md)
- [CONTRIBUTING.md](../../CONTRIBUTING.md)
- [RUNBOOK](../../packages/pn-core-mcp/content/reference/RUNBOOK.md) — resource lifecycle quick checklist
- arXiv:2604.15034 — Autogenesis (research context only)
