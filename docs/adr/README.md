# Architecture decision records

Nygard ADRs live in this directory. **Numbers are monotonic and never reused.**

Two files share `0001` (early collision; left as-is rather than recycling a later id):

- [0001-record-architecture-decisions.md](./0001-record-architecture-decisions.md) — adopt ADRs
- [0001-feature-program-workflow.md](./0001-feature-program-workflow.md) — `feature_program` workflow

`0007` was claimed by a command-palette PM-router draft that never merged. [ADR-0008](./0008-command-palette-pn-submenu.md) retires that number. Do not reuse `0007`.

- [0015-consumer-project-gating.md](./0015-consumer-project-gating.md) — downstream gating is chat + opt-in git trailer defense; MCP never owns the Merge button
