import { AnimationKeyframe, AnimationSettings, GeneratorId } from '../types';
import { paramsAtTime } from '../utils/animation';
import { attractorGenerator } from './attractor';
import { crystalGenerator } from './crystal';
import { harmonographGenerator } from './harmonograph';
import { helixGenerator } from './helix';
import { lissajousGenerator } from './lissajous';
import { GeneratorDef } from './types';
import { wavesGenerator } from './waves';

export const GENERATORS: Record<GeneratorId, GeneratorDef> = {
  harmonograph: harmonographGenerator,
  attractor: attractorGenerator,
  lissajous: lissajousGenerator,
  crystal: crystalGenerator,
  waves: wavesGenerator,
  helix: helixGenerator,
};

export const GENERATOR_LIST: GeneratorDef[] = Object.values(GENERATORS);

// The single frame function shared by the live preview and the mp4 exporter:
// keyframe interpolation plus drift, as a pure function of time.
export const generatorFrame = <P>(
  def: GeneratorDef<P>,
  keyframes: AnimationKeyframe<P>[],
  time: number,
  settings: Pick<AnimationSettings, 'easing' | 'drift' | 'driftSeed'>,
): P | null => {
  const p = paramsAtTime(keyframes, time, settings.easing, def.lerp);
  return p ? def.drift(p, time, settings.driftSeed, settings.drift) : null;
};

export type { GeneratorDef, ControlSpec } from './types';
