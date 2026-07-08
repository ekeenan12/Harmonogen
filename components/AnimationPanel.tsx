import React, { useEffect, useRef, useState } from 'react';
import { generateId } from '../constants';
import {
  AnimationKeyframe,
  AnimationSettings,
  AppMode,
  AttractorParams,
  HarmonographParams,
  ProjectFile,
} from '../types';
import { attractorFrame, harmonographFrame } from '../utils/animation';
import { renderAttractor, renderHarmonograph } from '../utils/renderCanvas';
import { downloadBlob, exportMp4, isVideoExportSupported } from '../utils/exportVideo';

const RESOLUTIONS: { label: string; width: number; height: number }[] = [
  { label: '1080p (1920×1080)', width: 1920, height: 1080 },
  { label: 'Square (1080×1080)', width: 1080, height: 1080 },
  { label: 'Vertical (1080×1920)', width: 1080, height: 1920 },
  { label: '4K (3840×2160)', width: 3840, height: 2160 },
];

interface AnimationPanelProps {
  mode: AppMode;
  currentHarmonograph: HarmonographParams;
  currentAttractor: AttractorParams;
  harmonographKeyframes: AnimationKeyframe<HarmonographParams>[];
  setHarmonographKeyframes: React.Dispatch<React.SetStateAction<AnimationKeyframe<HarmonographParams>[]>>;
  attractorKeyframes: AnimationKeyframe<AttractorParams>[];
  setAttractorKeyframes: React.Dispatch<React.SetStateAction<AnimationKeyframe<AttractorParams>[]>>;
  settings: AnimationSettings;
  setSettings: React.Dispatch<React.SetStateAction<AnimationSettings>>;
  time: number;
  setTime: (t: number) => void;
  onLoadHarmonograph: (params: HarmonographParams) => void;
  onLoadAttractor: (params: AttractorParams) => void;
  onLoadProject: (project: ProjectFile) => void;
}

