---
name: pn-html-to-video
description: "Deterministic, programmatic video from HTML compositions. Covers the HTML composition contract (data-start, data-duration, data-track-index), Frame Adapter pattern (GSAP / Lottie / CSS / Three.js), Puppeteer+FFmpeg capture pipeline, delivery sheet, and tool selection (Hyperframes / Remotion / Motion Canvas). Use when repeatability and pixel-exactness matter more than generative variety — product demos, marketing cuts, social variants, data-driven explainers. Use pn-generative-video-pipelines for T2V/I2V creative generation."
---

# HTML-to-video (programmatic video)

## When to use

- Repeatable marketing cuts, plugin demos, changelog videos, social variants where **same input = identical output** is a requirement.
- Data-driven explainers: chart races, annotated screen recordings, caption-synced narration.
- You own the visual — it is an HTML/CSS/JS layout you authored, not a model-generated scene.
- Animation runtime is already GSAP, Lottie, CSS, or Three.js and you want to record it frame-accurately.

**Use `pn-generative-video-pipelines` instead** when the scene must be invented by a model (characters, environments, stylized footage) and some frame-to-frame variation is acceptable.

## Stack comparison

| Tool | Model | Key fit | Requires |
|------|-------|---------|----------|
| **Hyperframes** (heygen-com/hyperframes) | HTML + `data-*` attributes, Puppeteer+FFmpeg, Frame Adapters | Agents, non-interactive CLI, catalog blocks, GSAP/Lottie/Three.js | Node ≥22, FFmpeg |
| **Remotion** | React components as frames, `<Video>`, `<Audio>`, `<Sequence>` | React-native teams, programmatic lambda render | Node, ffmpeg |
| **Motion Canvas** | TypeScript scene graph, imperative animation primitives | Precise mathematical animation, explainer-style graphics | Node, ffmpeg |

Choose **Hyperframes** when the agent is authoring compositions autonomously (non-interactive CLI, catalog `hyperframes add`), or when the composition is HTML-first.
Choose **Remotion** when the codebase is already React and the team prefers component-based composition.
Choose **Motion Canvas** when the animation is diagram- or explainer-heavy with precise timing control.

## HTML composition contract

All three tools share a similar concept: a *stage* with timed *clips*. The canonical attributes (illustrated via Hyperframes) are:

```html
<!-- Stage declares composition identity and dimensions -->
<div id="stage"
     data-composition-id="my-video"
     data-start="0"
     data-width="1920"
     data-height="1080">

  <!-- Video clip on track 0 -->
  <video
    id="clip-1"
    data-start="0"
    data-duration="5"
    data-track-index="0"
    src="intro.mp4"
    muted playsinline>
  </video>

  <!-- Image overlay on track 1, appears at 2s -->
  <img
    id="overlay"
    class="clip"
    data-start="2"
    data-duration="3"
    data-track-index="1"
    src="logo.png">

  <!-- Audio bed on track 2 at 50% volume -->
  <audio
    id="bg-music"
    data-start="0"
    data-duration="9"
    data-track-index="2"
    data-volume="0.5"
    src="music.wav">
  </audio>
</div>
```

**Rules:**
- `data-start` and `data-duration` are in seconds.
- Higher `data-track-index` renders on top.
- Audio clips accept `data-volume` (0.0–1.0); leave at 1.0 for dialogue, 0.3–0.5 for beds.
- All asset `src` paths must resolve locally — no remote URLs in the render pass.

## Frame Adapter pattern

A Frame Adapter wraps an animation runtime and exposes two hooks the capture engine calls:
1. **`seekTo(timeSeconds)`** — jump the runtime to an exact frame (no requestAnimationFrame drift).
2. **`isReady()`** — signal that all assets, fonts, and textures have loaded.

Common adapters and their native fit:

| Adapter | Best for | Notes |
|---------|----------|-------|
| **GSAP** | Timeline sequences, scroll-choreography recording, stagger reveals | Use `gsap.globalTimeline.time(t)` in seekTo; see `pn-gsap` for API detail |
| **Lottie / dotLottie** | Designer-authored vector loops, icon animations, After Effects exports | Seek via `animationItem.goToAndStop(frame, true)` |
| **CSS** | Simple fade/slide transitions, no JS dependency | Achieved via `document.getAnimations().forEach(a => { a.currentTime = t * 1000 })` |
| **Three.js / WebGL** | 3-D scene recording, shader transitions | Manually advance mixer and render each frame; GPU readback via `gl.readPixels` or Puppeteer screenshot |

