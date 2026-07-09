import { AnimationKeyframe, EasingMode } from '../types';

// Shared deterministic animation toolkit. Everything here is a pure function
// of its inputs so that the live preview, scrubber, and offline mp4 export
// all produce identical frames. Generator-specific lerp/drift logic lives in
// generators/*.ts and is built from these helpers.

export const lerp = (a: number, b: number, u: number) => a + (b - a) * u;

export const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v));

export const smoothstep = (u: number) => u * u * (3 - 2 * u);

export const applyEasing = (u: number, easing: EasingMode) =>
  easing === 'smooth' ? smoothstep(u) : u;

export const lerpHexColor = (a: string, b: string, u: number): string => {
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

// Deterministic PRNG stream (mulberry32 variant).
export const seededStream = (seed: number) => {
  let t = (Math.imul(seed, 2654435761) || 1) >>> 0;
  return () => {
    t += 0x6d2b79f5;
    let r = Math.imul(t ^ (t >>> 15), 1 | t);
    r ^= r + Math.imul(r ^ (r >>> 7), 61 | r);
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
};

// Slow seeded sinusoidal wander for drift. Each call consumes one
// (frequency, phase) pair from the seed's stream and returns a value in
// [-1, 1] for this time — so parameter slots must be consumed in a fixed
// order to stay continuous over time.
export const makeWander = (seed: number, time: number) => {
  const rng = seededStream(seed);
  return () => {
    const freq = 0.02 + rng() * 0.06; // 12–50s period: slow, musical
    const phase = rng() * Math.PI * 2;
    return Math.sin(2 * Math.PI * freq * time + phase);
  };
};

// Interpolate a sorted keyframe list at `time` using the provided per-params
// lerp. Clamps before the first and after the last keyframe.
export const paramsAtTime = <T>(
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

// Integrates a keyframed scalar (a *rate* param) from t=0 to `time`,
// honoring the same per-segment easing as paramsAtTime. Closed-form per
// segment, so it's exact and O(#keyframes): with v(u) = v0 + (v1-v0)·e(u),
// ∫e = u²/2 (linear) or u³ - u⁴/2 (smoothstep). This is what turns rate
// params (spin rate, flow speed, color cycle) into continuous phase without
// jumps when the rate itself is keyframed.
export const integrateKeyframedScalar = <T>(
  keyframes: AnimationKeyframe<T>[],
  getValue: (params: T) => number,
  time: number,
  easing: EasingMode,
): number => {
  if (keyframes.length === 0 || time <= 0) return 0;
  const sorted = [...keyframes].sort((a, b) => a.time - b.time);
  const first = sorted[0];
  const last = sorted[sorted.length - 1];
  let acc = getValue(first.params) * Math.min(time, Math.max(0, first.time));
  if (time <= first.time) return acc;
  for (let i = 0; i < sorted.length - 1; i += 1) {
    const k0 = sorted[i];
    const k1 = sorted[i + 1];
    const span = k1.time - k0.time;
    if (span <= 0 || time <= k0.time) continue;
    const s = Math.min(1, (time - k0.time) / span);
    const v0 = getValue(k0.params);
    const v1 = getValue(k1.params);
    const easeIntegral = easing === 'smooth' ? s * s * s - (s * s * s * s) / 2 : (s * s) / 2;
    acc += span * (v0 * s + (v1 - v0) * easeIntegral);
  }
  if (time > last.time) acc += getValue(last.params) * (time - last.time);
  return acc;
};

// Rotate a hex color's hue by `degrees`, preserving saturation/lightness.
export const hueRotateHex = (hex: string, degrees: number): string => {
  const n = parseInt(hex.replace('#', ''), 16);
  const r = ((n >> 16) & 255) / 255;
  const g = ((n >> 8) & 255) / 255;
  const b = (n & 255) / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  let h = 0;
  let s = 0;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    if (max === r) h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
    else if (max === g) h = ((b - r) / d + 2) / 6;
    else h = ((r - g) / d + 4) / 6;
  }
  h = (((h + degrees / 360) % 1) + 1) % 1;
  const hueToRgb = (p: number, q: number, t: number) => {
    let tt = ((t % 1) + 1) % 1;
    if (tt < 1 / 6) return p + (q - p) * 6 * tt;
    if (tt < 1 / 2) return q;
    if (tt < 2 / 3) return p + (q - p) * (2 / 3 - tt) * 6;
    return p;
  };
  let rr: number;
  let gg: number;
  let bb: number;
  if (s === 0) {
    rr = gg = bb = l;
  } else {
    const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    const p = 2 * l - q;
    rr = hueToRgb(p, q, h + 1 / 3);
    gg = hueToRgb(p, q, h);
    bb = hueToRgb(p, q, h - 1 / 3);
  }
  return (
    '#' +
    [rr, gg, bb]
      .map((v) => Math.round(v * 255).toString(16).padStart(2, '0'))
      .join('')
  );
};

// Builds a lerp for flat param objects: numbers interpolate, listed color
// keys blend in RGB, listed int keys round, listed step keys switch at the
// segment midpoint, and everything else carries over from `a`.
export const makeParamsLerp = <P extends object>(opts: {
  colors?: (keyof P)[];
  ints?: (keyof P)[];
  steps?: (keyof P)[];
} = {}) => {
  const colors = new Set(opts.colors ?? []);
  const ints = new Set(opts.ints ?? []);
  const steps = new Set(opts.steps ?? []);
  return (a: P, b: P, u: number): P => {
    const out = { ...a } as Record<string, unknown>;
    for (const key of Object.keys(a) as (keyof P)[]) {
      const av = a[key];
      const bv = b[key];
      if (steps.has(key)) {
        out[key as string] = u < 0.5 ? av : bv;
      } else if (colors.has(key) && typeof av === 'string' && typeof bv === 'string') {
        out[key as string] = lerpHexColor(av, bv, u);
      } else if (typeof av === 'number' && typeof bv === 'number') {
        const v = lerp(av, bv, u);
        out[key as string] = ints.has(key) ? Math.round(v) : v;
      }
    }
    return out as P;
  };
};
