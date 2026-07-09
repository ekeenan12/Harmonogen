import { WavesParams } from '../types';
import { clamp, makeParamsLerp, makeWander } from '../utils/animation';
import { drawBackground, strokePolyline } from '../utils/renderCanvas';
import { GeneratorDef } from './types';

const DEFAULTS: WavesParams = {
  rows: 28,
  amplitude: 0.35,
  wavelength: 1.1,
  curvature: 0.25,
  phase: 0,
  spacing: 0.055,
  falloff: 0.5,
  style: 'ridge',
  flowSpeed: 0.12,
  colorCycle: 0,
  lineColor: '#818cf8',
  lineWidth: 1.0,
  opacity: 0.8,
};

const PRESETS: Record<string, WavesParams> = {
  ridgeline: DEFAULTS,
  swell: { ...DEFAULTS, rows: 18, amplitude: 0.6, wavelength: 2.2, curvature: 0.05, spacing: 0.09, lineColor: '#38bdf8' },
  interference: { ...DEFAULTS, rows: 40, amplitude: 0.22, wavelength: 0.55, curvature: 0.4, spacing: 0.04, lineWidth: 0.6, lineColor: '#f472b6' },
  parabola: { ...DEFAULTS, style: 'stitch', rows: 36, curvature: 0.6, amplitude: 0.4, lineWidth: 0.6, opacity: 0.55, lineColor: '#fbbf24' },
  cathedral: { ...DEFAULTS, style: 'stitch', rows: 64, curvature: -0.4, amplitude: 0.8, phase: 0.6, lineWidth: 0.4, opacity: 0.4, lineColor: '#a5f3fc' },
};

const renderRidge = (
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  p: WavesParams,
  progress: number,
) => {
  const rows = Math.max(1, Math.round(p.rows));
  const visibleRows = Math.max(1, Math.ceil(rows * progress));
  const scale = Math.min(width, height) / 2.2;
  const centerX = width / 2;
  const centerY = height / 2;
  const steps = 220;

  for (let j = 0; j < visibleRows; j += 1) {
    const rowFrac = rows > 1 ? j / (rows - 1) : 0;
    const depthFactor = 1 - p.falloff * rowFrac;
    const yBase = (rowFrac - 0.5) * rows * p.spacing;
    const rowPhase = p.phase + j * 0.45;

    const pts: number[] = new Array((steps + 1) * 2);
    for (let i = 0; i <= steps; i += 1) {
      const wx = (i / steps - 0.5) * 2.4; // world x in ~[-1.2, 1.2]
      const wave =
        p.amplitude * depthFactor * (
          Math.sin((Math.PI * 2 * wx) / p.wavelength + rowPhase) * 0.7 +
          Math.sin((Math.PI * 2 * wx * 1.7) / p.wavelength - rowPhase * 0.6) * 0.3
        );
      const bend = p.curvature * wx * wx;
      const wy = yBase - wave - bend;
      pts[i * 2] = centerX + wx * scale;
      pts[i * 2 + 1] = centerY + wy * scale;
    }

    ctx.globalAlpha = p.opacity * (1 - p.falloff * 0.7 * rowFrac);
    strokePolyline(ctx, pts);
  }
};

const renderStitch = (
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  p: WavesParams,
  progress: number,
) => {
  // String-art parabola: straight chords whose envelope traces a parabola.
  // Two rails (rotated by curvature) are stitched end-to-start; phase slides
  // the stitch positions so the envelope flows.
  const lines = Math.max(4, Math.round(p.rows) * 4);
  const visible = Math.max(1, Math.ceil(lines * progress));
  const scale = Math.min(width, height) / 2.6;
  const centerX = width / 2;
  const centerY = height / 2;
  const railAngle = p.curvature * Math.PI * 0.5;

  const rail = (angle: number, s: number): [number, number] => {
    const len = 1 + p.amplitude;
    return [Math.cos(angle) * len * s, Math.sin(angle) * len * s];
  };

  ctx.globalAlpha = p.opacity;
  ctx.beginPath();
  for (let i = 0; i < visible; i += 1) {
    const s = ((i / lines + p.phase * 0.1) % 1 + 1) % 1;
    for (const flip of [1, -1]) {
      const [x0, y0] = rail(-Math.PI / 2 + railAngle * flip, s);
      const [x1, y1] = rail(0 + railAngle * flip, 1 - s);
      ctx.moveTo(centerX + x0 * flip * scale, centerY + y0 * scale);
      ctx.lineTo(centerX + x1 * flip * scale, centerY + y1 * scale);
    }
  }
  ctx.stroke();
};

