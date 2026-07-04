---
name: pn-generative-video-pipelines
description: "Text-to-video and image-to-video pipelines, temporal consistency, motion prompting, segmentation for long outputs, fps and codec delivery. Use with pn-generative-media-director and pn-comfyui-workflows."
---

# Generative video pipelines

## When to use

- Text-to-video (T2V) or image-to-video (I2V) generation in ComfyUI or API tools.
- Planning motion, camera movement, and continuity across frames or segments.
- Breaking long outputs into chunks that stay visually consistent.
- Defining delivery: resolution, aspect ratio, frame rate, duration, container, and audio sync.

## Workflow

1. **Intent lock:** Genre, subject, environment, **camera grammar** (see pn-cinematography-lighting), and motion type (static camera vs dolly, handheld vs locked-off).
2. **Temporal strategy:** Single-pass short clip vs segmented generation with overlap and interpolation. Prefer shorter coherent segments over one impossibly long prompt.
3. **Motion language:** Describe **what moves** (subject, background, light) vs **camera** moves; conflating them causes mush. Use beats: establish → move → settle.
4. **Consistency:** Same seed or reference frame strategy where the pipeline supports it; anchor I2V on a strong first frame; avoid contradicting lighting between segments.
5. **I2V:** Start from a graded still that already matches the target look; declare what must stay fixed (wardrobe, set) vs what may evolve.
6. **Audio:** If narration or TTS is needed, run **`pn-tts`** before locking visuals. For caption track generation from rendered audio, run **`pn-transcribe`**. If dialogue or music matters, plan lip-sync or beat alignment **before** locking visuals; note when the tool chain has no audio model and manual edit is required.
7. **Delivery sheet:** Output width × height, fps (e.g. 24 / 25 / 30), duration, progressive vs interlaced (usually progressive), codec (e.g. H.264/H.265), color range (limited vs full), and whether the master is display-referred SDR or needs HDR metadata.

## Guardrails

- High fps and long duration explode VRAM and storage—scale tests on 0.5–1 s clips first.
- Fast motion and thin detail flicker; prefer motivated movement and readable silhouettes.
- Do not promise frame-perfect continuity unless the stack explicitly supports it; plan blend or re-generation for seams.

## Example prompts

**Cold start:**
> Using `pn-generative-video-pipelines`, create a 6-second cinematic product shot — luxury perfume bottle, soft key light from camera left, shallow focus, slow dolly forward. 1080p, H.264, 24fps.

**Warm start — turn a brief into a segmented pipeline:**
> I have a 30-second narrative in three beats. Use `pn-generative-video-pipelines` to plan a segmented T2V pipeline: seed anchor on beat 1, I2V handoff to beats 2 and 3, audio lip-sync plan via pn-tts.

**Format-specific:**
> Make a 9:16 social teaser (15s) using `pn-generative-video-pipelines` — handheld feel, overcast natural light, no dialogue, bed music only.

**Iterate:**
> Beat 2 has a lighting jump — adjust the I2V anchor frame and reseed that segment. Keep beats 1 and 3 unchanged.

## Integration

- **pn-generative-media-director** — Orchestrates shot and pipeline choices.
- **pn-comfyui-workflows** — Node graph layout, API, and resource wiring for video subgraphs.
- **pn-cinematography-lighting** — Vocabulary for lenses, light, and coverage in prompts.
- **pn-image-prompt-engineering** — Clause structure for models that accept long text conditioners.
- **pn-tts** — TTS narration audio; generate before locking visuals when dialogue is required.
- **pn-transcribe** — Caption track generation from rendered or TTS audio.
- **pn-video-lint** — Pre-render checklist: seed strategy, seam review, audio level, caption presence.
- **pn-html-to-video** — For deterministic, repeatable cuts (marketing, plugin demos, data viz) where same-input = identical-output is required. Prefer over this skill when the scene is authored HTML rather than model-generated footage.
