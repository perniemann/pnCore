# Type: sequence

Time-ordered messages between actors. Mermaid: `sequenceDiagram`. Editorial: lifelines down, arrows across.

## Grammar

- Lifelines = actors (max 5). Messages go down in time.
- Activation bars only when they add information (who is blocked).
- `alt`/`opt`/`loop` fragments: at most one combined fragment by default; `alt` regions max 2; no nested fragments.

## Cuts

Drop retries and logging calls unless they are the point. Token refresh belongs as one `alt` (401 → refresh → retry), not a second diagram of OAuth trivia. Return arrows dashed.
