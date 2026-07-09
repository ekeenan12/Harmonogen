import React from 'react';
import { ControlSpec } from '../generators/types';

interface GeneratorControlsProps {
  specs: ControlSpec[];
  params: Record<string, any>;
  onChange: (params: Record<string, any>) => void;
}

// Renders a generator's declarative control schema (generators/*.ts).
const GeneratorControls: React.FC<GeneratorControlsProps> = ({ specs, params, onChange }) => {
  const set = (key: string, value: unknown) => onChange({ ...params, [key]: value });

  return (
    <div className="space-y-3">
      {specs.map((spec) => {
        switch (spec.kind) {
          case 'slider': {
            const value = params[spec.key] as number;
            return (
              <div key={spec.key}>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-slate-400">{spec.label}</span>
                  <span className="text-slate-300 font-mono">{value.toFixed(spec.decimals ?? 2)}</span>
                </div>
                <input
                  type="range"
                  min={spec.min}
                  max={spec.max}
                  step={spec.step}
                  value={value}
                  onChange={(e) => set(spec.key, parseFloat(e.target.value))}
                  className="w-full accent-cyan-500 h-1 bg-slate-700 rounded appearance-none"
                />
              </div>
            );
          }
          case 'int':
            return (
              <div key={spec.key}>
                <label className="text-[10px] text-slate-400">{spec.label}</label>
                <input
                  type="number"
                  min={spec.min}
                  max={spec.max}
                  step={spec.step ?? 1}
                  value={params[spec.key] as number}
                  onChange={(e) => {
                    const v = parseInt(e.target.value);
                    if (!Number.isNaN(v)) set(spec.key, v);
                  }}
                  className="w-full bg-slate-800 border border-slate-700 rounded px-2 py-1 text-sm mt-1"
                />
              </div>
            );
          case 'number':
            return (
              <div key={spec.key}>
                <label className="text-[10px] text-slate-400">{spec.label}</label>
                <input
                  type="number"
                  step={spec.step ?? 0.1}
                  min={spec.min}
                  value={params[spec.key] as number}
                  onChange={(e) => {
                    const v = parseFloat(e.target.value);
                    if (!Number.isNaN(v)) set(spec.key, v);
                  }}
                  className="w-full bg-slate-800 border border-slate-700 rounded px-2 py-1 text-sm mt-1"
                />
              </div>
            );
          case 'color':
            return (
              <div key={spec.key}>
                <label className="text-[10px] text-slate-400">{spec.label}</label>
                <div className="flex items-center mt-1">
                  <input
                    type="color"
                    value={params[spec.key] as string}
                    onChange={(e) => set(spec.key, e.target.value)}
                    className="w-6 h-6 rounded overflow-hidden border-none cursor-pointer bg-transparent p-0"
                  />
                  <span className="text-xs ml-2 text-slate-500 font-mono">{params[spec.key] as string}</span>
                </div>
              </div>
            );
          case 'select':
            return (
              <div key={spec.key}>
                <label className="text-[10px] text-slate-400">{spec.label}</label>
                <div className="flex bg-slate-800 rounded p-1 mt-1">
                  {spec.options.map((opt) => (
                    <button
                      key={opt.value}
                      onClick={() => set(spec.key, opt.value)}
                      className={`flex-1 text-xs py-1 rounded ${params[spec.key] === opt.value ? 'bg-cyan-600 text-white' : 'text-slate-400'}`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>
            );
          default:
            return null;
        }
      })}
    </div>
  );
};

export default GeneratorControls;
