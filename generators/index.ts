import { AnimationKeyframe, AnimationSettings, GeneratorId } from '../types';
import { hueRotateHex, integrateKeyframedScalar, paramsAtTime } from '../utils/animation';
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
// keyframe interpolation, drift, then integrated motion rates — all as a
// pure function of time.
export const generatorFrame = <P>(
  def: GeneratorDef<P>,
  keyframes: AnimationKeyframe<P>[],
  time: number,
  settings: Pick<AnimationSettings, 'easing' | 'drift' | 'driftSeed'>,
): P | null => {
  const interpolated = paramsAtTime(keyframes, time, settings.easing, def.lerp);
  if (!interpolated) return null;
  let p = def.drift(interpolated, time, settings.driftSeed, settings.drift);

  if (def.rates?.length) {
    const out = { ...p } as Record<string, any>;
    for (const rate of def.rates) {
      const cycles = integrateKeyframedScalar(
        keyframes,
        (kp) => Number((kp as Record<string, unknown>)[rate.rateKey]) || 0,
        time,
        settings.easing,
      );
      if (cycles === 0) continue;
      // A crossfading attractor frame carries a second param set in
      // blendWith; motion must apply to both sides so the fade stays coherent.
      const targets: Record<string, any>[] = [out];
      if (out.blendWith?.params) {
        out.blendWith = { ...out.blendWith, params: { ...out.blendWith.params } };
        targets.push(out.blendWith.params);
      }
      for (const target of targets) {
        if (rate.kind === 'add' && typeof target[rate.targetKey] === 'number') {
          target[rate.targetKey] += cycles * (rate.scale ?? Math.PI * 2);
        } else if (rate.kind === 'hue' && typeof target[rate.targetKey] === 'string') {
          target[rate.targetKey] = hueRotateHex(target[rate.targetKey], cycles * 360);
        }
      }
    }
    p = out as P;
  }
  return p;
};

export type { GeneratorDef, ControlSpec } from './types';
