# Type: data-flow

Role-scoped pipeline: sources → transforms → stores → consumers. Mermaid: `flowchart LR`. Editorial: columns by stage, arrows for data (not control).

## Grammar

- Nodes are **datasets or processors**, labeled by payload (`OrderEvents`, `Enrich`). Not UI screens.
- Stages as columns or light zones: ingest / transform / serve. Max ~4 stages.
- Branching is filter vs enrich, not if/else product logic (that is a flowchart).

## Cuts

Merge hops that always travel together. Drop retry and DLQ unless they are the subject. One store with many replicas is one node. If the story is who talks to whom, this is architecture.
