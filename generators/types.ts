import { GeneratorId } from '../types';

// Declarative control schema rendered by components/GeneratorControls.tsx.
export type ControlSpec =
  | { kind: 'slider'; key: string; label: string; min: number; max: number; step: number; decimals?: number }
  | { kind: 'int'; key: string; label: string; min: number; max: number; step?: number }
  | { kind: 'number'; key: string; label: string; step?: number; min?: number }
  | { kind: 'color'; key: string; label: string }
  | { kind: 'select'; key: string; label: string; options: { value: string; label: string }[] };

// Maps a rate param (cycles per second, keyframable) to the param that
// receives its time-integrated phase. 'add' offsets a numeric param
// (scale = radians per cycle, default 2π); 'hue' rotates a hex color's hue
// (360° per cycle). Integration keeps motion continuous even when the rate
// itself is keyframed (e.g. waves speeding up into a drop).
export interface RateSpec {
  rateKey: string;
  targetKey: string;
  kind: 'add' | 'hue';
  scale?: number;
}

// --- AI Dreamer ----------------------------------------------------------
// Declarative prompt→params biasing. The dreamer (services/dreamer.ts)
// samples `ranges` with a prompt-seeded RNG, applies `set` values verbatim,
// and picks a color from `palette`.
export interface DreamBias {
  ranges?: Record<string, [number, number]>;
  set?: Record<string, unknown>;
  palette?: string[];
}

// Prompt-derived context handed to bespoke builders (harmonograph/attractor).
export interface DreamContext {
  rng: () => number;
  palette: string[] | null; // mood-derived palette, if any matched
  rateScale: number;
  densityBias: number; // -1..1, minimal → dense
  opacityScale: number;
  lineScale: number;
  energy: number; // 0..1, becomes the drift amount
  frozen: boolean; // "still/frozen": zero all motion rates
  symmetric: boolean;
}

export interface DreamSpec {
  colorKey: string; // which param holds the primary color
  base: DreamBias; // always applied
  keywords: Record<string, DreamBias>; // generator-specific structure words
  ints?: string[]; // sampled values to round
  densityKeys?: string[]; // sampling shifts with mood density
  growKeys?: string[]; // ramped from near-zero by "growing" prompts
  hint?: string; // textarea placeholder for this generator
  build?: (ctx: DreamContext) => any; // bespoke full-params builder
}

export interface GeneratorDef<P = any> {
  id: GeneratorId;
  label: string;
  defaults: P;
  presets: Record<string, P>;
  // Must be deterministic: preview, stills, and mp4 export all call this.
  render: (
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number,
    params: P,
    progress?: number,
  ) => void;
  lerp: (a: P, b: P, u: number) => P;
  drift: (params: P, time: number, seed: number, amount: number) => P;
  controls: ControlSpec[] | 'custom';
  rates?: RateSpec[];
  dream?: DreamSpec;
  supportsDrawOn?: boolean;
  // Optional extras used by the settings panel.
  randomize?: (params: P) => P;
  stat?: (params: P) => string;
  // Params override for high-res still export (e.g. boosted iterations).
  exportBoost?: (params: P) => P;
}
