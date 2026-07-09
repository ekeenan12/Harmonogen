import React, { useRef, useEffect, useState } from 'react';
import { GeneratorDef } from '../generators';

interface CanvasRendererProps {
  def: GeneratorDef;
  params: any;
  progress?: number; // draw-on fraction (0..1) for generators that support it
}

const CanvasRenderer: React.FC<CanvasRendererProps> = ({ def, params, progress = 1 }) => {
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

    requestAnimationFrame(() => {
      def.render(ctx, dimensions.width, dimensions.height, params, progress);
      setIsGenerating(false);
    });

  }, [def, params, dimensions, progress]);

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
      {def.stat && (
        <div className="absolute bottom-4 right-4 pointer-events-none text-[10px] text-slate-500 font-mono opacity-50">
          {def.stat(params)}
        </div>
      )}
    </div>
  );
};

export default CanvasRenderer;
