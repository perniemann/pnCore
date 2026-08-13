# Type: architecture

Components and connections. Mermaid: `flowchart`. Editorial: boxed nodes, orthogonal edges, zones as light containers.

## Grammar

- Nodes are **named components** (Client, Gateway, Orders, Postgres), not verbs.
- Edges are **direction of dependency or data**. Drop an edge if layout already shows the relationship.
- Zones (dashed rect / subgraph) group a layer: `web`, `app`, `data`. Max ~3 zones.
- Type tags (API, DB, Q) are optional; use them only when two nodes would otherwise look identical.

## Treatment

| Kind | Fill | Stroke |
|------|------|--------|
| Focal (1–2) | accent tint | accent |
| Service / API | paper | ink |
| Store | ink at 0.05 | muted |
| External | ink at 0.03 | ink at 0.3 |

## Cuts

Merge “always travel together” pairs (API + its sidecar). Drop load balancers and TLS terminators unless they are the subject. Prefer one store node over listing every replica.
