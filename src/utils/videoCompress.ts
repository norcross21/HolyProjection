// Browser-side video compression via ffmpeg.wasm. Loaded lazily (only when a
// video is uploaded) from a CDN. Uses the single-threaded core so it needs no
// special COOP/COEP headers. Callers MUST handle failures (fall back to the
// original file) since wasm can OOM on very large inputs.

import { FFmpeg } from '@ffmpeg/ffmpeg';
import { fetchFile, toBlobURL } from '@ffmpeg/util';

let ffmpeg: FFmpeg | null = null;
let loadPromise: Promise<void> | null = null;

const CORE_BASE = 'https://unpkg.com/@ffmpeg/core@0.12.10/dist/umd';

async function getFFmpeg(): Promise<FFmpeg> {
  if (!ffmpeg) ffmpeg = new FFmpeg();
  if (!loadPromise) {
    loadPromise = (async () => {
      await ffmpeg!.load({
        coreURL: await toBlobURL(`${CORE_BASE}/ffmpeg-core.js`, 'text/javascript'),
        wasmURL: await toBlobURL(`${CORE_BASE}/ffmpeg-core.wasm`, 'application/wasm'),
      });
    })();
  }
  await loadPromise;
  return ffmpeg;
}

/**
 * Compress/transcode a video to a projection-friendly MP4 (max 1080p, H.264).
 * Reports 0..1 progress. Throws on failure — caller should fall back to original.
 */
export async function compressVideo(file: File, onProgress?: (ratio: number) => void): Promise<File> {
  const ff = await getFFmpeg();
  const ext = file.name.match(/\.[a-z0-9]+$/i)?.[0] || '.mp4';
  const inName = `input${ext}`;
  const outName = 'output.mp4';

  const handler = (p: { progress: number }) => {
    if (onProgress) onProgress(Math.max(0, Math.min(1, p.progress)));
  };
  ff.on('progress', handler);

  try {
    await ff.writeFile(inName, await fetchFile(file));
    await ff.exec([
      '-i', inName,
      '-vf', "scale='min(1920,iw)':-2",
      '-c:v', 'libx264',
      '-preset', 'veryfast',
      '-crf', '30',
      '-c:a', 'aac',
      '-b:a', '128k',
      '-movflags', '+faststart',
      outName,
    ]);
    const data = await ff.readFile(outName);
    const blob = new Blob([data as any], { type: 'video/mp4' });
    const baseName = file.name.replace(/\.[^.]+$/, '');
    return new File([blob], `${baseName}-compressed.mp4`, { type: 'video/mp4' });
  } finally {
    ff.off('progress', handler);
    try { await ff.deleteFile(inName); } catch {}
    try { await ff.deleteFile(outName); } catch {}
  }
}
