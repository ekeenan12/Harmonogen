

# Run the offline HarmonoGen app

This app now uses a local, deterministic prompt generator (no external API keys required).

## Generators

Six deterministic generators, switchable in the header. Each has presets,
schema-driven controls, keyframe morphing, drift, draw-on (where noted), HD
still export, and mp4 animation export:

- **Harmonograph** — damped X/Y oscillator sums with a rotating turntable (draw-on)
- **Attractor** — Clifford / De Jong chaotic maps with chaos-safe morphing (see below)
- **Lissajous** — parametric curve family with radial modulation and rotation (draw-on)
- **Crystal** — N-fold symmetric recursive branching lattices, seeded jitter, growth (draw-on)
- **Waves** — ridgeline wave stacks or string-art parabola envelopes (draw-on)
- **Helix** — 3D helix strands projected with tilt/perspective, twist and taper (draw-on)

New generators are one module each in `generators/` implementing render, lerp,
drift, presets, and a control schema.

### Motion rates

Each generator exposes *rate* parameters — Spin Rate, Tumble Rate, Flow Speed,
Twist Rate, Phase Rate, Color Cycle — that the engine integrates over the clip
into continuous phase. Because the integral is exact per keyframe segment,
keyframing a rate produces smooth acceleration with no jumps: waves can flow
steadily and then ramp up, a crystal can grow while tumbling, colors can cycle
hue at a fixed rate. Rates are ordinary params, so they work with keyframes,
drift, presets, and project files like everything else.

### Chaos-safe attractor morphs

A straight line between two attractor coefficient sets often passes through
regions where the orbit collapses to a periodic cycle (a near-empty frame).
Keyframe morphs probe orbit density along the path; dead stretches first try a
deterministic detour arc through coefficient space and otherwise crossfade the
two endpoint point clouds. Morphs between different models (Clifford ↔ De
Jong) always crossfade.

## Run Locally

**Prerequisites:**  Node.js


1. Install dependencies:
   `npm install`
2. Run the app:
   `npm run dev`

## AI Dreamer (offline prompt → animation)

The "AI Dreamer" panel turns a text prompt into a complete animation —
keyframes, motion rates, and drift — for any generator, with no network or
API keys. The prompt is hashed into a seed, recognized words steer the
result, and a seeded RNG picks concrete values, so the same prompt always
dreams the same clip: e.g. *"a spinning icy snowflake slowly growing"*
switches to Crystal, builds a 6-fold flake in an ice palette, ramps growth
0→1 across the clip, and sets a gentle spin — landing on the Animate tab
ready to export. Dreamed attractors resample coefficients until the orbit is
verifiably chaotic, so a prompt never produces a collapsed point cloud.

See **[docs/ai-dreamer.md](docs/ai-dreamer.md)** for the full keyword
reference — every mood, motion word, temporal word, subject noun, and
per-generator structure word, plus several worked examples.

## Animation & mp4 export

The **Animate** tab turns any configuration into a deterministic video clip:

1. Dial in a look on the **Controls** tab (or use AI Dreamer / presets).
2. On the **Animate** tab, scrub to a time and **Capture** it as a keyframe.
3. Repeat with different looks at different times — the engine smoothly morphs
   every parameter (oscillators, colors, turntable, attractor coefficients)
   between keyframes. Choose `smooth` or `linear` easing.
4. Optionally enable **Draw-on** (harmonograph) so the trace draws itself
   across the clip.
5. Preview with the scrubber / Play, then **Export** to `.mp4`.

Export renders frame-by-frame with the same pure interpolation engine as the
preview, so the same keyframes always produce the same clip — useful when
regenerating assets for a video timeline. Encoding uses the browser's WebCodecs
H.264 encoder (Chrome/Edge; falls back to VP9 if H.264 is unavailable).
Resolution presets: 1080p, square, vertical, and 4K at 24/30/60 fps.

### Drift

The **Drift** slider layers slow, seeded sinusoidal wander on top of the
keyframed values (oscillator amplitudes/frequencies/phases, turntable speed,
attractor coefficients, zoom). A single keyframe plus drift becomes an
endlessly evolving loop — and because the wander is derived from the seed,
the same seed always produces the same motion. Hit **Reseed** to explore
variations.

### Projects

**Save .json / Load .json** on the Animate tab captures keyframes, clip
settings, and the drift seed — everything needed to regenerate the exact same
clip later or hand a look to someone else.