const AnimationPanel: React.FC<AnimationPanelProps> = ({
  mode,
  currentHarmonograph,
  currentAttractor,
  harmonographKeyframes,
  setHarmonographKeyframes,
  attractorKeyframes,
  setAttractorKeyframes,
  settings,
  setSettings,
  time,
  setTime,
  onLoadHarmonograph,
  onLoadAttractor,
  onLoadProject,
}) => {
  const [playing, setPlaying] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [exportProgress, setExportProgress] = useState(0);
  const timeRef = useRef(time);
  timeRef.current = time;

  const isHarmonograph = mode === 'harmonograph';
  const keyframeCount = isHarmonograph ? harmonographKeyframes.length : attractorKeyframes.length;

  // Playback loop for the preview scrubber.
  useEffect(() => {
    if (!playing) return;
    let raf = 0;
    let last = performance.now();
    const tick = (now: number) => {
      const dt = (now - last) / 1000;
      last = now;
      const next = timeRef.current + dt;
      setTime(next >= settings.duration ? 0 : next);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [playing, settings.duration, setTime]);

  const addKeyframe = () => {
    const t = Math.min(time, settings.duration);
    if (isHarmonograph) {
      setHarmonographKeyframes((prev) => [
        ...prev,
        { id: generateId(), time: t, params: structuredClone(currentHarmonograph) },
      ]);
    } else {
      setAttractorKeyframes((prev) => [
        ...prev,
        { id: generateId(), time: t, params: structuredClone(currentAttractor) },
      ]);
    }
  };

  const updateKeyframeTime = (id: string, t: number) => {
    if (Number.isNaN(t)) return;
    if (isHarmonograph) {
      setHarmonographKeyframes((prev) => prev.map((k) => (k.id === id ? { ...k, time: t } : k)));
    } else {
      setAttractorKeyframes((prev) => prev.map((k) => (k.id === id ? { ...k, time: t } : k)));
    }
  };

  const overwriteKeyframe = (id: string) => {
    if (isHarmonograph) {
      setHarmonographKeyframes((prev) =>
        prev.map((k) => (k.id === id ? { ...k, params: structuredClone(currentHarmonograph) } : k)),
      );
    } else {
      setAttractorKeyframes((prev) =>
        prev.map((k) => (k.id === id ? { ...k, params: structuredClone(currentAttractor) } : k)),
      );
    }
  };

  const loadKeyframe = (id: string) => {
    if (isHarmonograph) {
      const kf = harmonographKeyframes.find((k) => k.id === id);
      if (kf) onLoadHarmonograph(structuredClone(kf.params));
    } else {
      const kf = attractorKeyframes.find((k) => k.id === id);
      if (kf) onLoadAttractor(structuredClone(kf.params));
    }
  };

  const removeKeyframe = (id: string) => {
    if (isHarmonograph) {
      setHarmonographKeyframes((prev) => prev.filter((k) => k.id !== id));
    } else {
      setAttractorKeyframes((prev) => prev.filter((k) => k.id !== id));
    }
  };

  const handleExport = async () => {
    if (keyframeCount === 0) {
      alert('Add at least one keyframe before exporting.');
      return;
    }
    if (!isVideoExportSupported()) {
      alert('This browser does not support WebCodecs video encoding. Use Chrome or Edge.');
      return;
    }
    setPlaying(false);
    setExporting(true);
    setExportProgress(0);
    try {
      const { width, height, fps, duration, drawOn } = settings;
      const totalFrames = Math.max(1, Math.round(duration * fps));
      const { blob, codec } = await exportMp4({
        width,
        height,
        fps,
        duration,
        renderFrame: (ctx, w, h, t) => {
          if (isHarmonograph) {
            const p = harmonographFrame(harmonographKeyframes, t, settings)!;
            const progress = drawOn ? Math.min(1, (t * fps + 1) / totalFrames) : 1;
            renderHarmonograph(ctx, w, h, p, progress);
          } else {
            const p = attractorFrame(attractorKeyframes, t, settings)!;
            renderAttractor(ctx, w, h, p);
          }
        },
        onProgress: setExportProgress,
      });
      downloadBlob(blob, `${mode}-animation-${codec}-${Date.now()}.mp4`);
      if (codec !== 'h264') {
        alert(
          'Heads up: this browser has no H.264 encoder, so the clip was encoded as VP9 in mp4. ' +
            'DaVinci Resolve may not import VP9 — export from desktop Chrome/Edge for H.264.',
        );
      }
    } catch (e) {
      alert(`Export failed: ${e instanceof Error ? e.message : String(e)}`);
    } finally {
      setExporting(false);
    }
  };

  const saveProject = () => {
    const project: ProjectFile = {
      app: 'harmonogen',
      version: 1,
      mode,
      settings,
      harmonographKeyframes,
      attractorKeyframes,
    };
    downloadBlob(
      new Blob([JSON.stringify(project, null, 2)], { type: 'application/json' }),
      `harmonogen-project-${Date.now()}.json`,
    );
  };

  const loadProjectFile = (file: File) => {
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed = JSON.parse(String(reader.result)) as ProjectFile;
        if (parsed?.app !== 'harmonogen' || !parsed.settings || !Array.isArray(parsed.harmonographKeyframes)) {
          throw new Error('Not a HarmonoGen project file.');
        }
        setPlaying(false);
        onLoadProject(parsed);
      } catch (e) {
        alert(`Could not load project: ${e instanceof Error ? e.message : String(e)}`);
      }
    };
    reader.readAsText(file);
  };

  const keyframeRows = (isHarmonograph ? harmonographKeyframes : attractorKeyframes)
    .slice()
    .sort((a, b) => a.time - b.time);

  return (
    <div className="space-y-4 animate-in fade-in slide-in-from-left-4 duration-300">
      {/* Clip settings */}
      <div className="bg-slate-900/50 p-3 rounded-lg border border-slate-800 space-y-3">
        <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Clip Settings</h3>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-[10px] text-slate-400">Duration (sec)</label>
            <input
              type="number"
              min={1}
              value={settings.duration}
              onChange={(e) => {
                const duration = Math.max(1, parseFloat(e.target.value) || 1);
                setSettings((prev) => ({ ...prev, duration }));
                if (time > duration) setTime(duration);
              }}
              className="w-full bg-slate-800 border border-slate-700 rounded px-2 py-1 text-sm mt-1"
            />
          </div>
          <div>
            <label className="text-[10px] text-slate-400">FPS</label>
            <select
              value={settings.fps}
              onChange={(e) => setSettings((prev) => ({ ...prev, fps: parseInt(e.target.value) }))}
              className="w-full bg-slate-800 border border-slate-700 rounded px-2 py-1 text-sm mt-1"
            >
              <option value={24}>24</option>
              <option value={30}>30</option>
              <option value={60}>60</option>
            </select>
          </div>
        </div>
        <div>
          <label className="text-[10px] text-slate-400">Resolution</label>
          <select
            value={`${settings.width}x${settings.height}`}
            onChange={(e) => {
              const res = RESOLUTIONS.find((r) => `${r.width}x${r.height}` === e.target.value);
              if (res) setSettings((prev) => ({ ...prev, width: res.width, height: res.height }));
            }}
            className="w-full bg-slate-800 border border-slate-700 rounded px-2 py-1 text-sm mt-1"
          >
            {RESOLUTIONS.map((r) => (
              <option key={r.label} value={`${r.width}x${r.height}`}>
                {r.label}
              </option>
            ))}
          </select>
        </div>
        <div className="flex items-center justify-between">
          <label className="text-[10px] text-slate-400">Easing</label>
          <div className="flex bg-slate-800 rounded p-0.5">
            {(['smooth', 'linear'] as const).map((mode_) => (
              <button
                key={mode_}
                onClick={() => setSettings((prev) => ({ ...prev, easing: mode_ }))}
                className={`px-3 py-0.5 text-xs rounded capitalize ${settings.easing === mode_ ? 'bg-emerald-600 text-white' : 'text-slate-400'}`}
              >
                {mode_}
              </button>
            ))}
          </div>
        </div>
        {isHarmonograph && (
          <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer">
            <input
              type="checkbox"
              checked={settings.drawOn}
              onChange={(e) => setSettings((prev) => ({ ...prev, drawOn: e.target.checked }))}
              className="accent-emerald-500"
            />
            Draw-on (trace draws itself over the clip)
          </label>
        )}
        <div>
          <div className="flex justify-between text-xs mb-1">
            <span className="text-slate-400">Drift</span>
            <span className="text-slate-400 font-mono">{Math.round(settings.drift * 100)}%</span>
          </div>
          <input
            type="range"
            min={0}
            max={1}
            step={0.01}
            value={settings.drift}
            onChange={(e) => setSettings((prev) => ({ ...prev, drift: parseFloat(e.target.value) }))}
            className="w-full accent-emerald-500 h-1 bg-slate-700 rounded appearance-none"
          />
          <div className="flex items-center gap-2 mt-1.5">
            <span className="text-[10px] text-slate-500">Seed</span>
            <input
              type="number"
              value={settings.driftSeed}
              onChange={(e) =>
                setSettings((prev) => ({ ...prev, driftSeed: parseInt(e.target.value) || 0 }))
              }
              className="w-20 bg-slate-800 border border-slate-700 rounded px-1.5 py-0.5 text-xs"
            />
            <button
              onClick={() =>
                setSettings((prev) => ({ ...prev, driftSeed: Math.floor(Math.random() * 100000) }))
              }
              className="text-[10px] text-emerald-400 hover:text-white bg-emerald-900/20 hover:bg-emerald-900/40 px-2 py-0.5 rounded transition"
            >
              Reseed
            </button>
            <span className="text-[10px] text-slate-500 flex-1 text-right">
              slow seeded wander on top of keyframes
            </span>
          </div>
        </div>
      </div>

      {/* Keyframes */}
      <div className="bg-slate-900/50 p-3 rounded-lg border border-slate-800 space-y-2">
        <div className="flex justify-between items-center">
          <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Keyframes</h3>
          <button
            onClick={addKeyframe}
            className="text-xs text-emerald-400 hover:text-white bg-emerald-900/20 hover:bg-emerald-900/40 px-2 py-1 rounded transition"
          >
            + Capture at {time.toFixed(1)}s
          </button>
        </div>
        {keyframeRows.length === 0 ? (
          <p className="text-xs text-slate-500">
            Dial in a look on the Controls tab, scrub to a time, then capture it as a keyframe. The
            animation morphs between keyframes.
          </p>
        ) : (
          keyframeRows.map((kf) => (
            <div key={kf.id} className="flex items-center gap-2 bg-slate-800/50 rounded px-2 py-1.5">
              <input
                type="number"
                min={0}
                max={settings.duration}
                step={0.1}
                value={kf.time}
                onChange={(e) => updateKeyframeTime(kf.id, parseFloat(e.target.value))}
                className="w-16 bg-slate-900 border border-slate-700 rounded px-1.5 py-0.5 text-xs"
              />
              <span className="text-[10px] text-slate-500">sec</span>
              <div className="flex-1" />
              <button
                onClick={() => loadKeyframe(kf.id)}
                title="Load these params into the Controls editor"
                className="text-[10px] text-cyan-400 hover:text-cyan-300 px-1.5 py-0.5 bg-cyan-900/20 rounded"
              >
                Load
              </button>
              <button
                onClick={() => overwriteKeyframe(kf.id)}
                title="Overwrite this keyframe with the current editor params"
                className="text-[10px] text-emerald-400 hover:text-emerald-300 px-1.5 py-0.5 bg-emerald-900/20 rounded"
              >
                Set
              </button>
              <button
                onClick={() => removeKeyframe(kf.id)}
                className="text-[10px] text-red-400 hover:text-red-300 px-1.5 py-0.5 bg-red-900/20 rounded"
              >
                ✕
              </button>
            </div>
          ))
        )}
      </div>

      {/* Transport */}
      <div className="bg-slate-900/50 p-3 rounded-lg border border-slate-800 space-y-2">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setPlaying((p) => !p)}
            disabled={keyframeCount === 0}
            className="w-16 py-1.5 text-xs font-semibold rounded bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 text-white transition"
          >
            {playing ? 'Pause' : 'Play'}
          </button>
          <span className="text-xs font-mono text-slate-400 w-20">
            {time.toFixed(2)}s
          </span>
        </div>
        <input
          type="range"
          min={0}
          max={settings.duration}
          step={0.01}
          value={time}
          onChange={(e) => {
            setPlaying(false);
            setTime(parseFloat(e.target.value));
          }}
          className="w-full accent-emerald-500 h-1 bg-slate-700 rounded appearance-none"
        />
      </div>

      {/* Export */}
      <div className="bg-emerald-900/10 border border-emerald-500/30 p-4 rounded-xl space-y-3">
        <button
          onClick={handleExport}
          disabled={exporting || keyframeCount === 0}
          className="w-full bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed text-white py-2 rounded-lg text-sm font-semibold transition-all shadow-lg shadow-emerald-900/20"
        >
          {exporting
            ? `Encoding… ${Math.round(exportProgress * 100)}%`
            : `Export ${settings.duration}s @ ${settings.fps}fps → .mp4`}
        </button>
        {exporting && (
          <div className="w-full bg-slate-800 rounded-full h-1.5 overflow-hidden">
            <div
              className="bg-emerald-500 h-full transition-all"
              style={{ width: `${exportProgress * 100}%` }}
            />
          </div>
        )}
        <p className="text-[10px] text-slate-500">
          Renders frame-by-frame with the same deterministic engine as the preview, so identical
          keyframes always produce an identical clip. Encoding uses the browser's hardware H.264
          encoder (Chrome/Edge).
        </p>
      </div>

      {/* Project save/load */}
      <div className="bg-slate-900/50 p-3 rounded-lg border border-slate-800 space-y-2">
        <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Project</h3>
        <div className="flex gap-2">
          <button
            onClick={saveProject}
            className="flex-1 py-1.5 text-xs rounded bg-slate-800 hover:bg-slate-700 text-slate-300 transition"
          >
            Save .json
          </button>
          <label className="flex-1 py-1.5 text-xs rounded bg-slate-800 hover:bg-slate-700 text-slate-300 transition text-center cursor-pointer">
            Load .json
            <input
              type="file"
              accept=".json,application/json"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) loadProjectFile(file);
                e.target.value = '';
              }}
            />
          </label>
        </div>
        <p className="text-[10px] text-slate-500">
          Keyframes, clip settings, and drift seed — everything needed to regenerate the exact same
          clip later.
        </p>
      </div>
    </div>
  );
};

export default AnimationPanel;
