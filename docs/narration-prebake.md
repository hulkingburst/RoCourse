# Pre-baked narration chunks

**Status: planned — no audio has been generated and none of this is implemented
yet.** This document is the roadmap for generating lesson narration offline
(Kokoro `am_michael` is the first target, any engine fits) and shipping it as
content-addressed files the app plays without synthesizing anything.

## Why this works with what already exists

The current pipeline (`src/components/lessons/read-aloud.tsx` →
`src/app/api/tts/route.ts` → `src/lib/narration.ts` / `src/lib/narration-cache.ts`)
is already shaped for this:

1. The button extracts the visible prose of the current step from the rendered
   DOM (`extractProseText`) and sends **one POST per step** with that text.
   No client-side chunking — one request, one step, one text.
2. The route runs `toNarrationText` (shared with the browser fallback), then
   looks up audio under a SHA-256 cache key derived from
   `voiceId + "\n" + modelId + "\n" + narrationText` — **content-addressed, so
   the key only depends on the words and the voice, never on who is listening.**
3. A cache hit skips ElevenLabs entirely. A pre-baked chunk is therefore just
   an MP3 that already sits at the key the route is about to look up.

So "pre-baking into the course" = generate the audio once, offline, store it
under the same key function, and make the route consult the pre-baked key
before it decides to synthesize.

## Target design

**Canonical chunk pair** (frozen; changing either re-keys every file):

| Constant | Value |
| --- | --- |
| chunk voice id | `kokoro:am_michael` |
| chunk model id | `kokoro-82m-v1.0` |

Both live as env vars with these defaults:
`NARRATION_CHUNK_VOICE_ID`, `NARRATION_CHUNK_MODEL_ID`.

**Lookup order at Read Aloud** (the only behavioral change):

```
pre-baked chunk hit  →  ElevenLabs synthesis (if a key exists)  →  browser voice
```

Two consequences worth designing for:

- A pre-baked hit must work **without `ELEVENLABS_API_KEY`** — that is exactly
  the Cloudflare deploy's current gap. The route currently 503s before it ever
  looks at the cache; the new order fixes that for free.
- A miss falls through to today's behavior (ElevenLabs if configured, else the
  existing 503 → browser fallback). Nothing regresses.

**Storage, in two steps:**

- **Phase A (do first): reuse the Vercel Blob store** under the existing
  `tts/{key}.mp3` prefix. No new schema, no client change, `findNarrationAudio`
  finds the chunks as ordinary cache entries.
- **Phase B (after R2 unblocks): R2 + manifest.** Upload chunks to R2 and emit
  `narration/manifest.json` (`{ key: url }`); the route resolves from the
  manifest instead of `list()`-ing a store. This removes the last runtime
  dependency on Vercel Blob and the stale-token failure mode. Not required for
  Phase A to ship.

**The client never changes.** It already plays a `{ url }` JSON response or raw
`audio/*` bytes; a pre-baked hit is indistinguishable from a cache hit.

## Implementation phases

### Phase 0 — worklist sweep (`scripts/narration-worklist.mjs`)

Exact inputs for the bake. `extractProseText` reads the **rendered DOM**
(glossary-term buttons, `data-narration-skip`, heading markers), so a
markdown-side re-parser would drift from what the app actually narrates — the
repo rule is one parser, never two.

The script (Playwright, dev-only dependency):

1. Serves all lessons: seed `localStorage` key `luau-learn:progress:v1` so every
   lesson reads complete (otherwise the stepper renders `LockedLesson` and the
   button doesn't exist).
2. For each lesson (`/lessons/{slug}`), clicks each step dot (sequential, so
   `maxActive` gating never bites), taps Read Aloud, and intercepts the POST to
   `/api/tts`, capturing `body.text`.
3. Fulfills each intercepted request with a tiny **valid** MP3 (a generated
   ~0.1s silent file). A 503 would trip the sticky `cloudNarrationFailed` flag
   from the iOS fix and skip the fetch on the next tap — a valid response never
   sets it, so one page load can capture all steps.
4. Writes `.narration/worklist.json` (gitignored):
   `[{ slug, step, text }]` in course/step order. Deterministic.

`npm run narration:worklist`. Expected size: 517 entries.

### Phase 1 — jobs (`scripts/narration-bake.mjs plan`)

Reads the worklist, runs the app's own `toNarrationText` (register the same
`@/`/`@content/` alias hook `scripts/generate-content-snapshot.mjs` uses — no
preprocessing re-implementation), computes the canonical key with
`narrationCacheKey`, and writes:

