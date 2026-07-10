# HarmonoGen

HarmonoGen is a deterministic generative-visuals app for producing abstract
background imagery and animation — built with music sets in mind. It renders
six mathematical generators to canvas, animates them with keyframes, seeded
drift, and continuous motion rates, and exports the result as HD stills or
mp4 clips. Everything is **deterministic**: the same settings, seed, or
prompt always produce the exact same output, so any clip can be regenerated
identically later — useful when rebuilding assets for a video timeline.

Everything runs locally in the browser. No API keys, no network calls.

**Contents:**
[Quick start](#quick-start) ·
[The interface](#the-interface) ·
[Generators](#generators) ·
[Animating](#animating-the-animate-tab) ·
[Exporting](#exporting) ·
[Projects](#projects) ·
[AI Dreamer](#ai-dreamer-prompt--animation)

## Quick start

**Prerequisites:** Node.js

```
npm install
npm run dev
```

Then open the printed local URL in Chrome or Edge (needed for mp4 export;
everything else works in any modern browser).

## The interface

- **Header pills** switch between the six generators. Each generator keeps
  its own settings and keyframes — switching back and forth loses nothing.
- **Controls tab** — the current generator's parameters, presets, and the
  **Export HD** button (1920×1080 PNG still of the current look).
- **AI Dreamer tab** — type a prompt, get a complete animation
  ([reference below](#ai-dreamer-prompt--animation)).
- **Animate tab** — keyframes, drift, playback, and mp4 export
  ([details below](#animating-the-animate-tab)).

A typical workflow: dial in a look on **Controls** (or dream one), capture
keyframes on **Animate**, preview with the scrubber, export.

## Generators

All six share a few common controls: **Color** (primary line/point color),
**Line Width**, **Opacity**, and **Color Cycle (hue/s)** — a motion rate
that continuously rotates the hue over the clip (0 = static color; 0.1 is a
slow, subtle shift; 0.5 completes a full rainbow every 2 seconds).

### Harmonograph

Simulates the classical drawing machine: damped pendulums on the X and Y
axes trace a curve while the paper optionally rotates on a turntable.

| Control | What it does |
|---|---|
| Duration (sec) | How long the simulated pen traces. Longer = denser, more layered figure (this is *trace* time, separate from clip length). |
| Resolution (Hz) | Samples per simulated second. Raise it if fast oscillators look jagged. |
| Turntable Speed / Damping | Rotates the whole figure as it draws; damping eases the rotation in. Even ±0.05 transforms a figure completely. |
| X/Y Oscillators (add/remove) | Each axis sums any number of damped sine waves. |
| — Freq (Hz) | The pendulum's frequency. **The frequency *ratio* between X and Y defines the figure**: small integer ratios (2:3, 3:4) give clean closed curves; slight detuning (2.00 vs 2.01) makes the figure slowly precess. |
| — Amp | The oscillator's contribution to the motion. |
| — Phase (rad) | Starting angle; π/2 offsets between X and Y open circles out of lines. |
| — Damping | Decay rate — how quickly that pendulum dies down, spiraling the trace inward. |

**Recommended starting points:** the `simple` preset (one oscillator per
axis, 2.01:3 ratio) shows the classic Lissajous-like figure; `rotary` adds
turntable rotation; `default` layers two oscillators per axis for a denser
weave. For animation, this generator responds beautifully to **drift** —
even 30% makes the figure breathe — and **draw-on** (the trace draws itself
across the clip) is its signature move.

### Attractor

Plots Clifford or De Jong strange attractors: hundreds of thousands of
iterations of a chaotic map, stippled into a smoky point cloud.

| Control | What it does |
|---|---|
| Model | Clifford or De Jong — two different map equations with different characters. |
| a, b, c, d | The map coefficients. **Extremely sensitive**: tiny changes reshape everything, and many combinations collapse to near-empty periodic orbits — use Randomize or the presets to find live ones. |
| Iterations | Points plotted. 100k previews fast; exports boost automatically for stills. More iterations + lower opacity = denser, smokier look. |
| Zoom | Scales the cloud in the frame. |
| Rotation / Spin Rate (rev/s) | Static orientation, and a motion rate that spins the whole cloud continuously. |
| Opacity | Keep low (0.2–0.4) — the density does the work. |

**Recommended:** start from the presets (`dragon`, `storm`, and `crystal`
are favorites). For animation, a **single keyframe + drift** is the best
recipe — drift wanders the coefficients within the chaotic zone so the
cloud continuously deforms. Keyframe morphs between *distant* presets are
handled by chaos-safe morphing (below), but nearby coefficient pairs morph
more organically.

**Chaos-safe morphs:** a straight line between two coefficient sets often
passes through regions where the orbit collapses (a near-empty frame).
Keyframe morphs probe orbit density along the path; dead stretches first
try a deterministic detour arc through coefficient space and otherwise
crossfade the two endpoint point clouds. Morphs between different models
(Clifford ↔ De Jong) always crossfade.

### Lissajous

The parametric curve family — `x = sin(a·t + φ)`, `y = sin(b·t)` — with
radial modulation and rotation layered on.

| Control | What it does |
|---|---|
| Freq X / Freq Y | The two frequencies. **Their ratio defines the figure**: 3:4 is the classic knot; equal values give circles/lines; non-integer ratios never close, filling in over many turns. |
| Phase | X-vs-Y phase offset; sweeps between the figure's degenerate and open forms. |
| Rotation / Spin Rate | Static orientation + continuous spin motion rate. |
| Mod Freq / Mod Depth | Radial modulation — multiplies the radius by a sine, bending the curve into rose/flower shapes. Depth 0 disables it. |
| Turns | How many 2π sweeps to trace. Non-integer frequency ratios need more turns to fill in. |
| Points | Sampling density of the polyline. |
| Phase Rate (cyc/s) | **The signature motion**: continuously sweeps the phase, making the figure endlessly reshape itself (classic oscilloscope precession). |

**Recommended:** `knot` and `rose` presets for shapes; `precession` for the
hypnotic continuously-morphing look (high turns + phase rate). Phase Rate
0.05–0.1 is mesmerizing without being busy.

### Crystal

N-fold symmetric recursive branching — snowflakes, ferns, frost lattices.
Each arm is a deterministic binary branch structure, repeated with
rotational symmetry and mirroring.

| Control | What it does |
|---|---|
| Symmetry (fold) | How many rotational copies of the arm (6 = snowflake, 3 = fern-like, 12 = starburst). |
| Branch Depth | Recursion depth. Each level doubles the segments — 7–9 is the sweet spot; 10 is very dense. |
| Branch Angle | Angle between child branches: narrow = feathery, wide = spiky/thorny. |
| Length Ratio | Child length ÷ parent length: higher = long wispy tips, lower = compact. |
| Spread | Tilts the base arm, skewing the whole lattice. |
| Jitter | Seeded per-branch angle variation — 0 is geometric, 0.2–0.3 looks naturally grown. |
| Structure Seed | Picks which jitter pattern you get. Same seed = same lattice, always. Randomize explores. |
| Growth | 0→1 fraction of the lattice grown from the center. **Keyframe this 0→1 to watch the crystal grow.** |
| Rotation / Spin Rate | Orientation + continuous spin. |
| Tumble Rate (flips/s) | Foreshortens the lattice like a coin flipping in 3D — the "falling snowflake" motion. |
| Offset X / Y | Moves the figure off-center; keyframe to glide it across frame. |

**Recommended:** `snowflake` with Growth keyframed 0→1 plus Spin Rate
~0.05 and Tumble Rate ~0.15 is the flagship animation. `fern` + jitter +
drift gives an organic swaying plant.

### Waves

Stacked ridgeline wave curves (think pulsar-plot album art) or string-art
chord envelopes, in two styles.

| Control | What it does |
|---|---|
| Style | **Ridgelines**: rows of flowing wave curves. **String Art**: straight chords whose envelope traces parabolas. |
| Rows / Density | Row count (ridgelines) or chord density (string art). |
| Amplitude | Wave height. |
| Wavelength | Long (2–3) = rolling swells; short (0.3–0.7) = choppy interference. |
| Curvature | Bends each row into a parabolic arc (ridgelines) or sets the rail angle (string art). |
| Phase / Flow | Static position along the wave cycle. |
| Flow Speed (cyc/s) | **The motion**: continuously advances the phase so the waves travel. Keyframe it to speed up or slow down seamlessly — the flow never jumps. |
| Row Spacing / Depth Falloff | Vertical spread, and how much the back rows fade/shrink for depth. |

**Recommended:** `ridgeline` with Flow Speed 0.1–0.2 for steady ambient
motion; keyframe Flow Speed low→high to build energy into a drop. `parabola`
and `cathedral` show the string-art side; sweep Phase or Flow Speed there to
make the envelope crawl.

### Helix

3D helix strands — coils, DNA, tornado funnels — projected with tilt and
perspective.

| Control | What it does |
|---|---|
| Strands | How many interleaved helices (each shaded slightly darker for depth). |
| Radius / Pitch | Coil width and vertical extent. |
| Turns | Revolutions along the strand. |
| Twist / Twist Rate (rev/s) | Static rotation of the whole coil + the continuous-spin motion rate. **Twist Rate is the signature motion** — the coil appears to rotate in 3D. |
| Tilt | Leans the helix axis toward/away from the camera. |
| Taper | Narrows the radius along the length (0.8+ = tornado funnel). |
| Perspective | Strength of the 3D projection — how much the far side shrinks. |
| Points | Sampling density across all strands. |

**Recommended:** `dna` with Twist Rate ~0.1; `tornado` with drift for an
unstable funnel; `coil` (16 turns, strong tilt) for a dense mechanical
spring look.

## Animating (the Animate tab)

Three independent layers of motion combine, all deterministic:

1. **Keyframes** — snapshots of the current generator params pinned to
   times. Dial in a look on Controls, scrub to a time, hit **Capture**. The
   engine smoothly interpolates *every* parameter between keyframes
   (`smooth` or `linear` easing). `Load` copies a keyframe back into the
   editor; `Set` overwrites it with the current editor state.
2. **Motion rates** — the "(rev/s)", "(cyc/s)", "(hue/s)" params. The engine
   integrates them into continuous phase, so a spinning/flowing/color-cycling
   look never jumps — and *keyframing a rate* produces smooth acceleration
   (e.g. waves flowing at 0.15 cyc/s ramping to 0.8 into a drop).
3. **Drift** — seeded slow wander layered on top of the keyframed values
   (frequencies, coefficients, angles…). A single keyframe + drift becomes
   an endlessly evolving loop. Same seed = same motion, forever; **Reseed**
   explores variations. Suggested amounts: 0.15 subtle, 0.3 noticeable,
   0.6 unstable/stormy.

**Draw-on** (checkbox) makes the figure draw itself across the clip — the
harmonograph trace plotting in real time, the crystal growing, the wave
rows appearing.

Clip settings: duration, 24/30/60 fps, and resolution presets (1080p,
square 1080×1080, vertical 1080×1920, 4K).

## Exporting

- **Export HD** (Controls tab): 1920×1080 PNG still of the current look
  (attractors automatically boost iterations for the still).
- **Export .mp4** (Animate tab): renders the clip frame-by-frame with the
  same deterministic engine as the preview — identical keyframes always
  produce an identical file. Encoding uses the browser's hardware H.264
  encoder via WebCodecs (Chrome/Edge; falls back to VP9-in-mp4 with a
  warning if H.264 is unavailable — note DaVinci Resolve may not import
  VP9).

## Projects

**Save .json / Load .json** (Animate tab) captures keyframes for *all*
generators, clip settings, and the drift seed — everything needed to
regenerate the exact same clip later or hand a look to someone else.
Projects saved by older versions load and migrate automatically.

## AI Dreamer (prompt → animation)

The AI Dreamer turns a text prompt into a complete animation — keyframes,
motion rates, and drift — for any generator, entirely offline. There is no
model and no API call: your prompt is hashed into a seed, that seed drives
every random choice, and any words the engine recognizes bias what gets
sampled. Unrecognized words are simply ignored. **The same prompt always
dreams the exact same clip**, so a prompt that worked can be written down
and regenerated identically months later.

Word matching is whole-word and case-insensitive ("glow" won't match
"glowing"; "Glowing" and "glowing" are the same).

### How a prompt gets built

1. **Subject nouns** pick which generator to use — if none match, the
   currently-selected generator is kept.
2. **Moods** set the color palette, motion-rate scaling, density, opacity,
   and how much drift the clip gets.
3. The generator's own **structure words** and base ranges sample its
   specific parameters (symmetry, wavelength, strand count…).
4. **Motion words** sample whichever of the generator's rate parameters
   they apply to (spin, flow, twist, hue cycle, tumble).
5. **Temporal words**, if present, turn the single dreamed look into a
   two-keyframe ramp across the clip's duration (growing from nothing,
   fading out, accelerating…).

Categories combine freely — one prompt can carry a subject, a mood, several
motion words, and a temporal word all at once. The result lands on the
Animate tab ready to scrub and export.

### Moods

If more than one mood matches, effects combine (palette takes the last
match; drift energy takes the strongest). No mood → drift defaults to 0.3.

| Word(s) | Palette | Effect |
|---|---|---|
| `calm`, `serene` | cool blues | motion rates halved, slightly sparser, low drift (0.15) |
| `gentle` | cool blues | motion rates halved, low drift (0.15) |
| `ambient` | cool blues | motion rates ×0.6, drift 0.2 |
| `chaotic`, `wild` | hot red/orange/purple | motion rates ×1.5, denser, drift 0.6 |
| `turbulent` | storm blue/purple | motion rates ×1.5, drift 0.6 |
| `stormy` | storm blue/purple | motion rates ×1.4, denser, drift 0.6 |
| `organic` | green/amber | drift 0.3 |
| `hypnotic`, `trance` | *(none forced)* | drift 0.25, steady rate scale |
| `driving`, `pulsing` | saturated cyan/magenta | motion rates ×1.8, drift 0.45 |
| `minimal` | *(none forced)* | density pushed low (fewer rows/strands/branches/points), thinner lines |
| `dense`, `layered`, `intricate` | *(none forced)* | density pushed high |
| `dark`, `brooding` | deep indigo/violet | opacity ×0.6 (brooding also sets drift 0.2) |
| `neon`, `electric` | neon cyan/magenta/lime | opacity ×1.2 (electric also motion rates ×1.4) |
| `icy` | pale ice blue/white | — |
| `fire`, `warm` | warm orange/red/amber | — |
| `ember` | warm orange/red/amber | opacity ×0.8 |
| `golden` | yellow/gold | — |
| `ocean`, `aqua` | ocean blue/teal | — |

### Motion words

Motion words sample a generator's rate parameters. Each word targets a
category of rate, and only applies if the current generator has one:

| Category | Generators that have it | What it drives |
|---|---|---|
| rotation-like | Attractor, Lissajous, Crystal (rotation), Helix (twist) | spin/twist rate |
| phase-like | Waves (flow), Lissajous (phase) | flow/phase rate |
| tumble | Crystal only | tumble rate (3D coin-flip wobble) |
| hue | every generator | color cycle rate |

| Word(s) | Targets | Typical rate sampled |
|---|---|---|
| `spinning`, `rotating` | rotation-like | 0.03–0.15 rev/s (either direction) |
| `twisting` | rotation-like | 0.05–0.2 rev/s (either direction) |
| `tumbling` | tumble | 0.05–0.2 flips/s |
| `falling` | tumble | 0.08–0.25 flips/s |
| `flowing` | phase-like | 0.1–0.4 cyc/s (either direction) |
| `streaming` | phase-like | 0.2–0.6 cyc/s (either direction) |
| `rolling` | phase-like | 0.08–0.25 cyc/s (either direction) |
| `prismatic` | hue | 0.05–0.2 hue/s |
| `rainbow` | hue | 0.1–0.3 hue/s |
| `shifting` | hue | 0.03–0.12 hue/s |
| `still`, `static`, `frozen` | *(all)* | forces every rate to 0 **and** drift to 0 — a genuinely static clip |

Why the categories matter: "flowing crystal" won't animate flow, because
Crystal has no phase-like rate — it needs "tumbling" or "spinning" instead.

### Temporal words

A temporal word makes the Dreamer build **two keyframes** (at 0s and the
clip's full duration) so the look evolves across the clip:

| Word(s) | Ramp produced |
|---|---|
| `growing`, `blooming`, `emerging`, `unfolding`, `building` | the generator's "grow" parameter (growth, turns, amplitude) ramps from near-zero to full |
| `fading`, `dissolving`, `vanishing` | opacity ramps down to near 0 |
| `accelerating`, `rising`, `intensifying` | every active motion rate ramps from 20% up to 160% of its sampled value |
| `collapsing`, `unwinding`, `shrinking`, `receding` | the reverse of growing: full down to near-zero |

No temporal word → a single keyframe (the clip still moves via rates and
drift, it just doesn't ramp toward a different look).

### Subjects (auto-switch generator)

Naming one of these switches to the matching generator, even if a different
one is selected. First match wins; no match keeps the current tab.

| Words | Generator |
|---|---|
| `snowflake(s)`, `frost`, `crystal(s)`, `crystalline`, `ice`, `icicle`, `fern`, `lattice` | Crystal |
| `ocean`, `sea`, `wave(s)`, `ripple(s)`, `tide`, `dune(s)`, `swell`, `ridgeline` | Waves |
| `spiral(s)`, `helix`, `helices`, `dna`, `coil`, `vortex`, `tornado`, `corkscrew` | Helix |
| `storm`, `nebula`, `smoke`, `particle(s)`, `dust`, `attractor` | Attractor |
| `pendulum(s)`, `orbit(s)`, `oscillation`, `harmonograph` | Harmonograph |
| `knot(s)`, `loop(s)`, `rose`, `rosette`, `figure`, `lissajous` | Lissajous |

### Per-generator structure words

These tune parameters specific to one generator, and only apply if that
generator ends up selected.

**Harmonograph** — no keyword table; the oscillator layout is built from
mood energy (higher energy → wider frequency/damping ranges, faster
turntable). Special words: `symmetric` / `balanced` mirror the Y oscillators
from X with a quarter-turn phase offset for a classically symmetric figure.

**Attractor** — no keyword table. A dreamed attractor **resamples
coefficients (up to 24 tries), checking each candidate's orbit density,
until it lands on a genuinely chaotic configuration** — a dreamed attractor
can never turn out as a collapsed, near-empty point cloud. The model
(Clifford vs. De Jong) is a ~70/30 random pick; density moods shift the
iteration count; matched palettes pick the color.

**Lissajous**

| Word(s) | Effect |
|---|---|
| `knot`, `knotted` | higher X/Y frequencies (5–9) — a tighter knotted figure |
| `rose`, `rosette` | strong radial modulation, more turns — a flower-like rose curve |
| `precessing` | fast phase rate, many turns and points — the slow-precessing look |
| `weave`, `woven` | gentle radial modulation, fewer turns |

**Crystal**

| Word(s) | Effect |
|---|---|
| `delicate` | deep branching (8–10), thin lines |
| `spiky`, `thorny` | wide branch angle |
| `snowflake` | forces 6-fold symmetry, low jitter |
| `star`, `starburst` | high symmetry (10–14 fold), shallow depth |
| `fern` | forces 3-fold symmetry, narrow angle, deep recursion |

**Waves**

| Word(s) | Effect |
|---|---|
| `parabola`, `parabolic`, `strings`, `stitched` | String Art style, denser |
| `swell` | long wavelength, higher amplitude |
| `choppy` | short wavelength |
| `interference` | dense rows with short wavelength |
| `cathedral` | String Art, strong negative curvature, very dense — tall arching look |

**Helix**

| Word(s) | Effect |
|---|---|
| `dna` | 2 strands, taller pitch — double-helix look |
| `tornado`, `vortex` | strong taper, more strands — funnel |
| `tight`, `coiled` | many turns (12–24) |
| `ribbon` | many thin strands |

### Worked examples

**"a spinning icy snowflake slowly growing"** — `snowflake` switches to
**Crystal** and forces 6-fold symmetry; `icy` picks the ice palette;
`growing` ramps `growth` 0→1 across the clip; `spinning` samples a gentle
spin rate. Result: a snowflake growing from nothing while slowly rotating.

**"driving neon waves flowing, prismatic, accelerating"** — `waves` picks
**Waves**; `driving` + `neon` give a saturated palette, scaled-up rates,
and drift ≈0.45; `flowing` samples flow speed; `prismatic` samples color
cycle; `accelerating` ramps both from 20% to 160% across the clip. Result:
ridgelines that start gentle and speed up into a color-cycling finish.

**"a hypnotic golden knot, precessing and spinning"** — `knot` picks
**Lissajous** with tighter frequencies; `golden` sets the palette;
`hypnotic` a steady mid drift; `precessing` a fast phase rate with many
turns; `spinning` adds rotation. Result: a gold knot that continuously
reshapes itself.

**"still golden parabola strings"** — no subject word, so the current
generator is kept (Waves here); `parabola`/`strings` switch to String Art
at high density; `golden` sets the palette; `still` zeroes every rate *and*
the drift. Result: a genuinely static frame — nothing moves for the whole
clip.

**"a chaotic storm of particles, prismatic"** — `storm`/`particles` pick
**Attractor**; `chaotic` biases hot palette and density; coefficients are
resampled until verifiably chaotic; `prismatic` adds hue cycling. Result: a
dense, hot-colored attractor whose color slowly cycles.

### Dreamer tips

- Categories stack freely — mix a subject, a mood, several motion words,
  and a temporal word in one prompt.
- An unmatched subject never errors — the Dreamer just biases whatever
  generator is open.
- `still`/`static`/`frozen` overrides everything: rates and drift go to
  zero regardless of other words.
- The seed comes from the literal prompt text, so small wording changes
  ("calm ocean" vs. "calm oceans") give different — but each individually
  reproducible — results.
