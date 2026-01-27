import { DEFAULT_ATTRACTOR, DEFAULT_PARAMS, generateId } from "../constants";
import { AttractorParams, AttractorType, HarmonographParams, AppMode, Oscillator } from "../types";

type Range = [number, number];

type HarmonographBias = {
  amplitudeRange?: Range;
  frequencyRange?: Range;
  dampingRange?: Range;
  turntableOmegaRange?: Range;
  turntableDampingRange?: Range;
  oscillatorCount?: number;
  colorPalette?: string[];
  symmetric?: boolean;
  phaseSpread?: number;
};

type AttractorBias = {
  model?: AttractorType;
  paramRange?: Range;
  zoomRange?: Range;
  colorPalette?: string[];
  symmetric?: boolean;
};

const KEYWORD_BIASES: Record<string, { harmonograph?: HarmonographBias; attractor?: AttractorBias }> = {
  calm: {
    harmonograph: {
      frequencyRange: [0.6, 2.2],
      dampingRange: [0.001, 0.01],
      turntableOmegaRange: [0, 0.03],
      colorPalette: ["#38bdf8", "#22d3ee", "#a5b4fc"],
      phaseSpread: Math.PI,
    },
    attractor: {
      paramRange: [-1.6, 1.6],
      zoomRange: [0.9, 1.6],
      colorPalette: ["#38bdf8", "#818cf8", "#a5f3fc"],
    },
  },
  chaotic: {
    harmonograph: {
      frequencyRange: [2.5, 7.5],
      dampingRange: [0.008, 0.06],
      turntableOmegaRange: [-0.2, 0.2],
      oscillatorCount: 3,
      colorPalette: ["#f43f5e", "#fb7185", "#c084fc"],
    },
    attractor: {
      paramRange: [-3, 3],
      zoomRange: [0.5, 1.2],
      colorPalette: ["#f472b6", "#f97316", "#a855f7"],
    },
  },
  organic: {
    harmonograph: {
      frequencyRange: [1.0, 3.5],
      dampingRange: [0.003, 0.02],
      colorPalette: ["#34d399", "#f59e0b", "#84cc16"],
    },
    attractor: {
      paramRange: [-2.2, 2.2],
      zoomRange: [0.8, 1.5],
      colorPalette: ["#34d399", "#fbbf24", "#22c55e"],
    },
  },
  stormy: {
    harmonograph: {
      frequencyRange: [3.0, 8.5],
      dampingRange: [0.012, 0.08],
      turntableOmegaRange: [-0.35, 0.35],
      oscillatorCount: 3,
      colorPalette: ["#60a5fa", "#0ea5e9", "#a78bfa"],
    },
    attractor: {
      paramRange: [-3, 3],
      zoomRange: [0.5, 1.1],
      colorPalette: ["#60a5fa", "#818cf8", "#c084fc"],
      model: "dejong",
    },
  },
  symmetric: {
    harmonograph: {
      symmetric: true,
      frequencyRange: [1.2, 3.2],
      dampingRange: [0.002, 0.02],
      phaseSpread: Math.PI / 2,
    },
    attractor: {
      symmetric: true,
    },
  },
};

const BASE_HARMONOGRAPH_BIAS: HarmonographBias = {
  amplitudeRange: [0.4, 1.3],
  frequencyRange: [1.0, 4.5],
  dampingRange: [0.002, 0.03],
  turntableOmegaRange: [-0.05, 0.05],
  turntableDampingRange: [0, 0.02],
  oscillatorCount: 2,
  colorPalette: ["#06b6d4", "#22d3ee", "#818cf8", "#f472b6"],
  phaseSpread: Math.PI * 2,
};

const BASE_ATTRACTOR_BIAS: AttractorBias = {
  paramRange: [-2.5, 2.5],
  zoomRange: [0.7, 1.8],
  colorPalette: ["#f472b6", "#a78bfa", "#60a5fa", "#fb923c"],
  model: "clifford",
};

const KEYWORD_VOCABULARY = [
  "calm",
  "chaotic",
  "organic",
  "stormy",
  "symmetric",
  "serene",
  "gentle",
  "wild",
  "turbulent",
  "balanced",
];

