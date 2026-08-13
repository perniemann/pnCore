# Type: layers

Stacked abstractions (control planes, medallion-style quality, OSI-like stacks). Mermaid: `flowchart TB` with subgraphs or stacked nodes. Editorial: full-width bands, labels on the left.

## Grammar

- 3–6 layers, most-concrete at the bottom or the top — pick one and stay consistent (state the direction in `accDescr` / `<desc>`).
- A layer is a **band**, not a row of unrelated boxes. Put 1–4 occupants per band.
- Cross-cutting concerns (auth, observability) as a vertical rail or a footer band, not a fifth identical stripe.

## Cuts

If items are peers, not stacked, this is architecture. If the stack is a ranked funnel, say so in the title and keep ≤6 bands. Do not mix layer-stack with a full mesh of arrows — one or two vertical flows max.
