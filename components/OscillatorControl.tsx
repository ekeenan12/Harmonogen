import React from 'react';
import { Oscillator } from '../types';

interface OscillatorControlProps {
  axis: 'X' | 'Y';
  oscillator: Oscillator;
  onChange: (updated: Oscillator) => void;
  onRemove: () => void;
  canRemove: boolean;
}

const OscillatorControl: React.FC<OscillatorControlProps> = ({ 
  axis, 
  oscillator, 
  onChange, 
  onRemove,
  canRemove
}) => {
  const handleChange = (field: keyof Oscillator, value: number) => {
    onChange({ ...oscillator, [field]: value });
  };

  return (
    <div className="bg-slate-800/50 p-3 rounded-lg border border-slate-700 mb-2">
      <div className="flex justify-between items-center mb-2">
        <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
          {axis} Osc {oscillator.id.slice(0, 3)}
        </span>
        {canRemove && (
          <button 
            onClick={onRemove}
            className="text-red-400 hover:text-red-300 text-xs px-2 py-0.5 rounded bg-red-900/20 hover:bg-red-900/40 transition-colors"
          >
            Remove
          </button>
        )}
      </div>

      <div className="grid grid-cols-2 gap-x-4 gap-y-2">
        {/* Frequency */}
        <div className="flex flex-col">
          <label className="text-[10px] text-slate-500 mb-0.5">Freq (Hz)</label>
          <input
            type="number"
            step="0.01"
            value={oscillator.frequency}
            onChange={(e) => handleChange('frequency', parseFloat(e.target.value))}
            className="bg-slate-900 border border-slate-700 rounded px-2 py-1 text-xs text-slate-200 focus:border-cyan-500 outline-none"
          />
        </div>

        {/* Amplitude */}
        <div className="flex flex-col">
          <label className="text-[10px] text-slate-500 mb-0.5">Amp</label>
          <input
            type="range"
            min="0"
            max="2"
            step="0.1"
            value={oscillator.amplitude}
            onChange={(e) => handleChange('amplitude', parseFloat(e.target.value))}
            className="accent-cyan-500 h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer mt-2"
          />
          <span className="text-[10px] text-right text-slate-400">{oscillator.amplitude.toFixed(1)}</span>
        </div>

        {/* Phase */}
        <div className="flex flex-col">
          <label className="text-[10px] text-slate-500 mb-0.5">Phase (rad)</label>
          <input
            type="range"
            min="0"
            max={Math.PI * 2}
            step="0.1"
            value={oscillator.phase}
            onChange={(e) => handleChange('phase', parseFloat(e.target.value))}
            className="accent-purple-500 h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer mt-2"
          />
          <span className="text-[10px] text-right text-slate-400">{oscillator.phase.toFixed(2)}</span>
        </div>

        {/* Damping */}
        <div className="flex flex-col">
          <label className="text-[10px] text-slate-500 mb-0.5">Damping</label>
          <input
            type="number"
            step="0.001"
            min="0"
            value={oscillator.damping}
            onChange={(e) => handleChange('damping', parseFloat(e.target.value))}
            className="bg-slate-900 border border-slate-700 rounded px-2 py-1 text-xs text-slate-200 focus:border-cyan-500 outline-none"
          />
        </div>
      </div>
    </div>
  );
};

export default OscillatorControl;