const hashPrompt = (prompt: string): number => {
  let hash = 2166136261;
  for (let i = 0; i < prompt.length; i += 1) {
    hash ^= prompt.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
};

const seededRandom = (seed: number) => {
  let t = seed >>> 0;
  return () => {
    t += 0x6d2b79f5;
    let r = Math.imul(t ^ (t >>> 15), 1 | t);
    r ^= r + Math.imul(r ^ (r >>> 7), 61 | r);
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
};

const pickRange = (rng: () => number, [min, max]: Range) => min + (max - min) * rng();

const pickPalette = (rng: () => number, palette: string[]) =>
  palette[Math.floor(rng() * palette.length)];

const detectKeywords = (prompt: string) => {
  const normalized = prompt.toLowerCase();
  const keywords = Object.keys(KEYWORD_BIASES);
  return keywords.filter((keyword) => new RegExp(`\\b${keyword}\\b`).test(normalized));
};

const mergeHarmonographBias = (base: HarmonographBias, next: HarmonographBias): HarmonographBias => ({
  amplitudeRange: next.amplitudeRange ?? base.amplitudeRange,
  frequencyRange: next.frequencyRange ?? base.frequencyRange,
  dampingRange: next.dampingRange ?? base.dampingRange,
  turntableOmegaRange: next.turntableOmegaRange ?? base.turntableOmegaRange,
  turntableDampingRange: next.turntableDampingRange ?? base.turntableDampingRange,
  oscillatorCount: Math.max(base.oscillatorCount ?? 2, next.oscillatorCount ?? 0),
  colorPalette: next.colorPalette ?? base.colorPalette,
  symmetric: next.symmetric ?? base.symmetric,
  phaseSpread: next.phaseSpread ?? base.phaseSpread,
});

const mergeAttractorBias = (base: AttractorBias, next: AttractorBias): AttractorBias => ({
  paramRange: next.paramRange ?? base.paramRange,
  zoomRange: next.zoomRange ?? base.zoomRange,
  colorPalette: next.colorPalette ?? base.colorPalette,
  model: next.model ?? base.model,
  symmetric: next.symmetric ?? base.symmetric,
});

const buildHarmonographParams = (prompt: string): HarmonographParams => {
  const seed = hashPrompt(prompt);
  const rng = seededRandom(seed);
  const tags = detectKeywords(prompt);

  const bias = tags.reduce(
    (current, tag) => mergeHarmonographBias(current, KEYWORD_BIASES[tag]?.harmonograph ?? {}),
    BASE_HARMONOGRAPH_BIAS,
  );

  const oscillatorCount = Math.max(1, bias.oscillatorCount ?? 2);
  const amplitudeRange = bias.amplitudeRange ?? BASE_HARMONOGRAPH_BIAS.amplitudeRange!;
  const frequencyRange = bias.frequencyRange ?? BASE_HARMONOGRAPH_BIAS.frequencyRange!;
  const dampingRange = bias.dampingRange ?? BASE_HARMONOGRAPH_BIAS.dampingRange!;
  const phaseSpread = bias.phaseSpread ?? BASE_HARMONOGRAPH_BIAS.phaseSpread!;

  const makeOscillator = (): Oscillator => ({
    id: generateId(),
    amplitude: pickRange(rng, amplitudeRange),
    frequency: pickRange(rng, frequencyRange),
    phase: pickRange(rng, [0, phaseSpread]),
    damping: pickRange(rng, dampingRange),
  });

  const xOscillators = Array.from({ length: oscillatorCount }, makeOscillator);
  const yOscillators = bias.symmetric
    ? xOscillators.map((osc) => ({
        ...osc,
        id: generateId(),
        phase: (osc.phase + Math.PI / 2) % (Math.PI * 2),
      }))
    : Array.from({ length: oscillatorCount }, makeOscillator);

  return {
    ...DEFAULT_PARAMS,
    xOscillators,
    yOscillators,
    turntableOmega: pickRange(rng, bias.turntableOmegaRange ?? BASE_HARMONOGRAPH_BIAS.turntableOmegaRange!),
    turntableDamping: pickRange(
      rng,
      bias.turntableDampingRange ?? BASE_HARMONOGRAPH_BIAS.turntableDampingRange!,
    ),
    lineColor: pickPalette(rng, bias.colorPalette ?? BASE_HARMONOGRAPH_BIAS.colorPalette!),
  };
};

const buildAttractorParams = (prompt: string): AttractorParams => {
  const seed = hashPrompt(prompt);
  const rng = seededRandom(seed + 101);
  const tags = detectKeywords(prompt);

  const bias = tags.reduce(
    (current, tag) => mergeAttractorBias(current, KEYWORD_BIASES[tag]?.attractor ?? {}),
    BASE_ATTRACTOR_BIAS,
  );

  const paramRange = bias.paramRange ?? BASE_ATTRACTOR_BIAS.paramRange!;
  const zoomRange = bias.zoomRange ?? BASE_ATTRACTOR_BIAS.zoomRange!;
  const baseValue = () => pickRange(rng, paramRange);

  const a = baseValue();
  const b = bias.symmetric ? a + pickRange(rng, [-0.2, 0.2]) : baseValue();
  const c = bias.symmetric ? a + pickRange(rng, [-0.3, 0.3]) : baseValue();
  const d = bias.symmetric ? b + pickRange(rng, [-0.3, 0.3]) : baseValue();

  return {
    ...DEFAULT_ATTRACTOR,
    model: bias.model ?? DEFAULT_ATTRACTOR.model,
    a,
    b,
    c,
    d,
    zoom: pickRange(rng, zoomRange),
    color: pickPalette(rng, bias.colorPalette ?? BASE_ATTRACTOR_BIAS.colorPalette!),
  };
};

export const generateConfig = async (
  prompt: string,
  mode: AppMode,
): Promise<HarmonographParams | AttractorParams> => {
  if (mode === "harmonograph") {
    return buildHarmonographParams(prompt);
  }
  return buildAttractorParams(prompt);
};

export { KEYWORD_VOCABULARY };
