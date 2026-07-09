import { AnimationKeyframe, GeneratorId } from '../types';
import { GENERATORS } from '../generators';
import { DreamBias, DreamContext, GeneratorDef, RateSpec } from '../generators/types';
import { clamp, lerp, seededStream } from '../utils/animation';
import { generateId } from '../utils/id';

// The AI Dreamer: a deterministic, fully offline prompt→animation engine.
// The prompt is hashed into a seed; recognized words bias parameter ranges,
// palettes, motion rates, and keyframe ramps; a seeded RNG picks concrete
// values. Same prompt → same animation, forever.

// --- Vocabulary ------------------------------------------------------------

interface MoodEffect {
  palette?: string[];
  rateScale?: number;
  opacityScale?: number;
  lineScale?: number;
  densityBias?: number; // -1 minimal .. 1 dense
  energy?: number; // becomes the drift amount
}

const PALETTES = {
  cool: ['#38bdf8', '#22d3ee', '#a5b4fc', '#818cf8'],
  hot: ['#f43f5e', '#fb7185', '#c084fc', '#f97316'],
  storm: ['#60a5fa', '#0ea5e9', '#a78bfa', '#818cf8'],
  organic: ['#34d399', '#f59e0b', '#84cc16', '#22c55e'],
  saturated: ['#06b6d4', '#d946ef', '#f59e0b', '#22d3ee'],
  deep: ['#6366f1', '#7c3aed', '#4c1d95', '#312e81'],
  neon: ['#22d3ee', '#e879f9', '#a3e635', '#f0abfc'],
  ice: ['#a5f3fc', '#e0f2fe', '#93c5fd', '#cffafe'],
  warm: ['#fb923c', '#f87171', '#fbbf24', '#f97316'],
  gold: ['#facc15', '#fbbf24', '#fde68a', '#f59e0b'],
  ocean: ['#38bdf8', '#2dd4bf', '#0ea5e9', '#67e8f9'],
};

const MOODS: Record<string, MoodEffect> = {
  calm: { palette: PALETTES.cool, rateScale: 0.5, densityBias: -0.2, energy: 0.15 },
  serene: { palette: PALETTES.cool, rateScale: 0.5, densityBias: -0.2, energy: 0.15 },
  gentle: { palette: PALETTES.cool, rateScale: 0.5, energy: 0.15 },
  ambient: { palette: PALETTES.cool, rateScale: 0.6, energy: 0.2 },
  chaotic: { palette: PALETTES.hot, rateScale: 1.5, densityBias: 0.4, energy: 0.6 },
  wild: { palette: PALETTES.hot, rateScale: 1.5, densityBias: 0.4, energy: 0.6 },
  turbulent: { palette: PALETTES.storm, rateScale: 1.5, energy: 0.6 },
  stormy: { palette: PALETTES.storm, rateScale: 1.4, densityBias: 0.3, energy: 0.6 },
  organic: { palette: PALETTES.organic, energy: 0.3 },
  hypnotic: { rateScale: 1.0, energy: 0.25 },
  trance: { rateScale: 1.0, energy: 0.25 },
  driving: { palette: PALETTES.saturated, rateScale: 1.8, energy: 0.45 },
  pulsing: { palette: PALETTES.saturated, rateScale: 1.8, energy: 0.45 },
  minimal: { densityBias: -0.8, lineScale: 0.6 },
  dense: { densityBias: 0.8 },
  layered: { densityBias: 0.8 },
  intricate: { densityBias: 0.8 },
  dark: { palette: PALETTES.deep, opacityScale: 0.6 },
  brooding: { palette: PALETTES.deep, opacityScale: 0.6, energy: 0.2 },
  neon: { palette: PALETTES.neon, opacityScale: 1.2 },
  electric: { palette: PALETTES.neon, opacityScale: 1.2, rateScale: 1.4 },
  icy: { palette: PALETTES.ice },
  fire: { palette: PALETTES.warm },
  ember: { palette: PALETTES.warm, opacityScale: 0.8 },
  warm: { palette: PALETTES.warm },
  golden: { palette: PALETTES.gold },
  ocean: { palette: PALETTES.ocean },
  aqua: { palette: PALETTES.ocean },
};

// Motion words sample a generator's rate params by category, so they apply
// to whatever rates each generator actually has.
type RateCategory = 'rotationlike' | 'phaselike' | 'tumble' | 'hue';

