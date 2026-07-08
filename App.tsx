import React, { useState, useCallback } from 'react';
import { DEFAULT_PARAMS, DEFAULT_ATTRACTOR, generateId, PRESETS, ATTRACTOR_PRESETS } from './constants';
import { HarmonographParams, AttractorParams, Oscillator, AppMode, AnimationKeyframe, AnimationSettings, ProjectFile } from './types';
import OscillatorControl from './components/OscillatorControl';
import CanvasRenderer from './components/CanvasRenderer';
import AnimationPanel from './components/AnimationPanel';
import { generateConfig } from './services/localGenerator';
import { renderHarmonograph, renderAttractor } from './utils/renderCanvas';
import { harmonographFrame, attractorFrame } from './utils/animation';

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
    <path strokeLinecap="round" strokeLinejoin="round" d="M3.375 19.5h17.25m-17.25 0a1.125 1.125 0 01-1.125-1.125M3.375 19.5h1.5C5.496 19.5 6 18.996 6 18.375m-3.75 0V5.625m0 12.75v-1.5c0-.621.504-1.125 1.125-1.125m18.375 2.625V5.625m0 12.75c0 .621-.504 1.125-1.125 1.125m1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125m0 3.75h-1.5A1.125 1.125 0 0118 18.375M20.625 4.5H3.375m17.25 0c.621 0 1.125.504 1.125 1.125M20.625 4.5h-1.5C18.504 4.5 18 5.004 18 5.625m3.75 0v1.5c0 .621-.504 1.125-1.125 1.125M3.375 4.5c-.621 0-1.125.504-1.125 1.125M3.375 4.5h1.5C5.496 4.5 6 5.004 6 5.625m-3.75 0v1.5c0 .621.504 1.125 1.125 1.125m0 0h1.5m-1.5 0c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125m1.5-3.75C5.496 8.25 6 7.746 6 7.125v-1.5M4.875 8.25C5.496 8.25 6 8.754 6 9.375v1.5m0-5.25v5.25m0-5.25C6 5.004 6.504 4.5 7.125 4.5h9.75c.621 0 1.125.504 1.125 1.125m1.125 2.625h1.5m-1.5 0A1.125 1.125 0 0118 7.125v-1.5m1.125 2.625c-.621 0-1.125.504-1.125 1.125v1.5m2.625-2.625c.621 0 1.125.504 1.125 1.125v1.5c0 .621-.504 1.125-1.125 1.125M18 5.625v5.25M7.125 12h9.75m-9.75 0A1.125 1.125 0 016 10.875M7.125 12C6.504 12 6 12.504 6 13.125m0-2.25C6 11.496 5.496 12 4.875 12M18 10.875c0 .621-.504 1.125-1.125 1.125M18 10.875c0 .621.504 1.125 1.125 1.125m-2.25 0c.621 0 1.125.504 1.125 1.125m-12 5.25v-5.25m0 5.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125m-12 0v-1.5c0-.621-.504-1.125-1.125-1.125M18 18.375v-5.25m0 5.25v-1.5c0-.621.504-1.125 1.125-1.125M18 13.125v1.5c0 .621.504 1.125 1.125 1.125M18 13.125c0-.621.504-1.125 1.125-1.125M6 13.125v1.5c0 .621-.504 1.125-1.125 1.125M6 13.125C6 12.504 5.496 12 4.875 12m-1.5 0h1.5m-1.5 0c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125m0 0h1.5" />
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

