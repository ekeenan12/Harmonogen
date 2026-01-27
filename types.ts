export interface Oscillator {
  id: string;
  amplitude: number; // A
  frequency: number; // Hz (converted to rad/s internally via 2*PI*f)
  phase: number; // radians
  damping: number; // d
}

export interface HarmonographParams {
  duration: number; // seconds
  sampleRate: number; // Hz
  lineColor: string;
  lineWidth: number;
  opacity: number;
  xOscillators: Oscillator[];
  yOscillators: Oscillator[];
  turntableOmega: number; // Hz (converted to rad/s internally)
  turntableDamping: number;
}

export type AttractorType = 'clifford' | 'dejong';

export interface AttractorParams {
  model: AttractorType;
  a: number;
  b: number;
  c: number;
  d: number;
  iterations: number;
  color: string;
  opacity: number;
  zoom: number;
}

export type AppMode = 'harmonograph' | 'fractal';

export interface AIConfigResponse {
  name: string;
  description: string;
  params: Partial<HarmonographParams> | Partial<AttractorParams>;
}
