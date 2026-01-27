import React, { useRef, useEffect, useState } from 'react';
import { HarmonographParams, AttractorParams, AppMode } from '../types';
import { renderHarmonograph, renderAttractor } from '../utils/renderCanvas';

interface CanvasRendererProps {
  mode: AppMode;
  params: HarmonographParams | AttractorParams;
}

const CanvasRenderer: React.FC<CanvasRendererProps> = ({ mode, params }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState({ width: 800, height: 800 });
  const [isGenerating, setIsGenerating] = useState(false);

  // Handle Resize
  useEffect(() => {
    const handleResize = () => {
      if (containerRef.current) {
        const { clientWidth, clientHeight } = containerRef.current;
        setDimensions({ width: clientWidth, height: clientHeight });
      }
    };

    window.addEventListener('resize', handleResize);
    handleResize();

    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Drawing Logic
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set canvas internal resolution to match display size for sharpness
    canvas.width = dimensions.width;
    canvas.height = dimensions.height;

    setIsGenerating(true);

    // Use shared renderer
    requestAnimationFrame(() => {
      if (mode === 'harmonograph') {
        renderHarmonograph(ctx, dimensions.width, dimensions.height, params as HarmonographParams);
      } else {
        renderAttractor(ctx, dimensions.width, dimensions.height, params as AttractorParams);
      }
      setIsGenerating(false);
    });

  }, [params, dimensions, mode]);

  return (
    <div ref={containerRef} className="w-full h-full relative rounded-xl overflow-hidden shadow-2xl shadow-black/50 border border-slate-800">
      <canvas 
        ref={canvasRef} 
        className="block"
      />
      {isGenerating && (
        <div className="absolute top-4 right-4 text-xs font-mono text-cyan-400 animate-pulse">
          RENDERING...
        </div>
      )}
      <div className="absolute bottom-4 right-4 pointer-events-none text-[10px] text-slate-500 font-mono opacity-50">
        {mode === 'harmonograph' 
          ? `${((params as HarmonographParams).duration * (params as HarmonographParams).sampleRate).toLocaleString()} pts`
          : `${(params as AttractorParams).iterations.toLocaleString()} pts`
        }
      </div>
    </div>
  );
};

export default CanvasRenderer;
