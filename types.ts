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
  colorCycle: number; // hue rotations per second (integrated over the clip)
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
  rotation: number; // radians, static orientation
  spinRate: number; // revolutions per second (integrated)
  colorCycle: number; // hue rotations per second (integrated)
  // Set by the chaos-safe morph when a keyframe segment passes through a
  // collapsed region: render this set fading out and blendWith fading in.
  blendWith?: { params: AttractorParams; mix: number };
}

export interface LissajousParams {
  freqX: number;
  freqY: number;
  phase: number; // radians, X vs Y phase offset
  modFreq: number; // radial modulation frequency
  modDepth: number; // 0..1 radial modulation depth
  rotation: number; // radians
  turns: number; // parameter range in 2*PI units
  points: number;
  spinRate: number; // revolutions per second (integrated into rotation)
  phaseRate: number; // phase cycles per second (integrated into phase)
  colorCycle: number; // hue rotations per second (integrated)
  lineColor: string;
  lineWidth: number;
  opacity: number;
}

export interface CrystalParams {
  symmetry: number; // N-fold rotational symmetry
  depth: number; // branching recursion depth
  branchAngle: number; // radians between child branches
  lengthRatio: number; // child length / parent length
  spread: number; // opening of the initial trunk fan
  jitter: number; // seeded per-branch angle variation
  seed: number; // structure seed (separate from drift seed)
  growth: number; // 0..1 how much of the lattice has grown
  rotation: number; // radians, static orientation
  tumble: number; // radians, coin-flip foreshortening angle
  offsetX: number; // horizontal offset in scene units
  offsetY: number; // vertical offset in scene units
  spinRate: number; // revolutions per second (integrated into rotation)
  tumbleRate: number; // flips per second (integrated into tumble)
  colorCycle: number; // hue rotations per second (integrated)
  lineColor: string;
  lineWidth: number;
  opacity: number;
}

export type WavesStyle = 'ridge' | 'stitch';

export interface WavesParams {
  rows: number;
  amplitude: number;
  wavelength: number;
  curvature: number; // parabolic bend of each row
  phase: number; // animates flow
  spacing: number; // vertical distance between rows
  falloff: number; // 0..1 amplitude/opacity falloff toward the back rows
  style: WavesStyle;
  flowSpeed: number; // wave cycles per second (integrated into phase)
  colorCycle: number; // hue rotations per second (integrated)
  lineColor: string;
  lineWidth: number;
  opacity: number;
}

export interface HelixParams {
  strands: number;
  radius: number;
  pitch: number; // vertical extent
  turns: number;
  twist: number; // radians, rotates the whole helix
  tilt: number; // radians, 3D tilt toward the viewer
  taper: number; // 0..1 radius reduction along length
  perspective: number; // projection strength
  points: number;
  twistRate: number; // revolutions per second (integrated into twist)
  colorCycle: number; // hue rotations per second (integrated)
  lineColor: string;
  lineWidth: number;
  opacity: number;
}

export type GeneratorId =
  | 'harmonograph'
  | 'attractor'
  | 'lissajous'
  | 'crystal'
  | 'waves'
  | 'helix';

// Legacy two-mode id kept for the AI Dreamer service and v1 project files.
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
  drawOn: boolean; // generators that support it: figure draws itself across the clip
  drift: number; // 0..1: seeded slow oscillation layered on top of keyframes
  driftSeed: number;
}

// Serialized project files for save/load.
export interface ProjectFileV1 {
  app: 'harmonogen';
  version: 1;
  mode: AppMode;
  settings: AnimationSettings;
  harmonographKeyframes: AnimationKeyframe<HarmonographParams>[];
  attractorKeyframes: AnimationKeyframe<AttractorParams>[];
}

export interface ProjectFile {
  app: 'harmonogen';
  version: 2;
  generator: GeneratorId;
  settings: AnimationSettings;
  keyframes: Partial<Record<GeneratorId, AnimationKeyframe<unknown>[]>>;
}

export interface AIConfigResponse {
  name: string;
  description: string;
  params: Partial<HarmonographParams> | Partial<AttractorParams>;
}
