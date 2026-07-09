import { HarmonographParams, Oscillator } from '../types';
import { clamp, lerp, lerpHexColor, makeWander } from '../utils/animation';
import { drawBackground } from '../utils/renderCanvas';
import { GeneratorDef } from './types';

export const DEFAULT_PARAMS: HarmonographParams = {
  duration: 60,
  sampleRate: 2000,
  lineColor: '#06b6d4', // Cyan-500
  lineWidth: 0.8,
  opacity: 0.8,
  xOscillators: [
    { id: 'x1', amplitude: 1.0, frequency: 2.0, phase: 0.0, damping: 0.010 },
    { id: 'x2', amplitude: 0.6, frequency: 3.0, phase: 1.2, damping: 0.012 },
  ],
  yOscillators: [
    { id: 'y1', amplitude: 1.0, frequency: 2.5, phase: 0.7, damping: 0.011 },
    { id: 'y2', amplitude: 0.5, frequency: 3.5, phase: 2.1, damping: 0.013 },
  ],
  turntableOmega: 0.0,
  turntableDamping: 0.0,
  colorCycle: 0,
};

export const PRESETS: Record<string, HarmonographParams> = {
  default: DEFAULT_PARAMS,
  simple: {
    ...DEFAULT_PARAMS,
    xOscillators: [{ id: 'sx1', amplitude: 1, frequency: 2.01, phase: 0, damping: 0.005 }],
    yOscillators: [{ id: 'sy1', amplitude: 1, frequency: 3.0, phase: Math.PI / 2, damping: 0.005 }],
    duration: 100,
  },
  rotary: {
    ...DEFAULT_PARAMS,
    xOscillators: [{ id: 'rx1', amplitude: 1, frequency: 2.0, phase: 0, damping: 0.001 }],
    yOscillators: [{ id: 'ry1', amplitude: 1, frequency: 2.0, phase: Math.PI / 2, damping: 0.001 }],
    turntableOmega: 0.05,
    duration: 120,
  },
};

// progress (0..1) draws only the first fraction of the trace (draw-on mode).
export const renderHarmonograph = (
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  params: HarmonographParams,
  progress: number = 1,
) => {
  drawBackground(ctx, width, height);

  const {
    duration,
    sampleRate,
    xOscillators,
    yOscillators,
    turntableOmega,
    turntableDamping,
    lineColor,
    lineWidth,
    opacity,
  } = params;

  const n = Math.floor(duration * sampleRate * clamp(progress, 0, 1));
  const timeStep = 1 / sampleRate;

  const centerX = width / 2;
  const centerY = height / 2;

  // Scale factor: 1.0 amplitude = 1/3.5 of shortest dimension
  const scale = Math.min(width, height) / 3.5;

  ctx.beginPath();
  ctx.strokeStyle = lineColor;
  ctx.lineWidth = lineWidth;
  ctx.globalAlpha = opacity;

  const tOmega = turntableOmega * 2 * Math.PI; // Convert Hz to rad/s

  // Optimized param arrays
  const xParams = xOscillators.map(o => ({ A: o.amplitude, w: o.frequency * 2 * Math.PI, p: o.phase, d: o.damping }));
  const yParams = yOscillators.map(o => ({ A: o.amplitude, w: o.frequency * 2 * Math.PI, p: o.phase, d: o.damping }));

  let firstPoint = true;

  for (let i = 0; i < n; i++) {
    const t = i * timeStep;

    let x = 0;
    for (const osc of xParams) {
      x += osc.A * Math.exp(-osc.d * t) * Math.sin(osc.w * t + osc.p);
    }

    let y = 0;
    for (const osc of yParams) {
      y += osc.A * Math.exp(-osc.d * t) * Math.sin(osc.w * t + osc.p);
    }

    // Turntable Rotation
    if (tOmega !== 0) {
      let theta;
      if (turntableDamping > 0) {
        theta = tOmega * (1.0 - Math.exp(-turntableDamping * t));
      } else {
        theta = tOmega * t;
      }
      const c = Math.cos(theta);
      const s = Math.sin(theta);

      const xr = c * x - s * y;
      const yr = s * x + c * y;
      x = xr;
      y = yr;
    }

    const screenX = centerX + x * scale;
    const screenY = centerY - y * scale;

    if (firstPoint) {
      ctx.moveTo(screenX, screenY);
      firstPoint = false;
    } else {
      ctx.lineTo(screenX, screenY);
    }
  }

  ctx.stroke();
  ctx.globalAlpha = 1;
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
  colorCycle: lerp(a.colorCycle ?? 0, b.colorCycle ?? 0, u),
});

const driftHarmonograph = (
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

export const harmonographGenerator: GeneratorDef<HarmonographParams> = {
  id: 'harmonograph',
  label: 'Harmonograph',
  defaults: DEFAULT_PARAMS,
  presets: PRESETS,
  render: renderHarmonograph,
  lerp: lerpHarmonograph,
  drift: driftHarmonograph,
  controls: 'custom', // dynamic oscillator lists need the bespoke panel
  rates: [{ rateKey: 'colorCycle', targetKey: 'lineColor', kind: 'hue' }],
  supportsDrawOn: true,
  stat: (p) => `${(p.duration * p.sampleRate).toLocaleString()} pts`,
};
