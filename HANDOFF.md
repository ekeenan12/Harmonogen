# Handoff notes

This file is a short "where to pick up" pointer for a new session — not user
documentation. For how the app actually works (generators, controls,
animation, export, AI Dreamer), see **README.md**; that's the full manual
and it's kept current.

## Current state

Everything is merged on `main` (9 PRs, see git log for the full history).
No open branches, nothing pending. `npm install && npm run dev` to run it;
mp4 export needs Chrome/Edge for hardware H.264 (falls back to VP9-in-mp4
with a warning otherwise).

## Expansion ideas not yet built

Roughly ordered by how often they came up as "the next thing" in discussion:

1. **Batch export** — queue several saved project `.json` files (or several
   named segments) and render them all to clips in one pass, instead of one
   clip at a time through the UI. Likely the highest-value next step once
   producing a full set of clips for a timeline.
2. **Cue/timestamp list per project** — name segments with start/end times
   so exported clip filenames line up with markers on a DaVinci Resolve
   timeline. This was the original motivating use case for the whole app
   (visuals synced to musical transitions); Resolve automation itself
   (markers, adjustment-clip transitions, timeline placement) is explicitly
   a **separate project** per the user, out of scope here.
3. **Headless CLI render path** — a Node script rendering frames off-screen
   to ffmpeg, instead of the in-browser WebCodecs exporter. More robust for
   very long or 4K/60 clips and scriptable/batchable outside a browser tab.
   The in-browser exporter was chosen first for speed of iteration; this
   remains a heavier but more production-grade alternative.
4. **PNG sequence export** — lossless alternative to mp4, for dropping
   straight into Resolve as an image sequence.
5. **Audio-file scrubbing** — load an audio track locally just to preview
   visuals against it while authoring (no beat detection or analysis, just
   playback sync) — useful for eyeballing whether a clip's motion pacing
   feels right against the music before exporting.

## Generator ideas not yet built

Proposed during the generator-expansion design round; the user chose
Lissajous / Crystal / Waves / Helix instead, but these remain good
candidates. Each would be one new module in `generators/` implementing the
existing `GeneratorDef` interface (render, lerp, drift, presets, control
schema, motion rates, dream spec) — the registry means nothing else needs
touching.

- **Flow fields** — seeded noise-driven particle trails: organic, painterly
  streams, a very different texture from the geometric curves. Great for
  ambient sections. Deterministic via seeded noise; particle count is the
  natural density param, field-evolution speed the natural motion rate.
- **Julia set zooms** — classic fractal dives. Deterministic zoom/rotation
  animations through Julia/Mandelbrot parameter space; zoom rate and
  c-parameter orbits fit the motion-rate system naturally. Heavier per
  frame but iconic.
- **Fractal flames (IFS)** — iterated function systems with log-density
  coloring: rich, smoky imagery, the most striking stills of anything
  proposed. Related to the existing Attractor but needs a heavier render
  pipeline (histogram accumulation + tone mapping) rather than direct
  point stippling.
- **Spirograph / epitrochoids** — the rolling-circle roulette family.
  Lissajous with radial modulation covers some of this territory, but true
  epicycloids/hypotrochoids are a distinct look; gear-ratio params morph
  beautifully.
- **Crystal `lean` axis** — small one: a second 3D foreshortening axis for
  the crystal (it has spin + coin-flip tumble; a perpendicular lean would
  complete the tumbling-in-3D illusion).

## AI Dreamer extension ideas

- **LLM-backed Dreamer mode (optional)** — the current Dreamer is keyword
  mapping. For free-form prompts beyond the vocabulary ("the feeling of a
  train leaving a station in the rain"), an optional mode could call an
  LLM (e.g. Claude API) to emit params/keyframes JSON. Trade-offs discussed:
  needs an API key and network, costs money, and responses must be cached
  so regeneration stays deterministic. The offline keyword engine should
  remain the default; this would be a supplement, not a replacement.
- **Vocabulary growth** — the keyword tables (`services/dreamer.ts` and
  each generator's `dream.keywords`) are designed to grow cheaply; add
  words as the user discovers which ones they reach for. The README's
  Dreamer reference must be updated in lockstep — it's transcribed from
  those tables.

## Useful context

- Verification has been done via headless Chromium (Playwright) driving the
  built app and asserting on canvas pixel data / exported file contents —
  there's no committed test suite; tests were written ad hoc each session
  and lived in a scratch directory outside the repo. Worth formalizing into
  a real, committed test script if this keeps growing.
- Commits should be signed as `noreply@anthropic.com` / `Claude`, or GitHub
  marks them Unverified.
