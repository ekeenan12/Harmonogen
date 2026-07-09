import { GeneratorId } from '../types';

// Declarative control schema rendered by components/GeneratorControls.tsx.
export type ControlSpec =
  | { kind: 'slider'; key: string; label: string; min: number; max: number; step: number; decimals?: number }
  | { kind: 'int'; key: string; label: string; min: number; max: number; step?: number }
  | { kind: 'number'; key: string; label: string; step?: number; min?: number }
  | { kind: 'color'; key: string; label: string }
  | { kind: 'select'; key: string; label: string; options: { value: string; label: string }[] };

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
  supportsDrawOn?: boolean;
  // Optional extras used by the settings panel.
  randomize?: (params: P) => P;
  stat?: (params: P) => string;
  // Params override for high-res still export (e.g. boosted iterations).
  exportBoost?: (params: P) => P;
}
