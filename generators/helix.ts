import { HelixParams } from '../types';
import { clamp, lerpHexColor, makeParamsLerp, makeWander } from '../utils/animation';
import { drawBackground, strokePolyline } from '../utils/renderCanvas';
import { GeneratorDef } from './types';

const DEFAULTS: HelixParams = {
  strands: 3,
  radius: 0.55,
  pitch: 1.6,
  turns: 5,
  twist: 0,
  tilt: 0.35,
  taper: 0,
  perspective: 0.35,
  points: 2400,
  twistRate: 0.08,
  colorCycle: 0,
  lineColor: '#34d399',
  lineWidth: 1.4,
  opacity: 0.85,
};

const PRESETS: Record<string, HelixParams> = {
  triple: DEFAULTS,
  dna: { ...DEFAULTS, strands: 2, radius: 0.45, pitch: 1.9, turns: 7, tilt: 0.25, lineColor: '#38bdf8', lineWidth: 1.8 },
  tornado: { ...DEFAULTS, strands: 5, radius: 0.75, pitch: 1.8, turns: 9, taper: 0.85, tilt: 0.15, lineColor: '#a78bfa', lineWidth: 0.9, opacity: 0.7 },
  coil: { ...DEFAULTS, strands: 1, radius: 0.85, pitch: 0.9, turns: 16, tilt: 0.55, perspective: 0.5, points: 5000, lineColor: '#fbbf24', lineWidth: 0.8 },
  ribbon: { ...DEFAULTS, strands: 8, radius: 0.5, pitch: 2.2, turns: 4, tilt: 0.4, lineColor: '#f472b6', lineWidth: 0.7, opacity: 0.65 },
};

const render = (
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  p: HelixParams,
  progress: number = 1,
) => {
  drawBackground(ctx, width, height);

  const strands = Math.max(1, Math.round(p.strands));
  const pointsPerStrand = Math.max(2, Math.round(p.points / strands));
  const visible = Math.max(2, Math.floor(pointsPerStrand * clamp(progress, 0, 1)));
  const centerX = width / 2;
  const centerY = height / 2;
  const scale = Math.min(width, height) / (2.6 * Math.max(p.radius, p.pitch / 2, 0.4));
  const cosT = Math.cos(p.tilt);
  const sinT = Math.sin(p.tilt);

  ctx.lineWidth = p.lineWidth;

  for (let s = 0; s < strands; s += 1) {
    const strandPhase = (s / strands) * Math.PI * 2;
    // Vary each strand's shade slightly so intertwined strands read as depth.
    ctx.strokeStyle = lerpHexColor(p.lineColor, '#0f172a', strands > 1 ? (0.35 * s) / strands : 0);
    ctx.globalAlpha = p.opacity;

    const pts: number[] = new Array(visible * 2);
    for (let i = 0; i < visible; i += 1) {
      const f = i / (pointsPerStrand - 1);
      const theta = f * p.turns * Math.PI * 2 + p.twist + strandPhase;
      const r = p.radius * (1 - p.taper * f);
      const x3 = r * Math.cos(theta);
      const z3 = r * Math.sin(theta);
      const y3 = p.pitch * (f - 0.5);

      // Tilt around the X axis, then perspective-project.
      const y2 = y3 * cosT - z3 * sinT;
      const z2 = y3 * sinT + z3 * cosT;
      const persp = 1 / (1 + p.perspective * (z2 + 1.2) * 0.35);

      pts[i * 2] = centerX + x3 * persp * scale;
      pts[i * 2 + 1] = centerY + y2 * persp * scale;
    }
    strokePolyline(ctx, pts);
  }
  ctx.globalAlpha = 1;
};

const lerp = makeParamsLerp<HelixParams>({
  colors: ['lineColor'],
  ints: ['strands', 'points'],
});

const drift = (p: HelixParams, time: number, seed: number, amount: number): HelixParams => {
  if (amount <= 0) return p;
  const wander = makeWander(seed, time);
  return {
    ...p,
    twist: p.twist + 1.2 * amount * wander(),
    pitch: Math.max(0.1, p.pitch * (1 + 0.1 * amount * wander())),
    radius: Math.max(0.05, p.radius * (1 + 0.08 * amount * wander())),
    tilt: p.tilt + 0.2 * amount * wander(),
  };
};

export const helixGenerator: GeneratorDef<HelixParams> = {
  id: 'helix',
  label: 'Helix',
  defaults: DEFAULTS,
  presets: PRESETS,
  render,
  lerp,
  drift,
  controls: [
    { kind: 'int', key: 'strands', label: 'Strands', min: 1, max: 12 },
    { kind: 'slider', key: 'radius', label: 'Radius', min: 0.05, max: 1.5, step: 0.01, decimals: 2 },
    { kind: 'slider', key: 'pitch', label: 'Pitch (height)', min: 0.1, max: 3, step: 0.01, decimals: 2 },
    { kind: 'int', key: 'turns', label: 'Turns', min: 1, max: 32 },
    { kind: 'slider', key: 'twist', label: 'Twist', min: 0, max: Math.PI * 2, step: 0.01, decimals: 2 },
    { kind: 'slider', key: 'tilt', label: 'Tilt', min: -1.2, max: 1.2, step: 0.01, decimals: 2 },
    { kind: 'slider', key: 'taper', label: 'Taper', min: 0, max: 1, step: 0.01, decimals: 2 },
    { kind: 'slider', key: 'perspective', label: 'Perspective', min: 0, max: 1, step: 0.01, decimals: 2 },
    { kind: 'int', key: 'points', label: 'Points', min: 200, max: 20000, step: 100 },
    { kind: 'slider', key: 'twistRate', label: 'Twist Rate (rev/s)', min: -0.5, max: 0.5, step: 0.005, decimals: 3 },
    { kind: 'slider', key: 'colorCycle', label: 'Color Cycle (hue/s)', min: 0, max: 0.5, step: 0.01, decimals: 2 },
    { kind: 'color', key: 'lineColor', label: 'Color' },
    { kind: 'slider', key: 'lineWidth', label: 'Line Width', min: 0.1, max: 4, step: 0.1, decimals: 1 },
    { kind: 'slider', key: 'opacity', label: 'Opacity', min: 0.05, max: 1, step: 0.01, decimals: 2 },
  ],
  rates: [
    { rateKey: 'twistRate', targetKey: 'twist', kind: 'add' },
    { rateKey: 'colorCycle', targetKey: 'lineColor', kind: 'hue' },
  ],
  supportsDrawOn: true,
  stat: (p) => `${p.points.toLocaleString()} pts`,
};
