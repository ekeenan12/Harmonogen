# AI Dreamer keyword reference

The AI Dreamer turns a text prompt into a complete animation — keyframes,
motion rates, and drift — for any generator, entirely offline. There is no
model and no API call: your prompt is hashed (FNV-1a) into a seed, that seed
drives every random choice, and any words the engine recognizes bias what
gets sampled. Unrecognized words are simply ignored. **The same prompt always
dreams the exact same clip**, so you can write down a prompt that worked and
regenerate the identical animation months later.

This page lists every recognized word, grouped the way the engine actually
processes them (`services/dreamer.ts`), plus worked examples. Word matching
is whole-word and case-insensitive, so "glow" won't match "glowing", but
"Glowing" and "glowing" are the same.

## How a prompt gets built

1. **Subject nouns** (below) pick which generator to use — if none match,
   the currently-selected generator is kept.
2. **Moods** set the color palette, motion-rate scaling, density, opacity,
   and how much drift (seeded wander) the clip gets.
3. The generator's own **structure words** and base ranges sample its
   specific parameters (symmetry, wavelength, strand count, etc.).
4. **Motion words** sample whichever of the generator's rate parameters they
   apply to (spin, flow, twist, hue cycle, tumble).
5. **Temporal words**, if present, turn the single dreamed look into a
   two-keyframe ramp across the clip's duration (e.g. growing from nothing,
   fading out, accelerating).

Categories combine freely — a single prompt can carry a subject, a mood,
several motion words, and a temporal word all at once.

## Moods

Moods set the palette and the overall energy of the clip. If more than one
mood matches, their effects combine (palette takes the last match; energy
takes the strongest).

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

If no mood matches, drift defaults to **0.3**.

## Motion words

