import { HarmonographParams, AttractorParams } from '../types';

// progress (0..1) draws only the first fraction of the trace, used by the
// animation draw-on mode.
export const renderHarmonograph = (
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  params: HarmonographParams,
  progress: number = 1
) => {
  // Clear
  ctx.clearRect(0, 0, width, height);

  // Background Gradient
  const gradient = ctx.createRadialGradient(
    width / 2, height / 2, 0,
    width / 2, height / 2, width / 1.5
  );
  gradient.addColorStop(0, '#0f172a'); // slate-900
  gradient.addColorStop(1, '#020617'); // slate-950
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, width, height);

  const { 
    duration, 
    sampleRate, 
    xOscillators, 
    yOscillators, 
    turntableOmega, 
    turntableDamping,
    lineColor,
    lineWidth,
    opacity
  } = params;

  const n = Math.floor(duration * sampleRate * Math.max(0, Math.min(1, progress)));
  const timeStep = 1 / sampleRate;
  
  const centerX = width / 2;
  const centerY = height / 2;
  
  // Scale factor: 1.0 amplitude = 1/3.5 of shortest dimension
  const scale = Math.min(width, height) / 3.5;

  ctx.beginPath();
  ctx.strokeStyle = lineColor;
  ctx.lineWidth = lineWidth;
  ctx.globalAlpha = opacity;
  
  const tOmega = turntableOmega * 2 * Math.PI; // Convert Hz to rad/s
  
  // Optimized param arrays
  const xParams = xOscillators.map(o => ({ A: o.amplitude, w: o.frequency * 2 * Math.PI, p: o.phase, d: o.damping }));
  const yParams = yOscillators.map(o => ({ A: o.amplitude, w: o.frequency * 2 * Math.PI, p: o.phase, d: o.damping }));

  let firstPoint = true;

  for (let i = 0; i < n; i++) {
    const t = i * timeStep;
    
    // Calculate X
    let x = 0;
    for (const osc of xParams) {
      x += osc.A * Math.exp(-osc.d * t) * Math.sin(osc.w * t + osc.p);
    }

    // Calculate Y
    let y = 0;
    for (const osc of yParams) {
      y += osc.A * Math.exp(-osc.d * t) * Math.sin(osc.w * t + osc.p);
    }

    // Turntable Rotation
    if (tOmega !== 0) {
      let theta;
      if (turntableDamping > 0) {
         theta = tOmega * (1.0 - Math.exp(-turntableDamping * t));
      } else {
         theta = tOmega * t;
      }
      const c = Math.cos(theta);
      const s = Math.sin(theta);
      
      const xr = c * x - s * y;
      const yr = s * x + c * y;
      x = xr;
      y = yr;
    }

    const screenX = centerX + x * scale;
    const screenY = centerY - y * scale;

    if (firstPoint) {
      ctx.moveTo(screenX, screenY);
      firstPoint = false;
    } else {
      ctx.lineTo(screenX, screenY);
    }
  }

  ctx.stroke();
};

export const renderAttractor = (
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  params: AttractorParams
) => {
  // Clear
  ctx.clearRect(0, 0, width, height);

  // Background Gradient
  const gradient = ctx.createRadialGradient(
    width / 2, height / 2, 0,
    width / 2, height / 2, width / 1.5
  );
  gradient.addColorStop(0, '#0f172a'); // slate-900
  gradient.addColorStop(1, '#020617'); // slate-950
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, width, height);

  const { model, a, b, c, d, iterations, color, opacity, zoom } = params;

  ctx.fillStyle = color;
  ctx.globalAlpha = opacity;
  
  // Coordinates
  let x = 0.1;
  let y = 0.1;

  const centerX = width / 2;
  const centerY = height / 2;
  const scale = (Math.min(width, height) / 5) * zoom; // Approx fitting

  // Skip first few points to settle orbit
  for (let i = 0; i < 20; i++) {
    let nextX, nextY;
    if (model === 'clifford') {
      nextX = Math.sin(a * y) + c * Math.cos(a * x);
      nextY = Math.sin(b * x) + d * Math.cos(b * y);
    } else { // dejong
      nextX = Math.sin(a * y) - Math.cos(b * x);
      nextY = Math.sin(c * x) - Math.cos(d * y);
    }
    x = nextX;
    y = nextY;
  }

  // Draw points
  // For better performance with 100k+ points, we can use 1x1 rects
  // but to handle opacity nicely we just draw small rects.
  // Using path is too slow for 100k disconnected points.
  
  for (let i = 0; i < iterations; i++) {
    let nextX, nextY;
    if (model === 'clifford') {
      nextX = Math.sin(a * y) + c * Math.cos(a * x);
      nextY = Math.sin(b * x) + d * Math.cos(b * y);
    } else {
      nextX = Math.sin(a * y) - Math.cos(b * x);
      nextY = Math.sin(c * x) - Math.cos(d * y);
    }
    x = nextX;
    y = nextY;

    const screenX = centerX + x * scale;
    const screenY = centerY + y * scale;

    ctx.fillRect(screenX, screenY, 1, 1);
  }
};
