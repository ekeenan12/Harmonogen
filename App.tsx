import React, { useState, useCallback } from 'react';
import { generateId } from './utils/id';
import {
  HarmonographParams,
  AttractorParams,
  Oscillator,
  GeneratorId,
  AnimationKeyframe,
  AnimationSettings,
  ProjectFile,
  ProjectFileV1,
} from './types';
import OscillatorControl from './components/OscillatorControl';
import CanvasRenderer from './components/CanvasRenderer';
import AnimationPanel from './components/AnimationPanel';
import GeneratorControls from './components/GeneratorControls';
import { dreamAnimation } from './services/dreamer';
import { GENERATORS, GENERATOR_LIST, generatorFrame } from './generators';

// Icons
const SparklesIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
    <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 00-2.456 2.456zM16.894 20.567L16.5 21.75l-.394-1.183a2.25 2.25 0 00-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 001.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 001.423 1.423l1.183.394-1.183.394a2.25 2.25 0 00-1.423 1.423z" />
  </svg>
);

const PlusIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
    <path d="M10.75 4.75a.75.75 0 00-1.5 0v4.5h-4.5a.75.75 0 000 1.5h4.5v4.5a.75.75 0 001.5 0v-4.5h4.5a.75.75 0 000-1.5h-4.5v-4.5z" />
  </svg>
);

const DownloadIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
    <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
  </svg>
);

const DiceIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
    <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 12c0-1.232-.046-2.453-.138-3.662a4.006 4.006 0 00-3.7-3.7 48.678 48.678 0 00-7.324 0 4.006 4.006 0 00-3.7 3.7c-.017.22-.032.441-.046.662M19.5 12l3-3m-3 3l-3-3m-12 3c0 1.232.046 2.453.138 3.662a4.006 4.006 0 003.7 3.7 48.656 48.656 0 007.324 0 4.006 4.006 0 003.7-3.7c.017-.22.032-.441.046-.662M4.5 12l3 3m-3-3l-3 3" />
  </svg>
);

const FilmIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
    <path strokeLinecap="round" strokeLinejoin="round" d="M3.375 5.25h17.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125H3.375A1.125 1.125 0 012.25 17.625V6.375c0-.621.504-1.125 1.125-1.125zM6 5.25v13.5m12-13.5v13.5M2.25 9h3.75m12 0h3.75M2.25 15h3.75m12 0h3.75" />
  </svg>
);

const DEFAULT_ANIMATION_SETTINGS: AnimationSettings = {
  duration: 20,
  fps: 30,
  width: 1920,
  height: 1080,
  easing: 'smooth',
  drawOn: false,
  drift: 0,
  driftSeed: 1,
};

const initialParams = (): Record<GeneratorId, any> => {
  const out = {} as Record<GeneratorId, any>;
  for (const def of GENERATOR_LIST) out[def.id] = def.defaults;
  return out;
};