Motion words sample a generator's *rate* parameters — the ones that animate
continuously over the clip (see the main README's Motion Rates section).
Each word targets a category of rate, and only applies if the current
generator actually has a rate in that category:

| Category | Generators that have it | What it drives |
|---|---|---|
| rotation-like | Attractor (rotation), Lissajous (rotation), Crystal (rotation), Helix (twist) | spin/twist rate |
| phase-like | Waves (phase), Lissajous (phase) | flow/phase rate |
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
| `still`, `static`, `frozen` | *(all)* | forces every rate to 0 **and** forces drift to 0 — a genuinely static, unmoving clip |

Example of why this matters: "flowing crystal" won't animate flow, because
Crystal has no phase-like rate — it would need "tumbling" or "spinning"
instead.

## Temporal words

If a temporal word is present, the Dreamer builds **two keyframes** (at 0s
and at the clip's full duration) instead of one, so the look evolves across
the clip:

| Word(s) | Ramp produced |
|---|---|
| `growing`, `blooming`, `emerging`, `unfolding`, `building` | the generator's "grow" parameter (growth, turns, amplitude — whichever it declares) ramps from near-zero up to its full value |
| `fading`, `dissolving`, `vanishing` | opacity ramps down to near 0 |
| `accelerating`, `rising`, `intensifying` | every active motion rate ramps from 20% up to 160% of its sampled value |
| `collapsing`, `unwinding`, `shrinking`, `receding` | the reverse of "growing": ramps from full down to near-zero |

With no temporal word, the Dreamer produces a **single keyframe** — the clip
still moves if any rates or drift are non-zero, it just doesn't ramp toward a
different look.

## Subjects (auto-switch generator)

Naming one of these clearly enough switches to the matching generator, even
if a different one is currently selected. First match in the prompt wins.

| Words | Generator |
|---|---|
| `snowflake(s)`, `frost`, `crystal(s)`, `crystalline`, `ice`, `icicle`, `fern`, `lattice` | Crystal |
| `ocean`, `sea`, `wave(s)`, `ripple(s)`, `tide`, `dune(s)`, `swell`, `ridgeline` | Waves |
| `spiral(s)`, `helix`, `helices`, `dna`, `coil`, `vortex`, `tornado`, `corkscrew` | Helix |
| `storm`, `nebula`, `smoke`, `particle(s)`, `dust`, `attractor` | Attractor |
| `pendulum(s)`, `orbit(s)`, `oscillation`, `harmonograph` | Harmonograph |
| `knot(s)`, `loop(s)`, `rose`, `rosette`, `figure`, `lissajous` | Lissajous |

If nothing matches, the currently-open generator tab is used.

## Per-generator structure words

These words tune parameters specific to one generator. They only take effect
if that generator ends up selected (either because you had it open, or a
subject word switched to it).

### Harmonograph

No keyword table — the oscillator layout is built directly from mood energy:
higher energy (from `chaotic`/`driving`/etc.) widens the frequency and
damping ranges and speeds up the turntable. One special word:

- `symmetric`, `balanced` — mirrors the Y-axis oscillators from the X-axis
  ones with a quarter-turn phase offset, producing a classically symmetric
  figure.

### Attractor

No keyword table. A dreamed attractor **resamples coefficients up to 24
times, checking each candidate's orbit density, until it lands on a
genuinely chaotic configuration** — so a dreamed attractor can never turn
out as a collapsed, near-empty point cloud. The model (Clifford vs. De Jong)
is chosen at random (~70/30) independent of mood; density-leaning moods
(`dense`/`minimal`) shift the iteration count instead, and any matched
mood's palette picks the color.

### Lissajous

| Word(s) | Effect |
|---|---|
| `knot`, `knotted` | higher X/Y frequencies (5–9), a tighter knotted figure |
| `rose`, `rosette` | strong radial modulation (0.3–0.6 depth) and more turns (6–12) — a flower-like rose curve |
| `precessing` | fast phase rate (0.05–0.15 cyc/s), many turns (12–30) and points (14–24k) — the classic slow-precessing Lissajous look |
| `weave`, `woven` | gentle radial modulation (0.15–0.3 depth), fewer turns (3–6) |

### Crystal

| Word(s) | Effect |
|---|---|
| `delicate` | deep branch depth (8–10), thin lines |
| `spiky`, `thorny` | wide branch angle (0.9–1.4 rad) |
| `snowflake` | forces 6-fold symmetry, low jitter |
| `star`, `starburst` | high symmetry (10–14 fold), shallow depth (4–6) |
| `fern` | forces 3-fold symmetry, narrow branch angle, deep recursion |

### Waves

| Word(s) | Effect |
|---|---|
| `parabola`, `parabolic`, `strings`, `stitched` | switches to the String Art style, denser (30–64 rows) |
| `swell` | long wavelength (1.8–3.2), higher amplitude (0.4–0.8) |
| `choppy` | short wavelength (0.3–0.7) |
| `interference` | dense rows (36–60) with short wavelength — overlapping interference pattern |
| `cathedral` | String Art style, strong negative curvature, very dense (48–72 rows) — tall arching look |

### Helix

| Word(s) | Effect |
|---|---|
| `dna` | forces 2 strands, taller pitch (1.6–2.2), 5–9 turns — double-helix look |
| `tornado`, `vortex` | strong taper (0.7–0.95), more strands (4–7) — funnel shape |
| `tight`, `coiled` | many turns (12–24) |
| `ribbon` | many thin strands (6–10, thinner lines) — flat ribbon look |

## Worked examples

**"a spinning icy snowflake slowly growing"** — on any tab. `snowflake`
switches to **Crystal** and forces 6-fold symmetry with low jitter; `icy`
picks the pale ice-blue palette; `growing` builds a two-keyframe ramp taking
`growth` from 0 to 1 across the clip; `spinning` samples a gentle spin rate.
Result: a snowflake that grows from nothing while slowly rotating.

**"driving neon waves flowing, prismatic, accelerating"** — `waves` switches
to **Waves**; `driving` and `neon` combine for a saturated/neon palette with
motion rates scaled up and drift around 0.45; `flowing` samples the flow-speed
rate; `prismatic` samples the color-cycle rate; `accelerating` turns both
into a ramp from 20% to 160% of their sampled value across the clip. Result:
ridgelines that start flowing gently and speed up into a driving, color
-cycling finish.

**"a hypnotic golden knot, precessing and spinning"** — `knot` switches to
**Lissajous** and picks tighter X/Y frequencies; `golden` sets the palette;
`hypnotic` sets a steady mid-energy drift; `precessing` samples a fast phase
rate with many turns; `spinning` additionally samples a rotation rate.
Result: a gold Lissajous knot that continuously reshapes itself.

**"still golden parabola strings"** — stays on **Waves** (no subject word,
so whatever generator was open is kept); `parabola`/`strings` switch to the
String Art style at high row density; `golden` sets the palette; `still`
zeroes every rate *and* the drift amount. Result: a single, genuinely static
frame — nothing moves, ever, across the whole clip.

**"a chaotic storm of particles, prismatic"** — `storm`/`particles` switch
to **Attractor**; `chaotic` biases toward the hotter palette and denser
iteration count; the coefficients are resampled until verifiably chaotic;
`prismatic` samples the color-cycle rate. Result: a dense, hot-colored
attractor whose hue slowly cycles.

## Tips

- Categories stack freely — mix a subject, a mood, several motion words, and
  a temporal word in one prompt.
- If your subject word doesn't match a generator, the Dreamer just biases
  whatever generator is currently open — it never errors out.
- `still`/`static`/`frozen` is the one word that overrides everything else:
  it always zeroes rates and drift, regardless of any mood or motion words
  also present.
- Because the seed comes from the literal prompt text, small wording changes
  ("calm ocean" vs. "calm oceans") produce different — but each
  individually reproducible — results.