const render = (
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  p: WavesParams,
  progress: number = 1,
) => {
  drawBackground(ctx, width, height);
  ctx.strokeStyle = p.lineColor;
  ctx.lineWidth = p.lineWidth;
  const prog = clamp(progress, 0, 1);
  if (p.style === 'stitch') {
    renderStitch(ctx, width, height, p, prog);
  } else {
    renderRidge(ctx, width, height, p, prog);
  }
  ctx.globalAlpha = 1;
};

const lerp = makeParamsLerp<WavesParams>({
  colors: ['lineColor'],
  ints: ['rows'],
  steps: ['style'],
});

const drift = (p: WavesParams, time: number, seed: number, amount: number): WavesParams => {
  if (amount <= 0) return p;
  const wander = makeWander(seed, time);
  return {
    ...p,
    amplitude: p.amplitude * (1 + 0.2 * amount * wander()),
    wavelength: Math.max(0.1, p.wavelength * (1 + 0.12 * amount * wander())),
    curvature: p.curvature + 0.2 * amount * wander(),
    phase: p.phase + 0.6 * amount * wander(),
  };
};

export const wavesGenerator: GeneratorDef<WavesParams> = {
  id: 'waves',
  label: 'Waves',
  defaults: DEFAULTS,
  presets: PRESETS,
  render,
  lerp,
  drift,
  controls: [
    { kind: 'select', key: 'style', label: 'Style', options: [
      { value: 'ridge', label: 'Ridgelines' },
      { value: 'stitch', label: 'String Art' },
    ] },
    { kind: 'int', key: 'rows', label: 'Rows / Density', min: 4, max: 80 },
    { kind: 'slider', key: 'amplitude', label: 'Amplitude', min: 0, max: 1.2, step: 0.01, decimals: 2 },
    { kind: 'slider', key: 'wavelength', label: 'Wavelength', min: 0.2, max: 4, step: 0.01, decimals: 2 },
    { kind: 'slider', key: 'curvature', label: 'Curvature', min: -1, max: 1, step: 0.01, decimals: 2 },
    { kind: 'slider', key: 'phase', label: 'Phase / Flow', min: 0, max: Math.PI * 4, step: 0.01, decimals: 2 },
    { kind: 'slider', key: 'spacing', label: 'Row Spacing', min: 0.01, max: 0.15, step: 0.005, decimals: 3 },
    { kind: 'slider', key: 'falloff', label: 'Depth Falloff', min: 0, max: 1, step: 0.01, decimals: 2 },
    { kind: 'slider', key: 'flowSpeed', label: 'Flow Speed (cyc/s)', min: -1, max: 1, step: 0.01, decimals: 2 },
    { kind: 'slider', key: 'colorCycle', label: 'Color Cycle (hue/s)', min: 0, max: 0.5, step: 0.01, decimals: 2 },
    { kind: 'color', key: 'lineColor', label: 'Color' },
    { kind: 'slider', key: 'lineWidth', label: 'Line Width', min: 0.1, max: 4, step: 0.1, decimals: 1 },
    { kind: 'slider', key: 'opacity', label: 'Opacity', min: 0.05, max: 1, step: 0.01, decimals: 2 },
  ],
  rates: [
    { rateKey: 'flowSpeed', targetKey: 'phase', kind: 'add' },
    { rateKey: 'colorCycle', targetKey: 'lineColor', kind: 'hue' },
  ],
  dream: {
    colorKey: 'lineColor',
    hint: 'E.g., calm ocean swell flowing under a golden sky...',
    base: {
      ranges: {
        rows: [16, 44], amplitude: [0.2, 0.6], wavelength: [0.6, 2.4],
        curvature: [-0.5, 0.5], spacing: [0.04, 0.09], falloff: [0.3, 0.7],
        flowSpeed: [0.06, 0.2],
        lineWidth: [0.5, 1.3], opacity: [0.5, 0.9],
      },
    },
    keywords: {
      parabola: { set: { style: 'stitch' }, ranges: { rows: [30, 64] } },
      parabolic: { set: { style: 'stitch' }, ranges: { rows: [30, 64] } },
      strings: { set: { style: 'stitch' }, ranges: { rows: [30, 64] } },
      stitched: { set: { style: 'stitch' }, ranges: { rows: [30, 64] } },
      swell: { ranges: { wavelength: [1.8, 3.2], amplitude: [0.4, 0.8] } },
      choppy: { ranges: { wavelength: [0.3, 0.7] } },
      interference: { ranges: { rows: [36, 60], wavelength: [0.4, 0.8] } },
      cathedral: { set: { style: 'stitch' }, ranges: { curvature: [-0.6, -0.2], rows: [48, 72] } },
    },
    ints: ['rows'],
    densityKeys: ['rows'],
    growKeys: ['amplitude'],
  },
  supportsDrawOn: true,
  stat: (p) => (p.style === 'stitch' ? `${Math.round(p.rows) * 8} chords` : `${Math.round(p.rows)} rows`),
};
