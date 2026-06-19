'use client';

import { useRef, useState } from 'react';
import { Mic, Square, Download } from 'lucide-react';

/** One-click microphone recorder for capturing the service audio, with download. */
export default function RecorderButton() {
  const [recording, setRecording] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [url, setUrl] = useState<string | null>(null);
  const recRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fmt = (s: number) => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;

  const start = async () => {
    if (typeof MediaRecorder === 'undefined') { alert('Recording is not supported in this browser.'); return; }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      const rec = new MediaRecorder(stream);
      chunksRef.current = [];
      rec.ondataavailable = (e) => { if (e.data.size) chunksRef.current.push(e.data); };
      rec.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: rec.mimeType || 'audio/webm' });
        if (url) URL.revokeObjectURL(url);
        setUrl(URL.createObjectURL(blob));
        streamRef.current?.getTracks().forEach((t) => t.stop());
      };
      rec.start();
      recRef.current = rec;
      setUrl(null);
      setElapsed(0);
      setRecording(true);
      timerRef.current = setInterval(() => setElapsed((e) => e + 1), 1000);
    } catch {
      alert('Microphone access was blocked. Allow microphone access to record the service.');
    }
  };

  const stop = () => {
    recRef.current?.stop();
    setRecording(false);
    if (timerRef.current) clearInterval(timerRef.current);
  };

  return (
    <div className="flex items-center gap-2">
      {!recording ? (
        <button
          onClick={start}
          className="flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-stone-100 border border-stone-200 hover:border-red-500/50 py-2 text-xs font-bold text-stone-700 hover:text-red-700 transition-all"
        >
          <Mic className="h-3.5 w-3.5" /> Record service
        </button>
      ) : (
        <button
          onClick={stop}
          className="flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-red-600 hover:bg-red-500 py-2 text-xs font-bold text-white transition-all"
        >
          <Square className="h-3 w-3 fill-current" /> Stop · {fmt(elapsed)}
        </button>
      )}
      {url && !recording && (
        <a
          href={url}
          download={`service-recording.webm`}
          className="flex items-center justify-center gap-1.5 rounded-xl bg-emerald-600/20 border border-emerald-200 hover:bg-emerald-600/40 px-3 py-2 text-xs font-bold text-emerald-700 transition-all"
        >
          <Download className="h-3.5 w-3.5" /> Save
        </a>
      )}
    </div>
  );
}
