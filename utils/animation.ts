import {
  AnimationKeyframe,
  AnimationSettings,
  AttractorParams,
  EasingMode,
  HarmonographParams,
  Oscillator,
} from '../types';

// Everything in this module is a pure function of its inputs so that the live
// preview, scrubber, and offline mp4 export all produce identical frames.

const lerp = (a: number, b: number, u: number) => a + (b - a) * u;

const smoothstep = (u: number) => u * u * (3 - 2 * u);

const applyEasing = (u: number, easing: EasingMode) =>
  easing === 'smooth' ? smoothstep(u) : u;

const lerpHexColor = (a: string, b: string, u: number): string => {
  const parse = (hex: string) => {
    const n = parseInt(hex.replace('#', ''), 16);
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  };
  const [ar, ag, ab] = parse(a);
  const [br, bg, bb] = parse(b);
  const channel = (x: number, y: number) => Math.round(lerp(x, y, u));
  return (
    '#' +
    [channel(ar, br), channel(ag, bg), channel(ab, bb)]
      .map((v) => v.toString(16).padStart(2, '0'))
      .join('')
  );
};

// Pair oscillators by index. When counts differ, the missing side is treated
// as a zero-amplitude copy of the other, so extra oscillators fade in/out
// instead of popping.
const lerpOscillators = (a: Oscillator[], b: Oscillator[], u: number): Oscillator[] => {
  const length = Math.max(a.length, b.length);
  const out: Oscillator[] = [];
  for (let i = 0; i < length; i += 1) {
    const oa = a[i] ?? { ...b[i], amplitude: 0 };
    const ob = b[i] ?? { ...a[i], amplitude: 0 };
    out.push({
      id: a[i]?.id ?? b[i].id,
      amplitude: lerp(oa.amplitude, ob.amplitude, u),
      frequency: lerp(oa.frequency, ob.frequency, u),
      phase: lerp(oa.phase, ob.phase, u),
      damping: lerp(oa.damping, ob.damping, u),
    });
  }
  return out;
};

const lerpHarmonograph = (
  a: HarmonographParams,
  b: HarmonographParams,
  u: number,
): HarmonographParams => ({
  duration: lerp(a.duration, b.duration, u),
  sampleRate: Math.round(lerp(a.sampleRate, b.sampleRate, u)),
  lineColor: lerpHexColor(a.lineColor, b.lineColor, u),
  lineWidth: lerp(a.lineWidth, b.lineWidth, u),
  opacity: lerp(a.opacity, b.opacity, u),
  xOscillators: lerpOscillators(a.xOscillators, b.xOscillators, u),
  yOscillators: lerpOscillators(a.yOscillators, b.yOscillators, u),
  turntableOmega: lerp(a.turntableOmega, b.turntableOmega, u),
  turntableDamping: lerp(a.turntableDamping, b.turntableDamping, u),
});

// The model equation can't be crossfaded, so it steps at the segment start.
const lerpAttractor = (a: AttractorParams, b: AttractorParams, u: number): AttractorParams => ({
  model: a.model,
  a: lerp(a.a, b.a, u),
  b: lerp(a.b, b.b, u),
  c: lerp(a.c, b.c, u),
  d: lerp(a.d, b.d, u),
  iterations: Math.round(lerp(a.iterations, b.iterations, u)),
  color: lerpHexColor(a.color, b.color, u),
  opacity: lerp(a.opacity, b.opacity, u),
  zoom: lerp(a.zoom, b.zoom, u),
});

const paramsAtTime = <T>(
  keyframes: AnimationKeyframe<T>[],
  time: number,
  easing: EasingMode,
  lerpParams: (a: T, b: T, u: number) => T,
): T | null => {
  if (keyframes.length === 0) return null;
  const sorted = [...keyframes].sort((x, y) => x.time - y.time);
  if (time <= sorted[0].time) return sorted[0].params;
  const last = sorted[sorted.length - 1];
  if (time >= last.time) return last.params;
  for (let i = 0; i < sorted.length - 1; i += 1) {
    const k0 = sorted[i];
    const k1 = sorted[i + 1];
    if (time >= k0.time && time < k1.time) {
      const span = k1.time - k0.time;
      const u = span > 0 ? applyEasing((time - k0.time) / span, easing) : 0;
      return lerpParams(k0.params, k1.params, u);
    }
  }
  return last.params;
};