const MOTIONS: Record<string, { targets: RateCategory[]; range: [number, number]; signed?: boolean }> = {
  spinning: { targets: ['rotationlike'], range: [0.03, 0.15], signed: true },
  rotating: { targets: ['rotationlike'], range: [0.03, 0.15], signed: true },
  twisting: { targets: ['rotationlike'], range: [0.05, 0.2], signed: true },
  tumbling: { targets: ['tumble'], range: [0.05, 0.2] },
  falling: { targets: ['tumble'], range: [0.08, 0.25] },
  flowing: { targets: ['phaselike'], range: [0.1, 0.4], signed: true },
  streaming: { targets: ['phaselike'], range: [0.2, 0.6], signed: true },
  rolling: { targets: ['phaselike'], range: [0.08, 0.25], signed: true },
  prismatic: { targets: ['hue'], range: [0.05, 0.2] },
  rainbow: { targets: ['hue'], range: [0.1, 0.3] },
  shifting: { targets: ['hue'], range: [0.03, 0.12] },
};

const FREEZE_WORDS = ['still', 'static', 'frozen'];

// Subject nouns that clearly belong to one generator: the Dreamer switches
// to it before configuring.
const SUBJECTS: [string[], GeneratorId][] = [
  [['snowflake', 'snowflakes', 'frost', 'crystal', 'crystals', 'crystalline', 'ice', 'icicle', 'fern', 'lattice'], 'crystal'],
  [['ocean', 'sea', 'wave', 'waves', 'ripple', 'ripples', 'tide', 'dune', 'dunes', 'swell', 'ridgeline'], 'waves'],
  [['spiral', 'spirals', 'helix', 'helices', 'dna', 'coil', 'vortex', 'tornado', 'corkscrew'], 'helix'],
  [['storm', 'nebula', 'smoke', 'particle', 'particles', 'dust', 'attractor'], 'attractor'],
  [['pendulum', 'pendulums', 'orbit', 'orbits', 'oscillation', 'harmonograph'], 'harmonograph'],
  [['knot', 'knots', 'loop', 'loops', 'rose', 'rosette', 'figure', 'lissajous'], 'lissajous'],
];

// Temporal words turn the dream into a two-keyframe ramp.
type TemporalKind = 'grow' | 'fade' | 'accelerate' | 'shrink';

const TEMPORALS: Record<string, TemporalKind> = {
  growing: 'grow', blooming: 'grow', emerging: 'grow', unfolding: 'grow', building: 'grow',
  fading: 'fade', dissolving: 'fade', vanishing: 'fade',
  accelerating: 'accelerate', rising: 'accelerate', intensifying: 'accelerate',
  collapsing: 'shrink', unwinding: 'shrink', shrinking: 'shrink', receding: 'shrink',
};

// --- Prompt parsing ---------------------------------------------------------