const App: React.FC = () => {
  const [generatorId, setGeneratorId] = useState<GeneratorId>('harmonograph');
  const [allParams, setAllParams] = useState<Record<GeneratorId, any>>(initialParams);
  const [allKeyframes, setAllKeyframes] = useState<Partial<Record<GeneratorId, AnimationKeyframe<any>[]>>>({});

  const [aiPrompt, setAiPrompt] = useState('');
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'settings' | 'ai' | 'animate'>('settings');

  const [animSettings, setAnimSettings] = useState<AnimationSettings>(DEFAULT_ANIMATION_SETTINGS);
  const [animTime, setAnimTime] = useState(0);

  const def = GENERATORS[generatorId];
  const activeParams = allParams[generatorId];
  const keyframes = allKeyframes[generatorId] ?? [];

  const setActiveParams = useCallback(
    (next: any) => setAllParams((prev) => ({ ...prev, [generatorId]: next })),
    [generatorId],
  );

  const setKeyframes = useCallback(
    (updater: (prev: AnimationKeyframe<any>[]) => AnimationKeyframe<any>[]) =>
      setAllKeyframes((prev) => ({ ...prev, [generatorId]: updater(prev[generatorId] ?? []) })),
    [generatorId],
  );

  // Harmonograph-specific helpers for the bespoke oscillator panel.
  const hParams = allParams.harmonograph as HarmonographParams;
  const setHParams = useCallback(
    (value: HarmonographParams | ((prev: HarmonographParams) => HarmonographParams)) =>
      setAllParams((prev) => ({
        ...prev,
        harmonograph: typeof value === 'function' ? value(prev.harmonograph) : value,
      })),
    [],
  );

  const handleOscChange = useCallback((axis: 'X' | 'Y', updated: Oscillator) => {
    setHParams((prev) => ({
      ...prev,
      [axis === 'X' ? 'xOscillators' : 'yOscillators']: prev[axis === 'X' ? 'xOscillators' : 'yOscillators'].map(o =>
        o.id === updated.id ? updated : o
      )
    }));
  }, [setHParams]);

  const addOscillator = (axis: 'X' | 'Y') => {
    const newOsc: Oscillator = { id: generateId(), amplitude: 0.5, frequency: 1, phase: 0, damping: 0.005 };
    setHParams((prev) => ({
      ...prev,
      [axis === 'X' ? 'xOscillators' : 'yOscillators']: [...prev[axis === 'X' ? 'xOscillators' : 'yOscillators'], newOsc]
    }));
  };

  const removeOscillator = (axis: 'X' | 'Y', id: string) => {
    setHParams((prev) => ({
      ...prev,
      [axis === 'X' ? 'xOscillators' : 'yOscillators']: prev[axis === 'X' ? 'xOscillators' : 'yOscillators'].filter(o => o.id !== id)
    }));
  };

  // AI Dreamer: deterministic offline prompt → animation. May switch
  // generator when the prompt names a clear subject (snowflake → Crystal).
  const handleAiGenerate = () => {
    if (!aiPrompt.trim()) return;
    setIsAiLoading(true);
    try {
      const result = dreamAnimation(aiPrompt, generatorId, animSettings.duration);
      setAllParams((prev) => ({ ...prev, [result.generator]: result.editorParams }));
      setAllKeyframes((prev) => ({ ...prev, [result.generator]: result.keyframes }));
      setAnimSettings((prev) => ({ ...prev, drift: result.drift, driftSeed: result.driftSeed }));
      if (result.generator !== generatorId) setGeneratorId(result.generator);
      setAnimTime(0);
      setActiveTab('animate');
    } catch (e) {
      alert("Failed to generate configuration. Please try again.");
    } finally {
      setIsAiLoading(false);
    }
  };

  // Export a 1920x1080 still of the current look.
  const handleExport = () => {
    const width = 1920;
    const height = 1080;

    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');

    if (ctx) {
      const exportParams = def.exportBoost ? def.exportBoost(activeParams) : activeParams;
      def.render(ctx, width, height, exportParams, 1);

      const dataUrl = canvas.toDataURL('image/png');
      const link = document.createElement('a');
      link.href = dataUrl;
      link.download = `${generatorId}-${Date.now()}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  const handleLoadProject = (raw: ProjectFile | ProjectFileV1) => {
    setAnimSettings({ ...DEFAULT_ANIMATION_SETTINGS, ...raw.settings });
    // Backfill params saved before newer fields existed with the generator's
    // defaults — except motion rates, which backfill as 0 so a project saved
    // before rates existed keeps rendering exactly as it did (defaults may
    // ship with nonzero motion for freshly-created params).
    const normalize = (id: GeneratorId, kfs: AnimationKeyframe<any>[]) => {
      const def = GENERATORS[id];
      const zeroRates: Record<string, number> = {};
      for (const r of def.rates ?? []) zeroRates[r.rateKey] = 0;
      return kfs.map((kf) => ({ ...kf, params: { ...def.defaults, ...zeroRates, ...kf.params } }));
    };
    if (raw.version === 2) {
      const known = Object.fromEntries(
        Object.entries(raw.keyframes ?? {})
          .filter(([id]) => id in GENERATORS)
          .map(([id, kfs]) => [id, normalize(id as GeneratorId, (kfs as AnimationKeyframe<any>[]) ?? [])]),
      ) as Partial<Record<GeneratorId, AnimationKeyframe<any>[]>>;
      setAllKeyframes(known);
      if (raw.generator in GENERATORS) setGeneratorId(raw.generator);
    } else {
      // v1: two fixed keyframe lists and mode 'fractal' for the attractor.
      setAllKeyframes({
        harmonograph: normalize('harmonograph', raw.harmonographKeyframes ?? []),
        attractor: normalize('attractor', raw.attractorKeyframes ?? []),
      });
      setGeneratorId(raw.mode === 'fractal' ? 'attractor' : 'harmonograph');
    }
    setAnimTime(0);
  };

  // When the Animate tab is open and keyframes exist, the canvas previews the
  // interpolated animation at the scrubber time instead of the editor params.
  let previewParams = activeParams;
  let previewProgress = 1;
  if (activeTab === 'animate') {
    const p = generatorFrame(def, keyframes, animTime, animSettings);
    if (p) {
      previewParams = p;
      if (animSettings.drawOn && def.supportsDrawOn && animSettings.duration > 0) {
        previewProgress = Math.min(1, animTime / animSettings.duration);
      }
    }
  }

  return (
    <div className="flex flex-col h-screen w-full bg-slate-950 text-slate-200 font-sans">

      {/* Header */}
      <header className="flex-none h-14 border-b border-slate-800 flex items-center px-6 bg-slate-900/80 backdrop-blur z-10 justify-between">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded bg-gradient-to-br from-cyan-400 to-purple-500 animate-pulse"></div>
          <h1 className="font-bold text-lg tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-cyan-400 to-purple-300">
            HarmonoGen AI
          </h1>
        </div>

        {/* Generator Switcher */}
        <div className="flex bg-slate-800/50 rounded-lg p-1 border border-slate-700">
          {GENERATOR_LIST.map((g) => (
            <button
              key={g.id}
              onClick={() => setGeneratorId(g.id)}
              className={`px-3 py-1 text-xs font-medium rounded transition-all ${generatorId === g.id ? 'bg-cyan-500/20 text-cyan-400 shadow-sm' : 'text-slate-500 hover:text-slate-300'}`}
            >
              {g.label}
            </button>
          ))}
        </div>
      </header>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">

        {/* Sidebar */}
        <aside className="w-full md:w-[400px] flex-none border-r border-slate-800 flex flex-col bg-slate-900/50 backdrop-blur overflow-y-auto">

          <div className="flex border-b border-slate-800">
            <button
              onClick={() => setActiveTab('settings')}
              className={`flex-1 py-3 text-sm font-medium transition-colors ${activeTab === 'settings' ? 'text-cyan-400 border-b-2 border-cyan-400 bg-slate-800/50' : 'text-slate-400 hover:text-slate-200'}`}
            >
              Controls
            </button>
            <button
              onClick={() => setActiveTab('ai')}
              className={`flex-1 py-3 text-sm font-medium transition-colors flex items-center justify-center gap-2 ${activeTab === 'ai' ? 'text-purple-400 border-b-2 border-purple-400 bg-slate-800/50' : 'text-slate-400 hover:text-slate-200'}`}
            >
              <SparklesIcon />
              AI Dreamer
            </button>
            <button
              onClick={() => setActiveTab('animate')}
              className={`flex-1 py-3 text-sm font-medium transition-colors flex items-center justify-center gap-2 ${activeTab === 'animate' ? 'text-emerald-400 border-b-2 border-emerald-400 bg-slate-800/50' : 'text-slate-400 hover:text-slate-200'}`}
            >
              <FilmIcon />
              Animate
            </button>
          </div>

          <div className="p-4 space-y-6">

            {activeTab === 'ai' && (
              <div className="space-y-4 animate-in fade-in slide-in-from-left-4 duration-300">
                <div className="bg-purple-900/10 border border-purple-500/30 p-4 rounded-xl">
                  <h3 className="text-purple-300 font-semibold mb-2 text-sm">
                    Describe a scene, mood, or motion...
                  </h3>
                  <textarea
                    value={aiPrompt}
                    onChange={(e) => setAiPrompt(e.target.value)}
                    placeholder={def.dream?.hint ?? 'E.g., a calm hypnotic pattern slowly spinning...'}
                    className="w-full bg-slate-950/50 border border-purple-500/30 rounded-lg p-3 text-sm focus:border-purple-400 outline-none h-32 resize-none placeholder-purple-300/30"
                  />
                  <button
                    onClick={handleAiGenerate}
                    disabled={isAiLoading || !aiPrompt}
                    className="mt-3 w-full bg-purple-600 hover:bg-purple-500 disabled:opacity-50 disabled:cursor-not-allowed text-white py-2 rounded-lg text-sm font-semibold transition-all flex items-center justify-center gap-2 shadow-lg shadow-purple-900/20"
                  >
                    {isAiLoading ? (
                      <span className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full"></span>
                    ) : (
                      <SparklesIcon />
                    )}
                    Dream Animation
                  </button>
                  <p className="text-[10px] text-purple-300/40 mt-2">
                    Deterministic and offline: the prompt is hashed into a seed, recognized words
                    (moods, motion, subjects) steer the result, and the same prompt always dreams
                    the same clip. Naming a subject like "snowflake" or "ocean" switches generators.
                  </p>
                </div>

                <div className="border-t border-slate-800 pt-4">
                  <h4 className="text-xs font-semibold text-slate-500 uppercase mb-3">Presets</h4>
                  <div className="grid grid-cols-2 gap-2">
                    {Object.keys(def.presets).map(key => (
                      <button key={key} onClick={() => setActiveParams(def.presets[key])} className="px-3 py-2 text-xs bg-slate-800 hover:bg-slate-700 rounded text-slate-300 capitalize text-left transition-colors">
                        {key}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'animate' && (
              <AnimationPanel
                def={def}
                currentParams={activeParams}
                keyframes={keyframes}
                setKeyframes={setKeyframes}
                allKeyframes={allKeyframes}
                settings={animSettings}
                setSettings={setAnimSettings}
                time={animTime}
                setTime={setAnimTime}
                onLoadParams={setActiveParams}
                onLoadProject={handleLoadProject}
              />
            )}

            {activeTab === 'settings' && generatorId === 'harmonograph' && (
              <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
                   <div className="flex justify-between items-center">
                     <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Simulation Config</h3>
                     <button onClick={handleExport} className="flex items-center gap-1.5 px-3 py-1.5 bg-cyan-900/30 hover:bg-cyan-900/50 text-cyan-400 hover:text-cyan-300 rounded text-xs transition-colors border border-cyan-500/20" title="Export HD">
                        <DownloadIcon /> Export HD
                     </button>
                   </div>
                   <div className="grid grid-cols-2 gap-3">
                     <div>
                       <label className="text-[10px] text-slate-400">Duration (sec)</label>
                       <input type="number" value={hParams.duration} onChange={(e) => setHParams({...hParams, duration: parseInt(e.target.value)})} className="w-full bg-slate-800 border border-slate-700 rounded px-2 py-1 text-sm mt-1" />
                     </div>
                     <div>
                       <label className="text-[10px] text-slate-400">Resolution (Hz)</label>
                       <input type="number" value={hParams.sampleRate} step={100} onChange={(e) => setHParams({...hParams, sampleRate: parseInt(e.target.value)})} className="w-full bg-slate-800 border border-slate-700 rounded px-2 py-1 text-sm mt-1" />
                     </div>
                   </div>
                   <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-[10px] text-slate-400">Color</label>
                        <div className="flex items-center mt-1">
                          <input type="color" value={hParams.lineColor} onChange={(e) => setHParams({...hParams, lineColor: e.target.value})} className="w-6 h-6 rounded overflow-hidden border-none cursor-pointer bg-transparent p-0" />
                          <span className="text-xs ml-2 text-slate-500 font-mono">{hParams.lineColor}</span>
                        </div>
                      </div>
                      <div>
                        <label className="text-[10px] text-slate-400">Line Width</label>
                        <input type="range" min="0.1" max="3" step="0.1" value={hParams.lineWidth} onChange={(e) => setHParams({...hParams, lineWidth: parseFloat(e.target.value)})} className="w-full accent-cyan-500 h-1 bg-slate-700 rounded mt-3" />
                      </div>
                   </div>
                   <div>
                     <div className="flex justify-between text-xs mb-1">
                       <span className="text-slate-400">Color Cycle (hue/s)</span>
                       <span className="text-slate-300 font-mono">{(hParams.colorCycle ?? 0).toFixed(2)}</span>
                     </div>
                     <input type="range" min="0" max="0.5" step="0.01" value={hParams.colorCycle ?? 0} onChange={(e) => setHParams({...hParams, colorCycle: parseFloat(e.target.value)})} className="w-full accent-cyan-500 h-1 bg-slate-700 rounded appearance-none" />
                   </div>

                   <div className="bg-slate-900/50 p-3 rounded-lg border border-slate-800">
                    <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Turntable</h3>
                    <div className="space-y-3">
                      <div>
                        <div className="flex justify-between text-xs mb-1">
                          <span>Speed</span><span className="text-slate-400">{hParams.turntableOmega.toFixed(3)}</span>
                        </div>
                        <input type="range" min="-0.5" max="0.5" step="0.001" value={hParams.turntableOmega} onChange={(e) => setHParams({...hParams, turntableOmega: parseFloat(e.target.value)})} className="w-full accent-cyan-500 h-1 bg-slate-700 rounded appearance-none" />
                      </div>
                      <div>
                        <div className="flex justify-between text-xs mb-1">
                          <span>Damping</span><span className="text-slate-400">{hParams.turntableDamping.toFixed(4)}</span>
                        </div>
                        <input type="range" min="0" max="0.1" step="0.0001" value={hParams.turntableDamping} onChange={(e) => setHParams({...hParams, turntableDamping: parseFloat(e.target.value)})} className="w-full accent-cyan-500 h-1 bg-slate-700 rounded appearance-none" />
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <div className="flex justify-between items-center mb-2"><h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider">X-Axis</h3><button onClick={() => addOscillator('X')} className="text-cyan-400 hover:text-cyan-300 transition p-1 hover:bg-slate-800 rounded"><PlusIcon /></button></div>
                      {hParams.xOscillators.map(osc => (<OscillatorControl key={osc.id} axis="X" oscillator={osc} onChange={(u) => handleOscChange('X', u)} onRemove={() => removeOscillator('X', osc.id)} canRemove={hParams.xOscillators.length > 1} />))}
                    </div>
                    <div>
                      <div className="flex justify-between items-center mb-2"><h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Y-Axis</h3><button onClick={() => addOscillator('Y')} className="text-cyan-400 hover:text-cyan-300 transition p-1 hover:bg-slate-800 rounded"><PlusIcon /></button></div>
                      {hParams.yOscillators.map(osc => (<OscillatorControl key={osc.id} axis="Y" oscillator={osc} onChange={(u) => handleOscChange('Y', u)} onRemove={() => removeOscillator('Y', osc.id)} canRemove={hParams.yOscillators.length > 1} />))}
                    </div>
                  </div>
              </div>
            )}

            {activeTab === 'settings' && generatorId !== 'harmonograph' && def.controls !== 'custom' && (
               <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
                  <div className="flex justify-between items-center">
                     <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider">{def.label} Config</h3>
                     <button onClick={handleExport} className="flex items-center gap-1.5 px-3 py-1.5 bg-cyan-900/30 hover:bg-cyan-900/50 text-cyan-400 hover:text-cyan-300 rounded text-xs transition-colors border border-cyan-500/20" title="Export HD">
                        <DownloadIcon /> Export HD
                     </button>
                   </div>

                   {/* Presets */}
                   <div className="bg-slate-900/50 p-3 rounded-lg border border-slate-800">
                     <div className="flex justify-between items-center mb-3">
                       <label className="text-[10px] text-slate-400 block uppercase font-bold">Presets</label>
                       {def.randomize && (
                         <button onClick={() => setActiveParams(def.randomize!(activeParams))} className="text-xs text-purple-400 hover:text-white flex items-center gap-1 bg-purple-900/20 px-2 py-0.5 rounded hover:bg-purple-900/40 transition">
                           <DiceIcon /> Randomize
                         </button>
                       )}
                     </div>
                     <div className="grid grid-cols-3 gap-2">
                       {Object.entries(def.presets).map(([key, preset]) => (
                         <button
                           key={key}
                           onClick={() => setActiveParams(preset)}
                           className="text-[10px] bg-slate-800 hover:bg-slate-700 text-slate-300 py-1.5 rounded capitalize transition-colors"
                         >
                           {key}
                         </button>
                       ))}
                     </div>
                   </div>

                   <GeneratorControls
                     specs={def.controls}
                     params={activeParams}
                     onChange={setActiveParams}
                   />
               </div>
            )}

            <div className="h-8"></div>
          </div>
        </aside>

        {/* Canvas Area */}
        <main className="flex-1 bg-black relative p-4 md:p-8 flex items-center justify-center overflow-hidden">
          <CanvasRenderer def={def} params={previewParams} progress={previewProgress} />
        </main>

      </div>
    </div>
  );
};

export default App;
