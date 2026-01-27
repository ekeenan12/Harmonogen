import { HarmonographParams, AttractorParams } from './types';

// Helper to create unique IDs
export const generateId = () => Math.random().toString(36).substr(2, 9);

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
};

export const DEFAULT_ATTRACTOR: AttractorParams = {
  model: 'clifford',
  a: 1.5,
  b: -1.8,
  c: 1.6,
  d: 0.9,
  iterations: 100000,
  color: '#f472b6', // Pink-400
  opacity: 0.3,
  zoom: 1.0
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
  }
};

export const ATTRACTOR_PRESETS: Record<string, AttractorParams> = {
  classic: DEFAULT_ATTRACTOR,
  gold: { ...DEFAULT_ATTRACTOR, a: 1.4, b: 1.6, c: 1.0, d: 0.7, color: '#facc15' }, // Yellow-400
  storm: { ...DEFAULT_ATTRACTOR, model: 'dejong', a: 1.4, b: -2.3, c: 2.4, d: -2.1, color: '#60a5fa' }, // Blue-400
  flame: { ...DEFAULT_ATTRACTOR, model: 'clifford', a: -1.7, b: 1.3, c: -0.1, d: -1.2, color: '#f87171' }, // Red-400
  crystal: { ...DEFAULT_ATTRACTOR, model: 'dejong', a: -2.24, b: 0.43, c: -0.65, d: -2.43, color: '#a78bfa' }, // Purple-400
  dragon: { ...DEFAULT_ATTRACTOR, model: 'clifford', a: -1.7, b: 1.8, c: -1.9, d: -0.4, color: '#34d399' }, // Emerald-400
  spirit: { ...DEFAULT_ATTRACTOR, model: 'clifford', a: -1.8, b: -2.0, c: -0.5, d: -0.9, color: '#fb923c' } // Orange-400
};
