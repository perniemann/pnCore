# Semantic patterns

Behavior first, layout second. Pick **one** pattern when it matches; then use the nearest visual type. Patterns do not add types.

| Trigger | Pattern | Nearest type |
|---------|---------|--------------|
| Fan-in, queue depth, bottleneck | Fan-in queue | Architecture |
| Repeated stage slots (question / input / output) | Stage framework | Flowchart |
| Loose input becomes a durable artifact | Unstructured → structured | Architecture |
| Two traces with pass/fail and first divergence | Paired policy traces | Flowchart |
| Trust boundary + permitted vs forbidden path | Secure paved road | Architecture |
| Controls grouped by where they are enforced | Governance catalog | Layers |
| Defenses that compensate for prior gaps | Compensating security | Layers |

If none match, skip this file and choose the type from the skill table.

**Budget:** the pattern’s meaning must survive the ~9 node split. Do not add a second layout grammar (no flowchart-inside-architecture).
