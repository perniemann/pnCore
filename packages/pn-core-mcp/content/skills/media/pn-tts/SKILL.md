---
name: pn-tts
description: "Text-to-speech for video and audio production. Covers tool selection (ElevenLabs, OpenAI, Kokoro/local), voice and model choice, SSML expressivity, caption-track alignment (SRT/VTT), loudness normalization, retry strategy, and accessibility requirements. Use when a composition or generative video needs narration audio before assembly."
---

# Text-to-speech (TTS)

## When to use

- A video composition (`pn-html-to-video` or `pn-generative-video-pipelines`) requires narration audio before render.
- A marketing cut, demo video, or social reel needs voiceover without a recording studio.
- Captions or subtitle tracks must be derived from narration timing (feed output into `pn-transcribe`).
- Localized variants need the same script in multiple languages or voice styles.

## Tool selection

| Tool | Model / tier | Best fit | Notes |
|------|-------------|----------|-------|
| **ElevenLabs** | Multilingual v3, Flash v2.5 | Highest prosody quality, voice cloning, streaming | Paid; Flash tier cheaper for batch; supports SSML subset |
| **OpenAI TTS** | `tts-1`, `tts-1-hd` | Fast, API-simple, good for short clips | No SSML; `tts-1-hd` for delivery masters; 6 built-in voices |
| **Kokoro / TTS-1 local** | Kokoro-82M or similar ONNX | Air-gapped, no cost per character, repeatable | Requires local model; quality below ElevenLabs on nuanced prosody |
| **Azure / Google Cloud TTS** | Neural2, Azure Neural | Enterprise compliance, 100+ languages, WaveNet | SSML full support; cost at scale |

**Default recommendation:** ElevenLabs (quality-first) or OpenAI TTS-1-hd (API-simple). Use local only when the content is sensitive or offline is required.

## Voice specification

Declare before generating:
- **Voice ID or name** — lock it; do not let the API pick a random default.
- **Language and locale** — `en-US` vs `en-GB` vs `de-DE`; accent matters for credibility.
- **Speaking rate** — `0.9`–`1.1` for narration; `0.85` for slower explanatory content.
- **Stability / similarity / expressiveness** (ElevenLabs) — stability 0.5–0.65 for engaging narration; similarity 0.75–0.85; expressiveness 0.5–0.7.

## Script preparation

1. **One sentence per line** in the input text. This makes timestamp alignment easier and limits runaway prosody errors.
2. **Punctuation drives prosody.** Em dashes (`—`) create pause-like pauses; ellipsis (`...`) elongates final syllable; question marks raise inflection. Use deliberately.
3. **Numbers and abbreviations:** Spell out what the model may mispronounce (`$1,200` → "twelve hundred dollars"; `API` → "A-P-I" or "ay-pee-eye" depending on brand).
4. **Maximum chunk length:** Many APIs cap at 5 000 characters. Split at natural paragraph breaks; plan overlapping 0.5s fade edges when concatenating.

## SSML (where supported)

```xml
<speak>
  <prosody rate="slow" pitch="-2st">Welcome back.</prosody>
  <break time="600ms"/>
  Today we're covering
  <emphasis level="strong">three key features</emphasis>
  that ship in version two.
  <break time="400ms"/>
  <prosody rate="medium">Let's get started.</prosody>
</speak>
```

SSML support by tool:
- ElevenLabs: partial (`<break>`, `<phoneme>`; no `<prosody>` rate/pitch in all models).
- Azure / Google: full SSML including `<prosody>`, `<emphasis>`, `<say-as>`.
- OpenAI TTS: no SSML; use plain text with punctuation for prosody shaping.

## Audio output contract

| Parameter | Target |
|-----------|--------|
| Format | WAV (PCM 16-bit) or MP3 (192 kbps) for assembly; lossless preferred for master |
| Sample rate | 44 100 Hz or 48 000 Hz; match the composition's audio pipeline |
| Channels | Mono for dialogue; stereo only if the tool generates stereo |
| Loudness (integrated) | −16 to −14 LUFS for voice-over; normalize with ffmpeg loudnorm or similar |
| Peak ceiling | −1 dBTP (true peak) to avoid inter-sample clipping |
| Silence padding | 250ms head/tail to avoid hard starts at composition data-start |

Normalize before assembly:
```bash
ffmpeg -i narration-raw.wav -af loudnorm=I=-14:TP=-1:LRA=11 narration.wav
```

## Alignment for captions

After generating audio, run `pn-transcribe` with the narration audio to produce a word-level SRT/VTT. This gives you caption timestamps tied to the actual rendered audio — not the input script.

If caption timing must be locked to script structure (e.g. slide-by-slide), use a forced-alignment tool (Whisper forced alignment, Gentle, or ElevenLabs timestamps API) rather than free transcription.

## Retry strategy

1. **On mispronunciation:** Add a phoneme hint in SSML or re-spell the word phonetically in plain text. Retry the affected sentence only.
2. **On robotic prosody:** Lower stability (ElevenLabs) or switch to a more expressive model tier.
3. **On hallucinated words:** Check for ambiguous abbreviations or special characters; clean the script and regenerate. Do not post-edit audio with splice — regenerate the sentence.
4. **On silence gaps mid-sentence:** The API split the chunk at an unexpected boundary; adjust chunk boundaries to end on full sentences.

## Accessibility

- Captions are **required** for any public-facing video. Feed the rendered audio into `pn-transcribe` to produce the caption track.
- Do not rely on auto-captioning from a script guess — always derive captions from the rendered audio timestamps.
- Caption reading rate: ≤ 17 characters per second (CPS) for standard accessibility; subtitle tools like `ffmpeg` subtitle filter or Whisper timestamp alignment enforce this automatically if word-level timestamps are used.

## Example prompts

**Cold start:**
> Using `pn-tts`, generate narration for my 30-second plugin demo. Script is in `docs/demo-script.txt`. Use ElevenLabs, English US, authoritative but warm tone, −14 LUFS output.

**Localized variant:**
> Take the narration I just generated and produce a German version using the same ElevenLabs voice family — `pn-tts`, `de-DE`, same loudness target.

**Iterate:**
> The phrase "API endpoint" sounds wrong — respell it as "ay-pee-eye endpoint" and regenerate that sentence only.

## Integration

- **pn-html-to-video** — Primary consumer; wire narration audio as an `<audio>` clip with `data-start` aligned to the composition timeline.
- **pn-generative-video-pipelines** — Audio step 6; replaces the inline prose in that skill.
- **pn-transcribe** — Run after TTS to produce timestamped SRT/VTT caption tracks.
- **pn-video-lint** — Checks audio normalization and caption presence before render.

## Sources

- ElevenLabs API — https://elevenlabs.io/docs/api-reference/text-to-speech
- OpenAI TTS — https://platform.openai.com/docs/guides/text-to-speech
- Kokoro TTS — https://github.com/remsky/Kokoro-FastAPI
- ffmpeg loudnorm — https://ffmpeg.org/ffmpeg-filters.html#loudnorm
- EBU R128 loudness standard — https://tech.ebu.ch/docs/r/r128.pdf
