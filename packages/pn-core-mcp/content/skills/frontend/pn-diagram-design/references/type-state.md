# Type: state

States and transitions. Mermaid: `stateDiagram-v2` when the renderer supports it; otherwise `flowchart` with stadium nodes. Editorial: rounded nodes, labeled arrows, one start (filled circle) and one or two ends.

## Grammar

- Nodes are **states** (Idle, Authorizing), not components. Arrows are **events** (`401`, `submit`).
- One start. Happy-path transitions use accent (≤2). Error/else stays muted.
- Nested states: at most one composite. Guards on the arrow, not in a footnote.

## Cuts

Merge states that share the same exits. Drop logging and telemetry transitions unless they are the subject. If there are no cycles and only a happy path, this is a flowchart.