- `.narration/jobs.json`: `[{ key, narration, chars, slug, step }]`
- `narration-chunks/` (gitignored): where the generator writes `{key}.mp3`

Also flags any step whose narration exceeds `MAX_NARRATION_CHARS` (5,000) —
those cannot be served by one request today and need client-side chunking
first (none expected; assert rather than assume).

### Phase 2 — generation + upload

- Generation: `scripts/kokoro-generate.py` reads `jobs.json`, writes
  `narration-chunks/{key}.wav` with Kokoro (guide below), then converts to
  `{key}.mp3` (`libmp3lame -b:a 128k`, mono). Resumable: files that already
  exist are skipped.
- Upload: `scripts/narration-bake.mjs upload` — for each job whose MP3 exists,
  skip when `findNarrationAudio(key)` already finds the blob (as today's cache
  convention) else `saveNarrationAudio(key, bytes, "audio/mpeg")`. Prints a
  report: total / present / missing / chars.
- `report` subcommand re-prints coverage without uploading.

### Phase 3 — route lookup (`src/app/api/tts/route.ts`)

Reorder and extend, roughly:

```ts
const narration = toNarrationText(text);           // as today
if (narrationCacheAvailable()) {
  const chunkKey = narrationCacheKey(
    narration,
    process.env.NARRATION_CHUNK_VOICE_ID ?? "kokoro:am_michael",
    process.env.NARRATION_CHUNK_MODEL_ID ?? "kokoro-82m-v1.0"
  );
  const prebaked = await findNarrationAudio(chunkKey).catch(/* miss */ null);
  if (prebaked) return NextResponse.json({ url: prebaked, cached: true });
}
// existing behavior from here: require API key, rate-limit misses, synthesize
```

Verification: with `ELEVENLABS_API_KEY` unset, a step with a chunk plays from
the blob and a step without one still falls back to the browser voice; with the
key set, both paths work.

### Phase 4 — optional polish

- **Phoneme overrides.** Kokoro/misaki supports inline IPA overrides
  (`[word](/ipa/)`). A per-engine pronunciation pass in `src/lib/narration.ts`
  (Chunk profile vs ElevenLabs profile) can fix names like "Luau" without
  affecting the live pipeline.
- **Levels.** `ffmpeg -af loudnorm` at conversion keeps every chunk at a
  consistent loudness; do one normalization pass, not per-run drift.
- **Phase B storage** (R2 + manifest) when Cloudflare finishes billing.

## Reproducibility constants