const App: React.FC = () => {
  const [mode, setMode] = useState<AppMode>('harmonograph');
  const [params, setParams] = useState<HarmonographParams>(DEFAULT_PARAMS);
  const [attractorParams, setAttractorParams] = useState<AttractorParams>(DEFAULT_ATTRACTOR);

  const [aiPrompt, setAiPrompt] = useState('');
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'settings' | 'ai' | 'animate'>('settings');

  // Animation state
  const [animSettings, setAnimSettings] = useState<AnimationSettings>(DEFAULT_ANIMATION_SETTINGS);
  const [harmonographKeyframes, setHarmonographKeyframes] = useState<AnimationKeyframe<HarmonographParams>[]>([]);
  const [attractorKeyframes, setAttractorKeyframes] = useState<AnimationKeyframe<AttractorParams>[]>([]);
  const [animTime, setAnimTime] = useState(0);

  // Oscillator Handlers
  const handleOscChange = useCallback((axis: 'X' | 'Y', updated: Oscillator) => {
    setParams(prev => ({
      ...prev,
      [axis === 'X' ? 'xOscillators' : 'yOscillators']: prev[axis === 'X' ? 'xOscillators' : 'yOscillators'].map(o => 
        o.id === updated.id ? updated : o
      )
    }));
  }, []);

  const addOscillator = (axis: 'X' | 'Y') => {
    const newOsc: Oscillator = { id: generateId(), amplitude: 0.5, frequency: 1, phase: 0, damping: 0.005 };
    setParams(prev => ({
      ...prev,
      [axis === 'X' ? 'xOscillators' : 'yOscillators']: [...prev[axis === 'X' ? 'xOscillators' : 'yOscillators'], newOsc]
    }));
  };

  const removeOscillator = (axis: 'X' | 'Y', id: string) => {
    setParams(prev => ({
      ...prev,
      [axis === 'X' ? 'xOscillators' : 'yOscillators']: prev[axis === 'X' ? 'xOscillators' : 'yOscillators'].filter(o => o.id !== id)
    }));
  };

  // AI Generation
  const handleAiGenerate = async () => {
    if (!aiPrompt.trim()) return;
    setIsAiLoading(true);
    try {
      const newConfig = await generateConfig(aiPrompt, mode);
      if (mode === 'harmonograph') {
        setParams(newConfig as HarmonographParams);
      } else {
        setAttractorParams(newConfig as AttractorParams);
      }
    } catch (e) {
      alert("Failed to generate configuration. Please try again.");
    } finally {
      setIsAiLoading(false);
    }
  };

  // Randomize Attractor
  const randomizeAttractor = () => {
    const r = () => (Math.random() * 5 - 2.5).toFixed(2); // Random between -2.5 and 2.5
    setAttractorParams(prev => ({
      ...prev,
      a: parseFloat(r()),
      b: parseFloat(r()),
      c: parseFloat(r()),
      d: parseFloat(r()),
    }));
  };

  // Export 1920x1080
  const handleExport = () => {
    const width = 1920;
    const height = 1080;
    
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    
    if (ctx) {
      if (mode === 'harmonograph') {
        renderHarmonograph(ctx, width, height, params);
      } else {
        // Boost iterations for HD export of fractal
        const exportParams = { ...attractorParams, iterations: Math.max(attractorParams.iterations * 2, 500000) };
        renderAttractor(ctx, width, height, exportParams);
      }
      
      const dataUrl = canvas.toDataURL('image/png');
      const link = document.createElement('a');
      link.href = dataUrl;
      link.download = `${mode}-${Date.now()}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  const handleLoadProject = (project: ProjectFile) => {
    setAnimSettings({ ...DEFAULT_ANIMATION_SETTINGS, ...project.settings });
    setHarmonographKeyframes(project.harmonographKeyframes ?? []);
    setAttractorKeyframes(project.attractorKeyframes ?? []);
    if (project.mode === 'harmonograph' || project.mode === 'fractal') setMode(project.mode);
    setAnimTime(0);
  };

  // When the Animate tab is open and keyframes exist, the canvas previews the
  // interpolated animation at the scrubber time instead of the editor params.
  let previewParams: HarmonographParams | AttractorParams = mode === 'harmonograph' ? params : attractorParams;
  let previewProgress = 1;
  if (activeTab === 'animate') {
    if (mode === 'harmonograph') {
      const p = harmonographFrame(harmonographKeyframes, animTime, animSettings);
      if (p) {
        previewParams = p;
        if (animSettings.drawOn && animSettings.duration > 0) {
          previewProgress = Math.min(1, animTime / animSettings.duration);
        }
      }
    } else {
      const p = attractorFrame(attractorKeyframes, animTime, animSettings);
      if (p) previewParams = p;
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
        
        {/* Mode Switcher */}
        <div className="flex bg-slate-800/50 rounded-lg p-1 border border-slate-700">
           <button 
             onClick={() => setMode('harmonograph')}
             className={`px-3 py-1 text-xs font-medium rounded transition-all ${mode === 'harmonograph' ? 'bg-cyan-500/20 text-cyan-400 shadow-sm' : 'text-slate-500 hover:text-slate-300'}`}
           >
             Harmonograph
           </button>
           <button 
             onClick={() => setMode('fractal')}
             className={`px-3 py-1 text-xs font-medium rounded transition-all ${mode === 'fractal' ? 'bg-purple-500/20 text-purple-400 shadow-sm' : 'text-slate-500 hover:text-slate-300'}`}
           >
             Chaotic Attractor
           </button>
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
                    {mode === 'harmonograph' ? 'Describe a motion...' : 'Describe a chaos field...'}
                  </h3>
                  <textarea 
                    value={aiPrompt}
                    onChange={(e) => setAiPrompt(e.target.value)}
                    placeholder={mode === 'harmonograph' 
                      ? "E.g., A chaotic dying star with high rotation..." 
                      : "E.g., A delicate golden storm of particles..."}
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
                    Generate {mode === 'harmonograph' ? 'Physics' : 'Chaos'}
                  </button>
                </div>

                <div className="border-t border-slate-800 pt-4">
                  <h4 className="text-xs font-semibold text-slate-500 uppercase mb-3">Presets</h4>
                  <div className="grid grid-cols-2 gap-2">
                    {mode === 'harmonograph' ? (
                      Object.keys(PRESETS).map(key => (
                        <button key={key} onClick={() => setParams(PRESETS[key])} className="px-3 py-2 text-xs bg-slate-800 hover:bg-slate-700 rounded text-slate-300 capitalize text-left transition-colors">
                          {key}
                        </button>
                      ))
                    ) : (
                      Object.keys(ATTRACTOR_PRESETS).map(key => (
                        <button key={key} onClick={() => setAttractorParams(ATTRACTOR_PRESETS[key])} className="px-3 py-2 text-xs bg-slate-800 hover:bg-slate-700 rounded text-slate-300 capitalize text-left transition-colors">
                          {key}
                        </button>
                      ))
                    )}
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'animate' && (
              <AnimationPanel
                mode={mode}
                currentHarmonograph={params}
                currentAttractor={attractorParams}
                harmonographKeyframes={harmonographKeyframes}
                setHarmonographKeyframes={setHarmonographKeyframes}
                attractorKeyframes={attractorKeyframes}
                setAttractorKeyframes={setAttractorKeyframes}
                settings={animSettings}
                setSettings={setAnimSettings}
                time={animTime}
                setTime={setAnimTime}
                onLoadHarmonograph={setParams}
                onLoadAttractor={setAttractorParams}
                onLoadProject={handleLoadProject}
              />
            )}

            {activeTab === 'settings' && mode === 'harmonograph' && (
              <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
                   <div className="flex justify-between items-center">
                     <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Simulation Config</h3>
                     <button onClick={handleExport} className="flex items-center gap-1.5 px-3 py-1.5 bg-cyan-900/30 hover:bg-cyan-900/50 text-cyan-400 hover:text-cyan-300 rounded text-xs transition-colors border border-cyan-500/20" title="Export HD">
                        <DownloadIcon /> Export HD
                     </button>
                   </div>
                   {/* ... Existing Harmonograph Controls ... */}
                   <div className="grid grid-cols-2 gap-3">
                     <div>
                       <label className="text-[10px] text-slate-400">Duration (sec)</label>
                       <input type="number" value={params.duration} onChange={(e) => setParams({...params, duration: parseInt(e.target.value)})} className="w-full bg-slate-800 border border-slate-700 rounded px-2 py-1 text-sm mt-1" />
                     </div>
                     <div>
                       <label className="text-[10px] text-slate-400">Resolution (Hz)</label>
                       <input type="number" value={params.sampleRate} step={100} onChange={(e) => setParams({...params, sampleRate: parseInt(e.target.value)})} className="w-full bg-slate-800 border border-slate-700 rounded px-2 py-1 text-sm mt-1" />
                     </div>
                   </div>
                   <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-[10px] text-slate-400">Color</label>
                        <div className="flex items-center mt-1">
                          <input type="color" value={params.lineColor} onChange={(e) => setParams({...params, lineColor: e.target.value})} className="w-6 h-6 rounded overflow-hidden border-none cursor-pointer bg-transparent p-0" />
                          <span className="text-xs ml-2 text-slate-500 font-mono">{params.lineColor}</span>
                        </div>
                      </div>
                      <div>
                        <label className="text-[10px] text-slate-400">Line Width</label>
                        <input type="range" min="0.1" max="3" step="0.1" value={params.lineWidth} onChange={(e) => setParams({...params, lineWidth: parseFloat(e.target.value)})} className="w-full accent-cyan-500 h-1 bg-slate-700 rounded mt-3" />
                      </div>
                   </div>

                   <div className="bg-slate-900/50 p-3 rounded-lg border border-slate-800">
                    <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Turntable</h3>
                    <div className="space-y-3">
                      <div>
                        <div className="flex justify-between text-xs mb-1">
                          <span>Speed</span><span className="text-slate-400">{params.turntableOmega.toFixed(3)}</span>
                        </div>
                        <input type="range" min="-0.5" max="0.5" step="0.001" value={params.turntableOmega} onChange={(e) => setParams({...params, turntableOmega: parseFloat(e.target.value)})} className="w-full accent-cyan-500 h-1 bg-slate-700 rounded appearance-none" />
                      </div>
                      <div>
                        <div className="flex justify-between text-xs mb-1">
                          <span>Damping</span><span className="text-slate-400">{params.turntableDamping.toFixed(4)}</span>
                        </div>
                        <input type="range" min="0" max="0.1" step="0.0001" value={params.turntableDamping} onChange={(e) => setParams({...params, turntableDamping: parseFloat(e.target.value)})} className="w-full accent-cyan-500 h-1 bg-slate-700 rounded appearance-none" />
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <div className="flex justify-between items-center mb-2"><h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider">X-Axis</h3><button onClick={() => addOscillator('X')} className="text-cyan-400 hover:text-cyan-300 transition p-1 hover:bg-slate-800 rounded"><PlusIcon /></button></div>
                      {params.xOscillators.map(osc => (<OscillatorControl key={osc.id} axis="X" oscillator={osc} onChange={(u) => handleOscChange('X', u)} onRemove={() => removeOscillator('X', osc.id)} canRemove={params.xOscillators.length > 1} />))}
                    </div>
                    <div>
                      <div className="flex justify-between items-center mb-2"><h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Y-Axis</h3><button onClick={() => addOscillator('Y')} className="text-cyan-400 hover:text-cyan-300 transition p-1 hover:bg-slate-800 rounded"><PlusIcon /></button></div>
                      {params.yOscillators.map(osc => (<OscillatorControl key={osc.id} axis="Y" oscillator={osc} onChange={(u) => handleOscChange('Y', u)} onRemove={() => removeOscillator('Y', osc.id)} canRemove={params.yOscillators.length > 1} />))}
                    </div>
                  </div>
              </div>
            )}

            {activeTab === 'settings' && mode === 'fractal' && (
               <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
                  <div className="flex justify-between items-center">
                     <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Chaos Config</h3>
                     <button onClick={handleExport} className="flex items-center gap-1.5 px-3 py-1.5 bg-purple-900/30 hover:bg-purple-900/50 text-purple-400 hover:text-purple-300 rounded text-xs transition-colors border border-purple-500/20" title="Export HD">
                        <DownloadIcon /> Export HD
                     </button>
                   </div>
                   
                   {/* Recommended Settings */}
                   <div className="bg-slate-900/50 p-3 rounded-lg border border-slate-800">
                     <div className="flex justify-between items-center mb-3">
                       <label className="text-[10px] text-slate-400 block uppercase font-bold">Famous Attractors</label>
                       <button onClick={randomizeAttractor} className="text-xs text-purple-400 hover:text-white flex items-center gap-1 bg-purple-900/20 px-2 py-0.5 rounded hover:bg-purple-900/40 transition">
                         <DiceIcon /> Randomize
                       </button>
                     </div>
                     <div className="grid grid-cols-3 gap-2">
                       {Object.entries(ATTRACTOR_PRESETS).map(([key, preset]) => (
                         <button 
                           key={key} 
                           onClick={() => setAttractorParams(preset)}
                           className="text-[10px] bg-slate-800 hover:bg-slate-700 text-slate-300 py-1.5 rounded capitalize transition-colors"
                         >
                           {key}
                         </button>
                       ))}
                     </div>
                   </div>

                   {/* Chaos Model Select */}
                   <div>
                     <label className="text-[10px] text-slate-400">Model</label>
                     <div className="flex bg-slate-800 rounded p-1 mt-1">
                       <button onClick={() => setAttractorParams({...attractorParams, model: 'clifford'})} className={`flex-1 text-xs py-1 rounded ${attractorParams.model === 'clifford' ? 'bg-purple-600 text-white' : 'text-slate-400'}`}>Clifford</button>
                       <button onClick={() => setAttractorParams({...attractorParams, model: 'dejong'})} className={`flex-1 text-xs py-1 rounded ${attractorParams.model === 'dejong' ? 'bg-purple-600 text-white' : 'text-slate-400'}`}>De Jong</button>
                     </div>
                   </div>

                   {/* Parameters */}
                   <div className="space-y-4">
                     {['a', 'b', 'c', 'd'].map((p) => (
                       <div key={p}>
                         <div className="flex justify-between text-xs mb-1">
                           <span className="uppercase text-slate-500 font-bold">{p}</span>
                           <span className="text-slate-300 font-mono">{attractorParams[p as keyof AttractorParams]}</span>
                         </div>
                         <input 
                           type="range" min="-3" max="3" step="0.01" 
                           value={attractorParams[p as keyof AttractorParams] as number}
                           onChange={(e) => setAttractorParams({...attractorParams, [p]: parseFloat(e.target.value)})}
                           className="w-full accent-purple-500 h-1 bg-slate-700 rounded appearance-none"
                         />
                       </div>
                     ))}
                   </div>

                   {/* Render Settings */}
                   <div className="grid grid-cols-2 gap-3 border-t border-slate-800 pt-4">
                      <div>
                        <label className="text-[10px] text-slate-400">Iterations</label>
                        <input type="number" step="1000" min="10000" max="500000" value={attractorParams.iterations} onChange={(e) => setAttractorParams({...attractorParams, iterations: parseInt(e.target.value)})} className="w-full bg-slate-800 border border-slate-700 rounded px-2 py-1 text-sm mt-1" />
                      </div>
                      <div>
                        <label className="text-[10px] text-slate-400">Zoom</label>
                        <input type="number" step="0.1" min="0.1" max="5" value={attractorParams.zoom} onChange={(e) => setAttractorParams({...attractorParams, zoom: parseFloat(e.target.value)})} className="w-full bg-slate-800 border border-slate-700 rounded px-2 py-1 text-sm mt-1" />
                      </div>
                   </div>

                   <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-[10px] text-slate-400">Color</label>
                        <div className="flex items-center mt-1">
                          <input type="color" value={attractorParams.color} onChange={(e) => setAttractorParams({...attractorParams, color: e.target.value})} className="w-6 h-6 rounded overflow-hidden border-none cursor-pointer bg-transparent p-0" />
                          <span className="text-xs ml-2 text-slate-500 font-mono">{attractorParams.color}</span>
                        </div>
                      </div>
                      <div>
                        <label className="text-[10px] text-slate-400">Opacity</label>
                        <input type="range" min="0.01" max="1" step="0.01" value={attractorParams.opacity} onChange={(e) => setAttractorParams({...attractorParams, opacity: parseFloat(e.target.value)})} className="w-full accent-purple-500 h-1 bg-slate-700 rounded mt-3" />
                      </div>
                   </div>
               </div>
            )}
            
            <div className="h-8"></div>
          </div>
        </aside>

        {/* Canvas Area */}
        <main className="flex-1 bg-black relative p-4 md:p-8 flex items-center justify-center overflow-hidden">
          <CanvasRenderer mode={mode} params={previewParams} progress={previewProgress} />
        </main>

      </div>
    </div>
  );
};

export default App;
