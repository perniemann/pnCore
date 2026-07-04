---
name: pn-video-lint
description: Pre-render checklist for video compositions and generative video deliverables — timing integrity, audio normalization, codec/delivery conformance, caption validity, asset resolution, and seed strategy. Run before every render pass.
---

# pn-video-lint

**Start every response with:** `[pn-command] 🔺`

Run this command before executing any video render. Walk the checklist below section by section. Output a pass (✓) or fail (✗) for each item; output a summary verdict at the end. If any item fails, **fix before rendering** — do not render a composition with known failures.

---

## 1. Composition timing

- [ ] **Total duration declared.** `data-composition-id` stage has a declared duration (or the framework config has `durationInFrames` / `totalDuration`).
- [ ] **All clips fit within duration.** For every clip: `data-start + data-duration ≤ composition total duration`. Flag any overrun.
- [ ] **No undefined gaps.** Check for unintentional black frames: gaps between clips where no background or fill is defined.
- [ ] **Track collision audit.** Two clips on the same `data-track-index` that overlap in time are intentional (verify). Accidental overlaps on dialogue or primary visual tracks are a bug.
- [ ] **Frame rate declared.** Composition config declares `fps` (e.g. 24 / 25 / 30). Confirm it matches the delivery sheet.

## 2. Audio

- [ ] **Narration normalized.** Dialogue / narration audio is normalized to −14 to −16 LUFS integrated; peaks ≤ −1 dBTP. If not yet normalized, run:
  ```bash
  ffmpeg -i narration.wav -af loudnorm=I=-14:TP=-1:LRA=11 narration-norm.wav
  ```
- [ ] **Music bed level.** Background music is ducked to −20 to −18 LUFS (or `data-volume="0.3"` to `0.5`) so dialogue remains intelligible. Verify the dialogue-to-music ratio is ≥ 10 dB.
- [ ] **No audio clipping.** All audio clips are below 0 dBFS. Check with `ffmpeg -i file.wav -af astats -f null -` and look for `Max level`.
- [ ] **Audio format matches pipeline.** All audio files are WAV (PCM 16-bit, 44.1 kHz or 48 kHz) or MP3 ≥ 192 kbps. Confirm sample rate matches composition audio pipeline.
- [ ] **Audio `data-start` aligned.** Each audio clip's `data-start` matches its intended entry cue in the composition timeline (not the raw file position).

## 3. Captions

- [ ] **Caption track present.** Any composition with dialogue, narration, or spoken content has an SRT or VTT file. If missing, run `pn-transcribe`.
- [ ] **Reading rate ≤ 17 CPS.** No caption block exceeds 17 characters per second for standard content (or 20 CPS for fast-paced social).
- [ ] **Max 42 characters per line.** No line wraps unexpectedly on a standard player.
- [ ] **Min 1.0s block duration.** No caption block displays for less than 1.0 seconds.
- [ ] **Gaps ≥ 0.2s.** At least 200ms between consecutive caption blocks.
- [ ] **Timestamps reference composition time.** Caption timestamps are offset by the audio clip's `data-start` — they reference the composed video, not the raw narration file.
- [ ] **Language tag set.** `srclang` attribute or VTT language header is present and correct.

## 4. Asset paths and resolution

- [ ] **All `src` paths resolve locally.** Every `<video>`, `<img>`, `<audio>` src is a local file path that exists on disk. Remote URLs fail during offline render.
- [ ] **Image resolution ≥ render resolution.** No image asset is upscaled more than 2× its native resolution in the composition (causes visible pixelation). For a 1920×1080 composition, hero images must be ≥ 960×540.
- [ ] **Video clip codec is decodable by the renderer.** Confirm clips are H.264/H.265 MP4 or WebM VP9 — not AV1 or HEVC without hardware support, which can cause black frames in Puppeteer/headless Chrome.
- [ ] **Font files present.** Any custom web fonts referenced in CSS are served locally (no Google Fonts CDN dependency during render — headless Chrome may block or time out on external requests).
- [ ] **No broken import paths.** All JS/CSS module imports in the composition HTML resolve without 404.

## 5. Delivery sheet conformance

Compare the composition config against the declared delivery sheet:

- [ ] **Width × Height** matches delivery sheet exactly (e.g. 1920×1080 or 1080×1920).
- [ ] **FPS** matches delivery sheet.
- [ ] **Codec** is set in render config (H.264 for web; ProRes 4444 for master).
- [ ] **Color range** is declared: limited (16–235) for broadcast/device targets; full for web-only.
- [ ] **Output container** is correct (`.mp4` for H.264/H.265; `.mov` for ProRes).
- [ ] **Pixel aspect ratio** is 1:1 square pixels (default for digital; declare explicitly if otherwise).

## 6. Reproducibility (deterministic compositions)

- [ ] **Seed declared.** Any random or noise-based animation has a fixed seed documented in the composition config or code.
- [ ] **Frame Adapter seek confirmed.** The animation runtime exposes a `seekTo(timeSeconds)` method and the capture engine calls it — not `requestAnimationFrame`. Confirm via the adapter's `isReady()` contract.
- [ ] **No external fetches at render time.** No `fetch()`, `XMLHttpRequest`, or dynamic `import()` calls that depend on network during the render pass.

## 7. Generative video (additional, for pn-generative-video-pipelines outputs)

- [ ] **Seed strategy documented.** Fixed seed for A/B comparison; documented variation range when exploring. Confirm seed recorded in the delivery notes.
- [ ] **Segment seams reviewed.** If the output is segmented (multiple clips merged), seams were reviewed visually before final export.
- [ ] **Blend / fade at seams.** Seams between segments have an explicit blend or cut decision; no abrupt lighting jump without intent.
- [ ] **Audio plan locked before visual.** Lip-sync or beat alignment was confirmed before the final visual render, not after.

---

## Summary verdict

After walking all items, output:

```text
pn-video-lint: PASS — all checks cleared. Proceed to render.
```

or:

```text
pn-video-lint: FAIL — [N] issues found:
  ✗ Caption track missing
  ✗ narration.wav peaks at +1.2 dBTP — re-normalize
  ✗ assets/hero.png is 480×270, below 50% of 1920×1080 threshold
Fix all failures before rendering.
```

Do not proceed to render on FAIL. Re-run this command after fixes.