| Setting | Value |
| --- | --- |
| Kokoro model | `hexgrad/Kokoro-82M` v1.0 (SHA `496dba11…`) |
| `lang_code` | `a` (American English) |
| voice | `am_michael` |
| speed | `1.0` |
| sample rate | 24,000 Hz mono |
| output | MP3, 128 kbps |
| granularity | one file per step (concatenate Kokoro's sentence segments) |

## Scale estimate (from the course measurement)

- 517 steps, ~222k characters of narration, ~3.7 hours of audio, ~210 MB of
  MP3 at 128 kbps.
- Generation is a one-time local job — hours on CPU, much faster on a GPU.
  No ElevenLabs credits are consumed at all for a Kokoro bake.

## Kokoro setup guide — Michael voice

Windows-first (this repo's dev machine); macOS/Linux differences noted inline.

### 1. Prerequisites

- **Python 3.10+ 64-bit** (`python --version`). 3.11/3.12 are safe choices.
- **ffmpeg** on PATH (WAV → MP3): `winget install Gyan.FFmpeg` — verify with
  `ffmpeg -version`.
- **espeak-ng** — optional for English, required for the English out-of-distribution
  fallback and all non-English languages. On Windows, download the latest
  `espeak-ng-*-x64.msi` from the espeak-ng GitHub releases and install it
  (default `C:\Program Files\espeak-ng\`).

### 2. Environment

Keep it out of the repo (or gitignore it):

```bash
python -m venv .venv-kokoro
source .venv-kokoro/Scripts/activate    # Windows Git Bash
# .venv-kokoro\Scripts\activate.bat     # cmd
# source .venv-kokoro/bin/activate      # macOS/Linux
python -m pip install --upgrade pip
pip install "kokoro>=0.9.4" soundfile
```

The first run downloads the weights (~330 MB, Hugging Face cache under
`%USERPROFILE%\.cache\huggingface`). GPU is optional — CPU is fine for an
82M-parameter model; CUDA users can install a CUDA `torch` build from
pytorch.org instead.

### 3. Smoke test (the actual Michael voice)

`scripts/kokoro-generate.py` will read `jobs.json`; for a first listen, this
five-liner is enough:

```python
from kokoro import KPipeline
import soundfile as sf

pipeline = KPipeline(lang_code="a")          # American English
text = "Welcome to RoCourse. Today we learn about the Studio GUI."

for i, (gs, ps, audio) in enumerate(pipeline(text, voice="am_michael", speed=1.0)):
    sf.write(f"michael-{i}.wav", audio, 24000)
```

Listen, then convert and check the result:

```bash
ffmpeg -i michael-0.wav -codec:a libmp3lame -b:a 128k michael-0.mp3
```

Notes:

- `am_michael` is the American-English male "Michael" voice. If it doesn't fit,
  sibling male voices are `am_adam`, `am_fenrir`, `am_puck`, `am_onyx`
  (swap the voice id; keep whatever you choose identical in the app constants
  and the bake).
- The generator yields one segment per sentence (`split_pattern` controls it).
  For one file per step, concatenate the segments (all 24 kHz mono) before
  writing, or `ffmpeg -f concat` after.
- Pronunciation fixes use inline IPA, e.g. `the [Luau](/ˈluːaʊ/) scripting
  language`. Bake-time overrides belong in the shared preprocessing pass
  (Phase 4) so the words and the audio stay in sync.

### 4. Batch pipeline

Once Phase 0/1 exist:

```bash
npm run narration:worklist                 # → .narration/worklist.json (517 steps)
node scripts/narration-bake.mjs plan       # → .narration/jobs.json + chunk dir
source .venv-kokoro/Scripts/activate
python scripts/kokoro-generate.py          # → narration-chunks/{key}.mp3 (resumable)
node scripts/narration-bake.mjs upload     # → Blob tts/{key}.mp3, skipping existing
```

Re-run any stage after editing lessons; keys only change where words changed.

## Verification checklist

- [ ] Worklist: 517 entries, no empty texts, order matches course/step order.
- [ ] Jobs: every job's narration equals `toNarrationText` of its worklist text;
      no step exceeds the 5,000-char narration cap.
- [ ] Audio: spot-check Michael samples against the visible step prose.
- [ ] Route: chunk hit with no API key returns `{ url, cached: true }`; miss
      without key still 503s; with key, behavior unchanged.
- [ ] Regression: edit a word in a lesson → that step's key changes → it falls
      back (ElevenLabs/browser) instead of playing stale audio.
- [ ] `npx tsc --noEmit` and `npx eslint .` clean.

## Open decisions

1. **Voice** — `am_michael` vs another Kokoro voice; decide before the first
   bake (re-baking on a voice change is the only expensive redo).
2. **Does ElevenLabs stay as the miss-fallback**, or should a miss go straight
   to the browser voice (no paid synthesis in production)?
3. **When to move storage to R2 + manifest** — Phase A works today; Phase B
   should land with the Cloudflare migration once R2 billing clears.
