import { CrystalParams } from '../types';
import { clamp, makeParamsLerp, makeWander, seededStream } from '../utils/animation';
import { drawBackground } from '../utils/renderCanvas';
import { GeneratorDef } from './types';

const DEFAULTS: CrystalParams = {
  symmetry: 6,
  depth: 7,
  branchAngle: 0.62,
  lengthRatio: 0.68,
  spread: 0,
  jitter: 0,
  seed: 1,
  growth: 1,
  rotation: 0,
  tumble: 0,
  offsetX: 0,
  offsetY: 0,
  spinRate: 0,
  tumbleRate: 0,
  colorCycle: 0,
  lineColor: '#a5f3fc',
  lineWidth: 1.0,
  opacity: 0.75,
};

const PRESETS: Record<string, CrystalParams> = {
  snowflake: DEFAULTS,
  fern: { ...DEFAULTS, symmetry: 3, depth: 9, branchAngle: 0.42, lengthRatio: 0.74, jitter: 0.12, lineColor: '#34d399', lineWidth: 0.7 },
  frost: { ...DEFAULTS, symmetry: 8, depth: 6, branchAngle: 0.9, lengthRatio: 0.6, jitter: 0.25, seed: 7, lineColor: '#93c5fd' },
  starburst: { ...DEFAULTS, symmetry: 12, depth: 5, branchAngle: 0.35, lengthRatio: 0.62, spread: 0.2, lineColor: '#fde68a' },
  thorn: { ...DEFAULTS, symmetry: 5, depth: 8, branchAngle: 1.15, lengthRatio: 0.66, jitter: 0.3, seed: 3, lineColor: '#c084fc', lineWidth: 0.8 },
};

interface Segment {
  x0: number; y0: number; x1: number; y1: number;
  birth: number; // 0..1 order of growth (by depth)
}

// Build one branch arm deterministically; the full figure repeats it with
// N-fold rotation + mirroring.
const buildArm = (p: CrystalParams): Segment[] => {
  const segments: Segment[] = [];
  const maxDepth = Math.max(1, Math.round(p.depth));
  const rng = seededStream(Math.round(p.seed) || 1);

  const recurse = (x: number, y: number, angle: number, len: number, depth: number) => {
    if (depth >= maxDepth || len < 1e-4) return;
    const jitterAngle = p.jitter * (rng() - 0.5);
    const a = angle + jitterAngle;
    const x1 = x + Math.cos(a) * len;
    const y1 = y + Math.sin(a) * len;
    segments.push({ x0: x, y0: y, x1, y1, birth: depth / maxDepth });
    recurse(x1, y1, a - p.branchAngle, len * p.lengthRatio, depth + 1);
    recurse(x1, y1, a + p.branchAngle, len * p.lengthRatio, depth + 1);
  };

  // Normalize so total arm reach ≈ 1 regardless of depth/ratio.
  const r = clamp(p.lengthRatio, 0.05, 0.95);
  const reach = (1 - Math.pow(r, maxDepth)) / (1 - r);
  recurse(0, 0, -Math.PI / 2 + p.spread, 1 / reach, 0);
  return segments;
};

const render = (
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  p: CrystalParams,
  progress: number = 1,
) => {
  drawBackground(ctx, width, height);

  const growth = clamp(p.growth * clamp(progress, 0, 1), 0, 1);
  if (growth <= 0) return;

  const segments = buildArm(p);
  const symmetry = Math.max(1, Math.round(p.symmetry));
  const scale = Math.min(width, height) / 2.4;
  const centerX = width / 2 + (p.offsetX ?? 0) * scale;
  const centerY = height / 2 + (p.offsetY ?? 0) * scale;
  const maxDepth = Math.max(1, Math.round(p.depth));
  const baseRotation = p.rotation ?? 0;
  // Coin-flip foreshortening: cos(tumble) squashes the figure along screen X,
  // which reads as the lattice tumbling in 3D. Negative just mirrors it.
  const tumbleScale = Math.cos(p.tumble ?? 0);

  ctx.strokeStyle = p.lineColor;
  ctx.lineWidth = p.lineWidth;
  ctx.globalAlpha = p.opacity;
  ctx.beginPath();

  for (let k = 0; k < symmetry; k += 1) {
    const rot = (k / symmetry) * Math.PI * 2 + baseRotation;
    const cosR = Math.cos(rot);
    const sinR = Math.sin(rot);
    for (const mirror of [1, -1]) {
      for (const seg of segments) {
        // Each segment grows outward: fully drawn once growth passes its
        // depth band, partially while inside it.
        const local = clamp((growth - seg.birth) * maxDepth, 0, 1);
        if (local <= 0) continue;
        const mx0 = seg.x0 * mirror;
        const mx1 = seg.x0 * mirror + (seg.x1 - seg.x0) * mirror * local;
        const my1 = seg.y0 + (seg.y1 - seg.y0) * local;
        const x0 = (mx0 * cosR - seg.y0 * sinR) * tumbleScale;
        const y0 = mx0 * sinR + seg.y0 * cosR;
        const x1 = (mx1 * cosR - my1 * sinR) * tumbleScale;
        const y1 = mx1 * sinR + my1 * cosR;
        ctx.moveTo(centerX + x0 * scale, centerY + y0 * scale);
        ctx.lineTo(centerX + x1 * scale, centerY + y1 * scale);
      }
    }
  }
  ctx.stroke();
  ctx.globalAlpha = 1;
};

