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

// A snapshot of physics params pinned to a point in the animation clip.
export interface AnimationKeyframe<T> {
  id: string;
  time: number; // seconds from clip start
  params: T;
}

export type EasingMode = 'linear' | 'smooth';

export interface AnimationSettings {
  duration: number; // clip length in seconds
  fps: number;
  width: number;
  height: number;
  easing: EasingMode;
  drawOn: boolean; // harmonograph only: trace draws itself across the clip
}

export interface AIConfigResponse {
  name: string;
  description: string;
  params: Partial<HarmonographParams> | Partial<AttractorParams>;
}