const hashPrompt = (prompt: string): number => {
  let hash = 2166136261;
  for (let i = 0; i < prompt.length; i += 1) {
    hash ^= prompt.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
};

const hasWord = (normalized: string, word: string) =>
  new RegExp(`\\b${word}\\b`).test(normalized);

const detectGenerator = (normalized: string): GeneratorId | null => {
  for (const [words, id] of SUBJECTS) {
    if (words.some((w) => hasWord(normalized, w))) return id;
  }
  return null;
};

// --- Sampling ----------------------------------------------------------------

const categorizeRate = (rate: RateSpec): RateCategory => {
  if (rate.kind === 'hue') return 'hue';
  if (rate.rateKey === 'tumbleRate') return 'tumble';
  if (rate.targetKey === 'phase') return 'phaselike';
  return 'rotationlike'; // rotation, twist
};

const mergeBias = (into: DreamBias, next: DreamBias): DreamBias => ({
  ranges: { ...into.ranges, ...next.ranges },
  set: { ...into.set, ...next.set },
  palette: next.palette ?? into.palette,
});

// Shift a 0..1 sample toward one end for density-tagged params.
const biasedSample = (u: number, bias: number) =>
  bias >= 0 ? u + (1 - u) * bias * 0.7 : u * (1 + bias * 0.7);

const genericBuild = (def: GeneratorDef, bias: DreamBias, ctx: DreamContext): any => {
  const spec = def.dream!;
  const params: Record<string, any> = { ...def.defaults };
  const ints = new Set(spec.ints ?? []);
  const density = new Set(spec.densityKeys ?? []);

  for (const [key, [min, max]] of Object.entries(bias.ranges ?? {})) {
    let u = ctx.rng();
    if (density.has(key)) u = clamp(biasedSample(u, ctx.densityBias), 0, 1);
    const v = lerp(min, max, u);
    params[key] = ints.has(key) ? Math.round(v) : v;
  }
  Object.assign(params, bias.set ?? {});

  const palette = bias.palette ?? ctx.palette;
  if (palette) params[spec.colorKey] = palette[Math.floor(ctx.rng() * palette.length)];
  if (typeof params.opacity === 'number') params.opacity = clamp(params.opacity * ctx.opacityScale, 0.05, 1);
  if (typeof params.lineWidth === 'number') params.lineWidth = Math.max(0.1, params.lineWidth * ctx.lineScale);
  return params;
};

// --- Dreaming -----------------------------------------------------------------

export interface DreamResult {
  generator: GeneratorId;
  keyframes: AnimationKeyframe<any>[];
  editorParams: any;
  drift: number;
  driftSeed: number;
}

export const dreamAnimation = (
  prompt: string,
  currentGenerator: GeneratorId,
  clipDuration: number,
): DreamResult => {
  const normalized = prompt.toLowerCase();
  const seed = hashPrompt(prompt);
  const rng = seededStream(seed);

  const generator = detectGenerator(normalized) ?? currentGenerator;
  const def = GENERATORS[generator];
  const spec = def.dream;

  // Merge matched moods.
  let palette: string[] | null = null;
  let rateScale = 1;
  let opacityScale = 1;
  let lineScale = 1;
  let densityBias = 0;
  let energy = 0.3;
  let energySet = false;
  for (const [word, mood] of Object.entries(MOODS)) {
    if (!hasWord(normalized, word)) continue;
    if (mood.palette) palette = mood.palette;
    if (mood.rateScale !== undefined) rateScale *= mood.rateScale;
    if (mood.opacityScale !== undefined) opacityScale *= mood.opacityScale;
    if (mood.lineScale !== undefined) lineScale *= mood.lineScale;
    if (mood.densityBias !== undefined) densityBias = clamp(densityBias + mood.densityBias, -1, 1);
    if (mood.energy !== undefined) {
      energy = energySet ? Math.max(energy, mood.energy) : mood.energy;
      energySet = true;
    }
  }
  const frozen = FREEZE_WORDS.some((w) => hasWord(normalized, w));
  const symmetric = hasWord(normalized, 'symmetric') || hasWord(normalized, 'balanced');

  const ctx: DreamContext = {
    rng, palette, rateScale, densityBias, opacityScale, lineScale,
    energy: frozen ? 0 : energy, // "still/frozen" means no drift either
    frozen, symmetric,
  };

  // Build base params: bespoke builder or declarative sampling.
  let params: Record<string, any>;
  if (spec?.build) {
    params = spec.build(ctx);
  } else if (spec) {
    let bias = mergeBias({}, spec.base);
    for (const [word, keywordBias] of Object.entries(spec.keywords)) {
      if (hasWord(normalized, word)) bias = mergeBias(bias, keywordBias);
    }
    params = genericBuild(def, bias, ctx);
  } else {
    params = { ...def.defaults };
  }

  // Motion words → rate params (by category, scaled by mood).
  if (def.rates) {
    const categories = new Map(def.rates.map((r) => [categorizeRate(r), r.rateKey]));
    for (const [word, motion] of Object.entries(MOTIONS)) {
      if (!hasWord(normalized, word)) continue;
      for (const target of motion.targets) {
        const rateKey = categories.get(target);
        if (!rateKey) continue;
        const magnitude = lerp(motion.range[0], motion.range[1], rng()) * rateScale;
        const sign = motion.signed && rng() < 0.5 ? -1 : 1;
        params[rateKey] = magnitude * sign;
      }
    }
    if (frozen) {
      for (const r of def.rates) params[r.rateKey] = 0;
    }
  }

  // Temporal words → a two-keyframe ramp.
  let temporal: TemporalKind | null = null;
  for (const [word, kind] of Object.entries(TEMPORALS)) {
    if (hasWord(normalized, word)) { temporal = kind; break; }
  }

  const makeKf = (time: number, p: Record<string, any>): AnimationKeyframe<any> => ({
    id: generateId(), time, params: p,
  });

  let keyframes: AnimationKeyframe<any>[];
  if (temporal) {
    const start: Record<string, any> = { ...params };
    const end: Record<string, any> = { ...params };
    const ints = new Set(spec?.ints ?? []);
    const growKeys = spec?.growKeys ?? [];
    if (temporal === 'grow' || temporal === 'shrink') {
      const low: Record<string, any> = {};
      for (const key of growKeys) {
        const v = params[key];
        if (typeof v !== 'number') continue;
        const shrunk = key === 'growth' ? 0 : v * 0.15;
        low[key] = ints.has(key) ? Math.max(1, Math.round(shrunk)) : shrunk;
        if (key === 'growth') low[key] = 0;
      }
      Object.assign(temporal === 'grow' ? start : end, low);
    } else if (temporal === 'fade') {
      end.opacity = 0.02;
    } else if (temporal === 'accelerate') {
      for (const r of def.rates ?? []) {
        const v = params[r.rateKey];
        if (typeof v === 'number' && v !== 0) {
          start[r.rateKey] = v * 0.2;
          end[r.rateKey] = v * 1.6;
        }
      }
    }
    keyframes = [makeKf(0, start), makeKf(Math.max(1, clipDuration), end)];
    params = start;
  } else {
    keyframes = [makeKf(0, params)];
  }

  return {
    generator,
    keyframes,
    editorParams: structuredClone(params),
    drift: Math.round(ctx.energy * 100) / 100,
    driftSeed: seed % 100000,
  };
};
