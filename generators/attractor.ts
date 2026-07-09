import { AttractorParams, AttractorType } from '../types';
import { clamp, lerp, lerpHexColor, makeWander, seededStream, smoothstep } from '../utils/animation';
import { drawBackground } from '../utils/renderCanvas';
import { GeneratorDef } from './types';

export const DEFAULT_ATTRACTOR: AttractorParams = {
  model: 'clifford',
  a: 1.5,
  b: -1.8,
  c: 1.6,
  d: 0.9,
  iterations: 100000,
  color: '#f472b6', // Pink-400
  opacity: 0.3,
  zoom: 1.0,
  rotation: 0,
  spinRate: 0,
  colorCycle: 0,
};

export const ATTRACTOR_PRESETS: Record<string, AttractorParams> = {
  classic: DEFAULT_ATTRACTOR,
  gold: { ...DEFAULT_ATTRACTOR, a: 1.4, b: 1.6, c: 1.0, d: 0.7, color: '#facc15' },
  storm: { ...DEFAULT_ATTRACTOR, model: 'dejong', a: 1.4, b: -2.3, c: 2.4, d: -2.1, color: '#60a5fa' },
  flame: { ...DEFAULT_ATTRACTOR, model: 'clifford', a: -1.7, b: 1.3, c: -0.1, d: -1.2, color: '#f87171' },
  crystal: { ...DEFAULT_ATTRACTOR, model: 'dejong', a: -2.24, b: 0.43, c: -0.65, d: -2.43, color: '#a78bfa' },
  dragon: { ...DEFAULT_ATTRACTOR, model: 'clifford', a: -1.7, b: 1.8, c: -1.9, d: -0.4, color: '#34d399' },
  spirit: { ...DEFAULT_ATTRACTOR, model: 'clifford', a: -1.8, b: -2.0, c: -0.5, d: -0.9, color: '#fb923c' },
};

type Coeffs = [number, number, number, number];

const stepOrbit = (
  model: AttractorType,
  [a, b, c, d]: Coeffs,
  x: number,
  y: number,
): [number, number] => {
  if (model === 'clifford') {
    return [Math.sin(a * y) + c * Math.cos(a * x), Math.sin(b * x) + d * Math.cos(b * y)];
  }
  return [Math.sin(a * y) - Math.cos(b * x), Math.sin(c * x) - Math.cos(d * y)];
};

// --- Chaos-safe morphing ---------------------------------------------------
// Straight lines between two coefficient sets often pass through regions
// where the orbit collapses to a fixed point or short periodic cycle,
// rendering as a near-empty frame. We probe orbit density along the path;
// dead stretches first try a deterministic detour arc through coefficient
// space, and fall back to crossfading the two endpoint attractors.

const DENSITY_PROBE_ITER = 2000;
const DENSITY_GRID = 48;
const DENSITY_THRESHOLD = 0.05; // healthy presets probe at 0.06–0.26; collapsed orbits ~0.001
const PATH_SAMPLES = 32;
// Detour arcs are only trustworthy over short gaps: probes are discrete, and
// chaotic windows in coefficient space are narrow, so a long arc can die
// between probe points. Wider gaps crossfade instead.
const MAX_DETOUR_GAP = 0.3;
const DETOUR_PROBES = 13;

const orbitDensity = (model: AttractorType, coeffs: Coeffs): number => {
  let x = 0.1;
  let y = 0.1;
  for (let i = 0; i < 20; i += 1) {
    [x, y] = stepOrbit(model, coeffs, x, y);
  }
  const cells = new Set<number>();
  for (let i = 0; i < DENSITY_PROBE_ITER; i += 1) {
    [x, y] = stepOrbit(model, coeffs, x, y);
    if (!Number.isFinite(x) || !Number.isFinite(y)) return 0;
    // Orbits of both maps live within roughly ±4.
    const cx = clamp(Math.floor(((x + 4) / 8) * DENSITY_GRID), 0, DENSITY_GRID - 1);
    const cy = clamp(Math.floor(((y + 4) / 8) * DENSITY_GRID), 0, DENSITY_GRID - 1);
    cells.add(cx * DENSITY_GRID + cy);
  }
  return cells.size / DENSITY_PROBE_ITER;
};

