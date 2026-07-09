// Shared canvas helpers used by all generators (generators/*.ts).

export const drawBackground = (
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
) => {
  ctx.clearRect(0, 0, width, height);
  const gradient = ctx.createRadialGradient(
    width / 2, height / 2, 0,
    width / 2, height / 2, width / 1.5
  );
  gradient.addColorStop(0, '#0f172a'); // slate-900
  gradient.addColorStop(1, '#020617'); // slate-950
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, width, height);
};

// Stroke a polyline given as a flat [x0, y0, x1, y1, ...] array.
export const strokePolyline = (ctx: CanvasRenderingContext2D, pts: number[]) => {
  if (pts.length < 4) return;
  ctx.beginPath();
  ctx.moveTo(pts[0], pts[1]);
  for (let i = 2; i < pts.length; i += 2) {
    ctx.lineTo(pts[i], pts[i + 1]);
  }
  ctx.stroke();
};
