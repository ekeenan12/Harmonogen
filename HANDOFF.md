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

## Useful context

- Verification has been done via headless Chromium (Playwright) driving the
  built app and asserting on canvas pixel data / exported file contents —
  there's no committed test suite; tests were written ad hoc each session
  and lived in a scratch directory outside the repo. Worth formalizing into
  a real, committed test script if this keeps growing.
- Commits should be signed as `noreply@anthropic.com` / `Claude`, or GitHub
  marks them Unverified.
