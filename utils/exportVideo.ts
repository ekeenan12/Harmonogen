import { ArrayBufferTarget, Muxer } from 'mp4-muxer';

export interface VideoExportOptions {
  width: number;
  height: number;
  fps: number;
  duration: number; // seconds
  // Draws the frame for time t (seconds) into ctx. Must be deterministic.
  renderFrame: (ctx: CanvasRenderingContext2D, width: number, height: number, t: number) => void;
  onProgress?: (fraction: number) => void;
}

export interface VideoExportResult {
  blob: Blob;
  codec: 'h264' | 'vp9';
}

export const isVideoExportSupported = () => typeof VideoEncoder !== 'undefined';

// H.264 is the target (best DaVinci Resolve compatibility) but some Chromium
// builds ship without it, so fall back to VP9 in the same mp4 container.
const CODEC_CANDIDATES = [
  { name: 'h264' as const, muxCodec: 'avc' as const, codec: 'avc1.640034' }, // High@5.2, covers 4K60
  { name: 'vp9' as const, muxCodec: 'vp9' as const, codec: 'vp09.00.50.08' },
];

const pickCodec = async (width: number, height: number, fps: number, bitrate: number) => {
  for (const candidate of CODEC_CANDIDATES) {
    const { supported } = await VideoEncoder.isConfigSupported({
      codec: candidate.codec,
      width,
      height,
      bitrate,
      framerate: fps,
    });
    if (supported) return candidate;
  }
  throw new Error('No supported video encoder (H.264/VP9) found in this browser.');
};

const waitForQueue = (encoder: VideoEncoder, max: number) =>
  new Promise<void>((resolve) => {
    if (encoder.encodeQueueSize <= max) {
      resolve();
      return;
    }
    const check = () => {
      if (encoder.encodeQueueSize <= max) {
        encoder.removeEventListener('dequeue', check);
        resolve();
      }
    };
    encoder.addEventListener('dequeue', check);
  });

export const exportMp4 = async ({
  width,
  height,
  fps,
  duration,
  renderFrame,
  onProgress,
}: VideoExportOptions): Promise<VideoExportResult> => {
  if (!isVideoExportSupported()) {
    throw new Error('This browser does not support WebCodecs video encoding. Use Chrome or Edge.');
  }

  // Encoders require even dimensions.
  const w = width - (width % 2);
  const h = height - (height % 2);
  const bitrate = Math.min(40_000_000, Math.round(w * h * fps * 0.15));

  const chosen = await pickCodec(w, h, fps, bitrate);

  const muxer = new Muxer({
    target: new ArrayBufferTarget(),
    video: { codec: chosen.muxCodec, width: w, height: h },
    fastStart: 'in-memory',
  });

  let encodeError: Error | null = null;
  const encoder = new VideoEncoder({
    output: (chunk, meta) => muxer.addVideoChunk(chunk, meta),
    error: (e) => {
      encodeError = e instanceof Error ? e : new Error(String(e));
    },
  });

  encoder.configure({
    codec: chosen.codec,
    width: w,
    height: h,
    bitrate,
    framerate: fps,
  });

  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) throw new Error('Could not create export canvas context.');

  const totalFrames = Math.max(1, Math.round(duration * fps));
  const microsPerFrame = 1_000_000 / fps;

  try {
    for (let i = 0; i < totalFrames; i += 1) {
      if (encodeError) throw encodeError;

      renderFrame(ctx, w, h, i / fps);

      const frame = new VideoFrame(canvas, {
        timestamp: Math.round(i * microsPerFrame),
        duration: Math.round(microsPerFrame),
      });
      encoder.encode(frame, { keyFrame: i % (fps * 2) === 0 });
      frame.close();

      await waitForQueue(encoder, 4);
      onProgress?.((i + 1) / totalFrames);

      // Yield so the progress UI can paint.
      if (i % 5 === 0) await new Promise((r) => setTimeout(r, 0));
    }

    await encoder.flush();
    if (encodeError) throw encodeError;
  } finally {
    if (encoder.state !== 'closed') encoder.close();
  }

  muxer.finalize();
  return { blob: new Blob([muxer.target.buffer], { type: 'video/mp4' }), codec: chosen.name };
};

export const downloadBlob = (blob: Blob, filename: string) => {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};