interface DeadGap {
  u0: number;
  u1: number;
  detour?: Coeffs; // peak offset of the detour arc; undefined = crossfade
}

interface MorphPlan {
  fadeWhole: boolean; // model change: crossfade the entire segment
  gaps: DeadGap[];
}

const coeffsAt = (a: AttractorParams, b: AttractorParams, u: number): Coeffs => [
  lerp(a.a, b.a, u),
  lerp(a.b, b.b, u),
  lerp(a.c, b.c, u),
  lerp(a.d, b.d, u),
];

const detourCoeffsAt = (base: Coeffs, detour: Coeffs, s: number): Coeffs => {
  const bump = Math.sin(Math.PI * s);
  return [
    base[0] + detour[0] * bump,
    base[1] + detour[1] * bump,
    base[2] + detour[2] * bump,
    base[3] + detour[3] * bump,
  ];
};

const hashString = (str: string): number => {
  let hash = 2166136261;
  for (let i = 0; i < str.length; i += 1) {
    hash ^= str.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
};

const findDetour = (
  model: AttractorType,
  a: AttractorParams,
  b: AttractorParams,
  u0: number,
  u1: number,
  seed: number,
): Coeffs | undefined => {
  if (u1 - u0 > MAX_DETOUR_GAP) return undefined;
  const rng = seededStream(seed);
  const start = coeffsAt(a, b, u0);
  const end = coeffsAt(a, b, u1);
  const gapSize = Math.hypot(end[0] - start[0], end[1] - start[1], end[2] - start[2], end[3] - start[3]);
  const baseScale = Math.max(0.25, gapSize);

  for (let attempt = 0; attempt < 8; attempt += 1) {
    // Random direction in coefficient space, scaled up as attempts fail.
    const dir: Coeffs = [rng() - 0.5, rng() - 0.5, rng() - 0.5, rng() - 0.5];
    const norm = Math.hypot(...dir) || 1;
    const scale = baseScale * (0.6 + 0.4 * attempt);
    const detour: Coeffs = [
      (dir[0] / norm) * scale,
      (dir[1] / norm) * scale,
      (dir[2] / norm) * scale,
      (dir[3] / norm) * scale,
    ];
    let alive = true;
    for (let i = 1; i < DETOUR_PROBES && alive; i += 1) {
      const s = i / DETOUR_PROBES;
      const u = u0 + (u1 - u0) * s;
      alive = orbitDensity(model, detourCoeffsAt(coeffsAt(a, b, u), detour, s)) >= DENSITY_THRESHOLD;
    }
    if (alive) return detour;
  }
  return undefined;
};

const planCache = new Map<string, MorphPlan>();

const getMorphPlan = (a: AttractorParams, b: AttractorParams): MorphPlan => {
  const key = JSON.stringify([a.model, a.a, a.b, a.c, a.d, b.model, b.a, b.b, b.c, b.d]);
  const cached = planCache.get(key);
  if (cached) return cached;

  let plan: MorphPlan;
  if (a.model !== b.model) {
    plan = { fadeWhole: true, gaps: [] };
  } else {
    const alive: boolean[] = [];
    for (let i = 0; i <= PATH_SAMPLES; i += 1) {
      alive.push(orbitDensity(a.model, coeffsAt(a, b, i / PATH_SAMPLES)) >= DENSITY_THRESHOLD);
    }
    // The user's keyframes are taken as-is even if degenerate.
    alive[0] = true;
    alive[PATH_SAMPLES] = true;

    const gaps: DeadGap[] = [];
    let i = 1;
    while (i < PATH_SAMPLES) {
      if (!alive[i]) {
        const startIdx = i;
        while (i < PATH_SAMPLES && !alive[i]) i += 1;
        const u0 = (startIdx - 1) / PATH_SAMPLES;
        const u1 = i / PATH_SAMPLES;
        const detour = findDetour(a.model, a, b, u0, u1, hashString(key) + startIdx);
        gaps.push({ u0, u1, detour });
      } else {
        i += 1;
      }
    }
    plan = { fadeWhole: false, gaps };
  }

  if (planCache.size > 32) planCache.clear();
  planCache.set(key, plan);
  return plan;
};

// Plain interpolation of the non-structural (visual) params.
const lerpVisuals = (a: AttractorParams, b: AttractorParams, u: number): AttractorParams => ({
  model: a.model,
  a: lerp(a.a, b.a, u),
  b: lerp(a.b, b.b, u),
  c: lerp(a.c, b.c, u),
  d: lerp(a.d, b.d, u),
  iterations: Math.round(lerp(a.iterations, b.iterations, u)),
  color: lerpHexColor(a.color, b.color, u),
  opacity: lerp(a.opacity, b.opacity, u),
  zoom: lerp(a.zoom, b.zoom, u),
  rotation: lerp(a.rotation ?? 0, b.rotation ?? 0, u),
  spinRate: lerp(a.spinRate ?? 0, b.spinRate ?? 0, u),
  colorCycle: lerp(a.colorCycle ?? 0, b.colorCycle ?? 0, u),
});

const lerpAttractor = (a: AttractorParams, b: AttractorParams, u: number): AttractorParams => {
  const base = lerpVisuals(a, b, u);
  const plan = getMorphPlan(a, b);

  if (plan.fadeWhole) {
    // Coefficient spaces of different models aren't compatible: hold each
    // side's coefficients and crossfade the point clouds.
    return {
      ...base,
      a: a.a, b: a.b, c: a.c, d: a.d,
      model: a.model,
      blendWith: {
        params: { ...base, model: b.model, a: b.a, b: b.b, c: b.c, d: b.d },
        mix: smoothstep(u),
      },
    };
  }

  for (const gap of plan.gaps) {
    if (u <= gap.u0 || u >= gap.u1) continue;
    const s = (u - gap.u0) / (gap.u1 - gap.u0);
    if (gap.detour) {
      const [ca, cb, cc, cd] = detourCoeffsAt(coeffsAt(a, b, u), gap.detour, s);
      return { ...base, a: ca, b: cb, c: cc, d: cd };
    }
    // Crossfade between the last-alive and next-alive points on the path.
    const from = coeffsAt(a, b, gap.u0);
    const to = coeffsAt(a, b, gap.u1);
    return {
      ...base,
      a: from[0], b: from[1], c: from[2], d: from[3],
      blendWith: {
        params: { ...base, a: to[0], b: to[1], c: to[2], d: to[3] },
        mix: smoothstep(s),
      },
    };
  }

  return base;
};

// --- Rendering ---------------------------------------------------------

const renderPoints = (
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  params: AttractorParams,
  iterations: number,
) => {
  const { model, a, b, c, d, color, opacity, zoom } = params;

  ctx.fillStyle = color;
  ctx.globalAlpha = opacity;

  let x = 0.1;
  let y = 0.1;

  const centerX = width / 2;
  const centerY = height / 2;
  const scale = (Math.min(width, height) / 5) * zoom;
  const rotation = params.rotation ?? 0;
  const cosR = Math.cos(rotation);
  const sinR = Math.sin(rotation);

  // Skip first few points to settle orbit
  for (let i = 0; i < 20; i++) {
    [x, y] = stepOrbit(model, [a, b, c, d], x, y);
  }

  for (let i = 0; i < iterations; i++) {
    [x, y] = stepOrbit(model, [a, b, c, d], x, y);
    const xr = x * cosR - y * sinR;
    const yr = x * sinR + y * cosR;
    ctx.fillRect(centerX + xr * scale, centerY + yr * scale, 1, 1);
  }
  ctx.globalAlpha = 1;
};

export const renderAttractor = (
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  params: AttractorParams,
) => {
  drawBackground(ctx, width, height);
  if (params.blendWith) {
    const { params: other, mix } = params.blendWith;
    renderPoints(ctx, width, height, params, Math.round(params.iterations * (1 - mix)));
    renderPoints(ctx, width, height, other, Math.round(params.iterations * mix));
  } else {
    renderPoints(ctx, width, height, params, params.iterations);
  }
};

// --- Drift ---------------------------------------------------------------

const driftAttractor = (
  params: AttractorParams,
  time: number,
  seed: number,
  amount: number,
): AttractorParams => {
  if (amount <= 0) return params;
  const wander = makeWander(seed, time);
  // Attractor coefficients are far more sensitive than harmonograph params:
  // wander beyond ~±0.1 tends to leave the chaotic regime and collapse the
  // orbit into a periodic cycle, so keep the range tight. The same offsets
  // are applied to both sides of a blend so crossfades stay coherent.
  const da = 0.08 * amount * wander();
  const db = 0.08 * amount * wander();
  const dc = 0.08 * amount * wander();
  const dd = 0.08 * amount * wander();
  const zoomMul = 1 + 0.05 * amount * wander();
  const apply = (p: AttractorParams): AttractorParams => ({
    ...p,
    a: p.a + da,
    b: p.b + db,
    c: p.c + dc,
    d: p.d + dd,
    zoom: Math.max(0.05, p.zoom * zoomMul),
  });
  const out = apply(params);
  if (params.blendWith) {
    out.blendWith = { params: apply(params.blendWith.params), mix: params.blendWith.mix };
  }
  return out;
};

export const attractorGenerator: GeneratorDef<AttractorParams> = {
  id: 'attractor',
  label: 'Attractor',
  defaults: DEFAULT_ATTRACTOR,
  presets: ATTRACTOR_PRESETS,
  render: (ctx, w, h, p) => renderAttractor(ctx, w, h, p),
  lerp: lerpAttractor,
  drift: driftAttractor,
  controls: [
    { kind: 'select', key: 'model', label: 'Model', options: [
      { value: 'clifford', label: 'Clifford' },
      { value: 'dejong', label: 'De Jong' },
    ] },
    { kind: 'slider', key: 'a', label: 'a', min: -3, max: 3, step: 0.01, decimals: 2 },
    { kind: 'slider', key: 'b', label: 'b', min: -3, max: 3, step: 0.01, decimals: 2 },
    { kind: 'slider', key: 'c', label: 'c', min: -3, max: 3, step: 0.01, decimals: 2 },
    { kind: 'slider', key: 'd', label: 'd', min: -3, max: 3, step: 0.01, decimals: 2 },
    { kind: 'int', key: 'iterations', label: 'Iterations', min: 10000, max: 500000, step: 1000 },
    { kind: 'number', key: 'zoom', label: 'Zoom', step: 0.1, min: 0.1 },
    { kind: 'slider', key: 'rotation', label: 'Rotation', min: 0, max: Math.PI * 2, step: 0.01, decimals: 2 },
    { kind: 'slider', key: 'spinRate', label: 'Spin Rate (rev/s)', min: -0.25, max: 0.25, step: 0.005, decimals: 3 },
    { kind: 'slider', key: 'colorCycle', label: 'Color Cycle (hue/s)', min: 0, max: 0.5, step: 0.01, decimals: 2 },
    { kind: 'color', key: 'color', label: 'Color' },
    { kind: 'slider', key: 'opacity', label: 'Opacity', min: 0.01, max: 1, step: 0.01, decimals: 2 },
  ],
  rates: [
    { rateKey: 'spinRate', targetKey: 'rotation', kind: 'add' },
    { rateKey: 'colorCycle', targetKey: 'color', kind: 'hue' },
  ],
  randomize: (p) => {
    const r = () => parseFloat((Math.random() * 5 - 2.5).toFixed(2));
    return { ...p, a: r(), b: r(), c: r(), d: r() };
  },
  stat: (p) => `${p.iterations.toLocaleString()} pts`,
  exportBoost: (p) => ({ ...p, iterations: Math.max(p.iterations * 2, 500000) }),
};
