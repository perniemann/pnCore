# Type: flowchart

Decision logic with branches. Mermaid: `flowchart` with diamonds for decisions. Editorial: rounded rects for steps, diamonds for questions.

## Grammar

- One **start**, one or two **ends**. Decisions have labeled yes/no (or named) exits.
- Happy path is the accent (≤2 strokes or nodes). Error/else stays muted.
- No loops unless the loop **is** the subject (then use type-loop).

## Cuts

Collapse consecutive “then” steps into one node. A decision that always takes one branch is not a decision — delete it. If the chart is a linear pipeline, it is architecture or a numbered list, not a flowchart.