## Workflow

1. **Composition spec:** Declare width × height, total duration, aspect ratio (16:9 / 9:16 / 1:1), fps target (24 / 25 / 30). Apply `pn-cinematography-lighting` vocabulary when the composition includes scene imagery.
2. **Asset inventory:** List all `src` assets (video clips, images, audio, fonts). Confirm local paths. Generate or procure any missing assets via `pn-assets-manager` before building the composition.
3. **Track layout:** Map clips to tracks; higher track = higher z-order. Avoid track collisions unless intentional overlap.
4. **Animation layer:** Choose Frame Adapter and wire it. Load `pn-gsap` for GSAP timelines; defer to `pn-svg-creator` Lottie path for JSON animations.
5. **Audio:** If TTS narration is needed, run `pn-tts` before assembly. If existing audio needs transcript/captions, run `pn-transcribe`. Align audio `data-start` to narration cues before rendering.
6. **Lint before render:** Run `pn-video-lint` — check track timing sums, audio levels, asset resolution, caption presence.
7. **Render:** Use the chosen CLI (`hyperframes render` / `npx remotion render` / `motion-canvas render`). Verify codec, fps, and color range against the delivery sheet below.
8. **Delivery sheet** (declare before starting, verify after rendering):

   | Parameter | Typical value | Notes |
   |-----------|---------------|-------|
   | Width × Height | 1920×1080 (or 1080×1920 for 9:16) | Must match stage data attributes |
   | FPS | 24 or 30 | 24 for cinematic feel; 30 for screencasts |
   | Duration | Explicit (e.g. 30s) | All clips must fit within |
   | Codec | H.264 (web delivery) / ProRes 4444 (master) | |
   | Color range | Limited (16–235) for broadcast; Full for web | |
   | Audio normalization | −14 LUFS integrated; peaks ≤ −1 dBTP | Verify with ffmpeg loudnorm |

## Guardrails

- Never start a render pass without all asset `src` paths resolving — broken refs produce blank frames, not errors.
- Frame-accurate seek requires the Frame Adapter; if the runtime lacks seek support, record in real-time (much slower) or switch adapter.
- High-resolution + high-fps + long duration = large intermediates. Test at 720p / 5s before a full 1080p / 60s run.
- Three.js / WebGL adapters can have GPU readback bottlenecks; benchmark before committing to a resolution.
- Do not commit rendered MP4s to the repo; treat `dist/` or `out/` as gitignored build artifacts.

## Example prompts

**Cold start — describe the video you want:**
> Using `pn-html-to-video`, create a 30-second product demo for my Cursor plugin. Fade-in title, animated feature list reveal, narrated by TTS, 16:9, 1080p.

**Warm start — turn existing context into a composition:**
> I have a landing page at `src/app/page.tsx` — use `pn-html-to-video` to record the hero section scroll animation as a 10-second 9:16 social cut.

> Take this data CSV and turn it into an animated 20-second bar chart race using `pn-html-to-video` with Motion Canvas.

**Format-specific:**
> Make a 9:16 TikTok-style hook with bouncy captions synced to a TTS narration using `pn-html-to-video`, 15 seconds.

**Iterate:**
> The title card is too fast — extend it to 3 seconds and add a subtle GSAP scale-in.
> Swap the background from white to `var(--color-surface-dark)` and re-render.

## Phase 2 (deferred)

A creative blocks registry — installable HTML composition templates for common formats (lower thirds, countdown timers, social overlays, shader transitions, animated data cards) analogous to `hyperframes add flash-through-white`. Candidate blocks: lower-third, social-follow-overlay, countdown, caption-track, bar-chart-race, text-reveal-title.

## Integration

- **pn-gsap** — Timeline authoring for GSAP Frame Adapter sequences.
- **pn-svg-creator** — Lottie / dotLottie animated vector assets within compositions.
- **pn-tts** — Generate narration audio before assembly.
- **pn-transcribe** — Caption track generation from narration audio.
- **pn-video-lint** — Pre-render composition checklist.
- **pn-cinematography-lighting** — Shot and lighting vocabulary for scene imagery in compositions.
- **pn-assets-manager** — Asset procurement (images, SVGs, placeholder clips).
- **pn-generative-video-pipelines** — When the scene requires AI-generated footage rather than authored HTML.

## Sources

- Hyperframes — https://github.com/heygen-com/hyperframes
- Remotion — https://www.remotion.dev/docs
- Motion Canvas — https://motioncanvas.io/docs