export const harmonographAtTime = (
  keyframes: AnimationKeyframe<HarmonographParams>[],
  time: number,
  easing: EasingMode,
): HarmonographParams | null => paramsAtTime(keyframes, time, easing, lerpHarmonograph);

export const attractorAtTime = (
  keyframes: AnimationKeyframe<AttractorParams>[],
  time: number,
  easing: EasingMode,
): AttractorParams | null => paramsAtTime(keyframes, time, easing, lerpAttractor);

// --- Drift -------------------------------------------------------------
// Layers slow, seeded sinusoidal wander on top of the keyframed values so a
// single keyframe becomes an endlessly evolving (but still deterministic)
// loop. Each parameter slot gets its own frequency/phase drawn from the seed
// in a fixed order, so the same seed always wanders the same way.

const seededStream = (seed: number) => {
  let t = (seed * 2654435761) >>> 0;
  return () => {
    t += 0x6d2b79f5;
    let r = Math.imul(t ^ (t >>> 15), 1 | t);
    r ^= r + Math.imul(r ^ (r >>> 7), 61 | r);
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
};

const makeWander = (seed: number, time: number) => {
  const rng = seededStream(seed);
  // Each call consumes one (frequency, phase) pair from the stream and
  // returns a value in [-1, 1] for this time.
  return () => {
    const freq = 0.02 + rng() * 0.06; // 12–50s period: slow, musical
    const phase = rng() * Math.PI * 2;
    return Math.sin(2 * Math.PI * freq * time + phase);
  };
};

export const applyHarmonographDrift = (
  params: HarmonographParams,
  time: number,
  seed: number,
  amount: number,
): HarmonographParams => {
  if (amount <= 0) return params;
  const wander = makeWander(seed, time);
  // Draw the turntable's pair first so its wander stays continuous even if
  // the interpolated oscillator count changes between keyframe segments.
  const turntableOmega = params.turntableOmega + 0.04 * amount * wander();
  const driftOsc = (osc: Oscillator): Oscillator => ({
    ...osc,
    amplitude: osc.amplitude * (1 + 0.15 * amount * wander()),
    frequency: osc.frequency * (1 + 0.08 * amount * wander()),
    phase: osc.phase + 0.8 * amount * wander(),
    damping: Math.max(0, osc.damping * (1 + 0.3 * amount * wander())),
  });
  return {
    ...params,
    xOscillators: params.xOscillators.map(driftOsc),
    yOscillators: params.yOscillators.map(driftOsc),
    turntableOmega,
  };
};

export const applyAttractorDrift = (
  params: AttractorParams,
  time: number,
  seed: number,
  amount: number,
): AttractorParams => {
  if (amount <= 0) return params;
  const wander = makeWander(seed, time);
  // Attractor coefficients are far more sensitive than harmonograph params:
  // wander beyond ~±0.1 tends to leave the chaotic regime and collapse the
  // orbit into a periodic cycle, so keep the range tight.
  return {
    ...params,
    a: params.a + 0.08 * amount * wander(),
    b: params.b + 0.08 * amount * wander(),
    c: params.c + 0.08 * amount * wander(),
    d: params.d + 0.08 * amount * wander(),
    zoom: Math.max(0.05, params.zoom * (1 + 0.05 * amount * wander())),
  };
};

// --- Frame helpers -------------------------------------------------------
// The single entry points used by both the live preview and the exporter:
// keyframe interpolation plus drift, as a pure function of time.

export const harmonographFrame = (
  keyframes: AnimationKeyframe<HarmonographParams>[],
  time: number,
  settings: Pick<AnimationSettings, 'easing' | 'drift' | 'driftSeed'>,
): HarmonographParams | null => {
  const p = harmonographAtTime(keyframes, time, settings.easing);
  return p ? applyHarmonographDrift(p, time, settings.driftSeed, settings.drift) : null;
};

export const attractorFrame = (
  keyframes: AnimationKeyframe<AttractorParams>[],
  time: number,
  settings: Pick<AnimationSettings, 'easing' | 'drift' | 'driftSeed'>,
): AttractorParams | null => {
  const p = attractorAtTime(keyframes, time, settings.easing);
  return p ? applyAttractorDrift(p, time, settings.driftSeed, settings.drift) : null;
};