const lerp = makeParamsLerp<CrystalParams>({
  colors: ['lineColor'],
  ints: ['symmetry', 'depth', 'seed'],
});

const drift = (p: CrystalParams, time: number, seed: number, amount: number): CrystalParams => {
  if (amount <= 0) return p;
  const wander = makeWander(seed, time);
  return {
    ...p,
    branchAngle: p.branchAngle + 0.18 * amount * wander(),
    lengthRatio: clamp(p.lengthRatio * (1 + 0.06 * amount * wander()), 0.2, 0.92),
    spread: p.spread + 0.25 * amount * wander(),
    jitter: Math.max(0, p.jitter + 0.1 * amount * wander()),
  };
};

export const crystalGenerator: GeneratorDef<CrystalParams> = {
  id: 'crystal',
  label: 'Crystal',
  defaults: DEFAULTS,
  presets: PRESETS,
  render,
  lerp,
  drift,
  controls: [
    { kind: 'int', key: 'symmetry', label: 'Symmetry (fold)', min: 1, max: 16 },
    { kind: 'int', key: 'depth', label: 'Branch Depth', min: 2, max: 10 },
    { kind: 'slider', key: 'branchAngle', label: 'Branch Angle', min: 0.1, max: 1.5, step: 0.01, decimals: 2 },
    { kind: 'slider', key: 'lengthRatio', label: 'Length Ratio', min: 0.3, max: 0.9, step: 0.01, decimals: 2 },
    { kind: 'slider', key: 'spread', label: 'Spread', min: -1, max: 1, step: 0.01, decimals: 2 },
    { kind: 'slider', key: 'jitter', label: 'Jitter', min: 0, max: 1, step: 0.01, decimals: 2 },
    { kind: 'int', key: 'seed', label: 'Structure Seed', min: 1, max: 99999 },
    { kind: 'slider', key: 'growth', label: 'Growth', min: 0, max: 1, step: 0.01, decimals: 2 },
    { kind: 'slider', key: 'rotation', label: 'Rotation', min: 0, max: Math.PI * 2, step: 0.01, decimals: 2 },
    { kind: 'slider', key: 'spinRate', label: 'Spin Rate (rev/s)', min: -0.25, max: 0.25, step: 0.005, decimals: 3 },
    { kind: 'slider', key: 'tumbleRate', label: 'Tumble Rate (flips/s)', min: 0, max: 0.5, step: 0.005, decimals: 3 },
    { kind: 'slider', key: 'offsetX', label: 'Offset X', min: -1, max: 1, step: 0.01, decimals: 2 },
    { kind: 'slider', key: 'offsetY', label: 'Offset Y', min: -1, max: 1, step: 0.01, decimals: 2 },
    { kind: 'slider', key: 'colorCycle', label: 'Color Cycle (hue/s)', min: 0, max: 0.5, step: 0.01, decimals: 2 },
    { kind: 'color', key: 'lineColor', label: 'Color' },
    { kind: 'slider', key: 'lineWidth', label: 'Line Width', min: 0.1, max: 4, step: 0.1, decimals: 1 },
    { kind: 'slider', key: 'opacity', label: 'Opacity', min: 0.05, max: 1, step: 0.01, decimals: 2 },
  ],
  rates: [
    { rateKey: 'spinRate', targetKey: 'rotation', kind: 'add' },
    { rateKey: 'tumbleRate', targetKey: 'tumble', kind: 'add' },
    { rateKey: 'colorCycle', targetKey: 'lineColor', kind: 'hue' },
  ],
  dream: {
    colorKey: 'lineColor',
    hint: 'E.g., an icy snowflake growing while tumbling...',
    base: {
      ranges: {
        symmetry: [4, 9], depth: [5, 9], branchAngle: [0.3, 1.1],
        lengthRatio: [0.55, 0.78], jitter: [0, 0.3], seed: [1, 9999],
        lineWidth: [0.5, 1.4], opacity: [0.5, 0.9],
      },
    },
    keywords: {
      delicate: { ranges: { depth: [8, 10], lineWidth: [0.4, 0.8] } },
      spiky: { ranges: { branchAngle: [0.9, 1.4] } },
      thorny: { ranges: { branchAngle: [0.9, 1.4] } },
      snowflake: { set: { symmetry: 6 }, ranges: { jitter: [0, 0.1] } },
      star: { ranges: { symmetry: [10, 14], depth: [4, 6] } },
      starburst: { ranges: { symmetry: [10, 14], depth: [4, 6] } },
      fern: { set: { symmetry: 3 }, ranges: { branchAngle: [0.35, 0.5], depth: [8, 10] } },
    },
    ints: ['symmetry', 'depth', 'seed'],
    densityKeys: ['depth', 'symmetry'],
    growKeys: ['growth'],
  },
  supportsDrawOn: true,
  randomize: (p) => ({ ...p, seed: Math.floor(Math.random() * 99999) + 1 }),
  stat: (p) => {
    const maxDepth = Math.max(1, Math.round(p.depth));
    const arm = Math.pow(2, maxDepth) - 1;
    return `${(arm * Math.max(1, Math.round(p.symmetry)) * 2).toLocaleString()} segs`;
  },
};
