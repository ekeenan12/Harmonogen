import { LissajousParams } from '../types';
import { clamp, makeParamsLerp, makeWander } from '../utils/animation';
import { drawBackground, strokePolyline } from '../utils/renderCanvas';
import { GeneratorDef } from './types';

const DEFAULTS: LissajousParams = {
  freqX: 3,
  freqY: 4,
  phase: Math.PI / 2,
  modFreq: 0,
  modDepth: 0,
  rotation: 0,
  turns: 1,
  points: 4000,
  spinRate: 0,
  phaseRate: 0.05,
  colorCycle: 0,
  lineColor: '#22d3ee',
  lineWidth: 1.2,
  opacity: 0.85,
};

const PRESETS: Record<string, LissajousParams> = {
  classic: DEFAULTS,
  knot: { ...DEFAULTS, freqX: 5, freqY: 4, phase: Math.PI / 4, lineColor: '#a78bfa' },
  rose: { ...DEFAULTS, freqX: 7, freqY: 7.02, modFreq: 7, modDepth: 0.45, turns: 8, points: 12000, lineColor: '#f472b6' },
  precession: { ...DEFAULTS, freqX: 3, freqY: 2.005, turns: 24, points: 20000, lineWidth: 0.6, opacity: 0.6, lineColor: '#34d399' },
  weave: { ...DEFAULTS, freqX: 9, freqY: 8, phase: 0, modFreq: 2, modDepth: 0.2, turns: 4, points: 12000, lineWidth: 0.7, lineColor: '#fbbf24' },
};

const render = (
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  p: LissajousParams,
  progress: number = 1,
) => {
  drawBackground(ctx, width, height);

  const n = Math.max(2, Math.floor(p.points * clamp(progress, 0, 1)));
  const tMax = p.turns * Math.PI * 2;
  const centerX = width / 2;
  const centerY = height / 2;
  const scale = Math.min(width, height) / (2.4 * (1 + Math.abs(p.modDepth)));
  const cosR = Math.cos(p.rotation);
  const sinR = Math.sin(p.rotation);

  const pts: number[] = new Array(n * 2);
  for (let i = 0; i < n; i += 1) {
    const t = (i / (p.points - 1)) * tMax;
    const r = 1 + p.modDepth * Math.sin(p.modFreq * t);
    const x = r * Math.sin(p.freqX * t + p.phase);
    const y = r * Math.sin(p.freqY * t);
    pts[i * 2] = centerX + (x * cosR - y * sinR) * scale;
    pts[i * 2 + 1] = centerY - (x * sinR + y * cosR) * scale;
  }

  ctx.strokeStyle = p.lineColor;
  ctx.lineWidth = p.lineWidth;
  ctx.globalAlpha = p.opacity;
  strokePolyline(ctx, pts);
  ctx.globalAlpha = 1;
};

const lerp = makeParamsLerp<LissajousParams>({
  colors: ['lineColor'],
  ints: ['points'],
});

const drift = (p: LissajousParams, time: number, seed: number, amount: number): LissajousParams => {
  if (amount <= 0) return p;
  const wander = makeWander(seed, time);
  return {
    ...p,
    freqX: p.freqX * (1 + 0.03 * amount * wander()),
    freqY: p.freqY * (1 + 0.03 * amount * wander()),
    phase: p.phase + 0.8 * amount * wander(),
    rotation: p.rotation + 0.5 * amount * wander(),
    modDepth: clamp(p.modDepth + 0.15 * amount * wander(), -1, 1),
  };
};

export const lissajousGenerator: GeneratorDef<LissajousParams> = {
  id: 'lissajous',
  label: 'Lissajous',
  defaults: DEFAULTS,
  presets: PRESETS,
  render,
  lerp,
  drift,
  controls: [
    { kind: 'number', key: 'freqX', label: 'Freq X', step: 0.01 },
    { kind: 'number', key: 'freqY', label: 'Freq Y', step: 0.01 },
    { kind: 'slider', key: 'phase', label: 'Phase', min: 0, max: Math.PI * 2, step: 0.01, decimals: 2 },
    { kind: 'slider', key: 'rotation', label: 'Rotation', min: 0, max: Math.PI * 2, step: 0.01, decimals: 2 },
    { kind: 'number', key: 'modFreq', label: 'Mod Freq', step: 0.1 },
    { kind: 'slider', key: 'modDepth', label: 'Mod Depth', min: -1, max: 1, step: 0.01, decimals: 2 },
    { kind: 'int', key: 'turns', label: 'Turns', min: 1, max: 64 },
    { kind: 'int', key: 'points', label: 'Points', min: 500, max: 60000, step: 500 },
    { kind: 'slider', key: 'spinRate', label: 'Spin Rate (rev/s)', min: -0.3, max: 0.3, step: 0.005, decimals: 3 },
    { kind: 'slider', key: 'phaseRate', label: 'Phase Rate (cyc/s)', min: -0.5, max: 0.5, step: 0.005, decimals: 3 },
    { kind: 'slider', key: 'colorCycle', label: 'Color Cycle (hue/s)', min: 0, max: 0.5, step: 0.01, decimals: 2 },
    { kind: 'color', key: 'lineColor', label: 'Color' },
    { kind: 'slider', key: 'lineWidth', label: 'Line Width', min: 0.1, max: 4, step: 0.1, decimals: 1 },
    { kind: 'slider', key: 'opacity', label: 'Opacity', min: 0.05, max: 1, step: 0.01, decimals: 2 },
  ],
  rates: [
    { rateKey: 'spinRate', targetKey: 'rotation', kind: 'add' },
    { rateKey: 'phaseRate', targetKey: 'phase', kind: 'add' },
    { rateKey: 'colorCycle', targetKey: 'lineColor', kind: 'hue' },
  ],
  dream: {
    colorKey: 'lineColor',
    hint: 'E.g., a hypnotic neon knot slowly spinning...',
    base: {
      ranges: {
        freqX: [2, 7], freqY: [2, 7], phase: [0, Math.PI * 2],
        turns: [1, 4], points: [4000, 14000],
        phaseRate: [0.02, 0.08],
        lineWidth: [0.6, 1.6], opacity: [0.5, 0.9],
      },
    },
    keywords: {
      knot: { ranges: { freqX: [5, 9], freqY: [4, 8] } },
      knotted: { ranges: { freqX: [5, 9], freqY: [4, 8] } },
      rose: { ranges: { modFreq: [5, 9], modDepth: [0.3, 0.6], turns: [6, 12] } },
      rosette: { ranges: { modFreq: [5, 9], modDepth: [0.3, 0.6], turns: [6, 12] } },
      precessing: { ranges: { phaseRate: [0.05, 0.15], turns: [12, 30], points: [14000, 24000] } },
      weave: { ranges: { modFreq: [1.5, 3], modDepth: [0.15, 0.3], turns: [3, 6] } },
      woven: { ranges: { modFreq: [1.5, 3], modDepth: [0.15, 0.3], turns: [3, 6] } },
    },
    ints: ['freqX', 'freqY', 'turns', 'points'],
    densityKeys: ['points', 'turns'],
    growKeys: ['turns'],
  },
  supportsDrawOn: true,
  stat: (p) => `${p.points.toLocaleString()} pts`,
};
