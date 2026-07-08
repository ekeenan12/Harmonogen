import {
  AnimationKeyframe,
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
