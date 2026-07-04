---
name: pn-comfyui-workflows
description: "ComfyUI workflow JSON, execution graphs, seeds, model loading, conditioning patterns, API and headless runs, troubleshooting, pinning versions for reproducibility. Use with pn-generative-media-director for T2I/T2V pipelines."
---

# ComfyUI workflows

## When to use

- Building, editing, or debugging ComfyUI workflow JSON (UI export or hand-authored).
- Running graphs via API or headless automation.
- Choosing how to express prompts and controls **as nodes** (positive/negative, dual encoders, image-based conditioning).
- Sharing workflows with teammates: reproducibility, custom nodes, VRAM/dtype strategy.

## Workflow

1. **Confirm environment:** ComfyUI revision, GPU, VRAM budget, torch dtype. Ask for actual checkpoint, VAE, and custom node pack names on disk—do not assume filenames.
2. **Graph hygiene:** One clear path from loaders → conditioning → sampler → decode → save/preview. Avoid duplicate seeds unless intentional; document which nodes consume which latent.
3. **Seeds and noise:** Fix `seed` for A/B of prompts; change seed to explore variation. Document whether the workflow uses per-batch or per-node seed behavior.
4. **Conditioning patterns (conceptual):** Text encoders may be CLIP-style, T5-style, or combined (e.g. dual positive inputs). Image guidance (ControlNet-class, IPAdapter-class, reference-only) stacks **attention or latent shaping**—order and strength matter; test incrementally.
5. **Resolution:** Match model-native buckets when the checkpoint is trained for them; odd dimensions can waste VRAM or soften detail. Upscale in a second stage when quality demands it.
6. **API vs UI:** Export JSON from UI for truth; API payloads must reference the same node ids and link structure. Validate with a minimal two-node graph before scaling.
7. **Troubleshooting order:** (1) OOM → lower resolution, batch, or use tiled decode; (2) black/magenta output → VAE/checkpoint mismatch or wrong dtype; (3) noise soup → CFG, scheduler, or empty conditioning; (4) custom node errors → version pin or isolate subgraph.

## Reproducibility

- Save the full workflow JSON under version control; record ComfyUI commit or release tag.
- List custom nodes with **git URL + commit** or manager version.
- Note default sampler, scheduler, steps, and CFG used for the approved look.

## Guardrails

- Do not hardcode paths that only exist on one machine; use placeholders and explain where the user must browse.
- When recommending third-party nodes, treat them as **optional integrations**—the user installs at their own risk.
- For realistic people and restricted content, defer to platform policy and consent; do not optimize prompts for harm.

## Integration

- **pn-generative-media-director** — Primary agent; load this skill for graph work.
- **pn-image-prompt-engineering** — Splitting natural language into encoder-friendly clauses.
- **pn-generative-video-pipelines** — When the graph outputs video or frame sequences.
- **pn-cinematography-lighting** — Translate shot intent into prompt and conditioning language.
