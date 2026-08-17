# Type: process

Multi-actor sequential workflow (swimlane). Mermaid: `flowchart` with subgraphs per actor, left-to-right. Editorial: horizontal lanes, steps as nodes, handoffs as vertical connectors.

## Grammar

- Lanes are **actors** (max 4). Steps sit in the lane that owns them.
- Time reads left to right. Handoffs are the story — mute intra-lane filler.
- Decisions: one diamond that returns to a lane; not a nested flowchart.

## Cuts

Collapse consecutive steps in the same lane into one node. Drop “notify” and “log” unless they are the point. If there is only one actor, this is a flowchart. If actors are systems with no sequence, this is architecture.
