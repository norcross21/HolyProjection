'use client';

import { useEffect, useRef, useState } from 'react';
import { Presentation } from '@/utils/sync';

/**
 * Full-screen pre-service countdown shown on the projector. Driven by an absolute
 * target timestamp in settings (countdownTarget), so every connected screen ticks
 * down in lockstep with no per-device drift. Renders nothing once cleared.
 */
type CountdownSettings = Pick<Presentation['settings'], 'countdownTarget' | 'countdownMessage' | 'countdownEndMessage'> & { fontFamily?: string };

export default function CountdownOverlay({ settings }: { settings: CountdownSettings }) {
  const target = settings.countdownTarget ? new Date(settings.countdownTarget).getTime() : 0;
  const [now, setNow] = useState<number>(() => Date.now());
  const [flash, setFlash] = useState(false);
  const reachedZeroRef = useRef(false);

  useEffect(() => {
    if (!target) return;
    reachedZeroRef.current = Date.now() >= target; // don't flash for an already-finished target on mount
    const id = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(id);
  }, [target]);

  const remainingMs = target - now;
  const done = remainingMs <= 0;

  // Flash + chime exactly once, when the timer crosses zero while we're watching it.
  useEffect(() => {
    if (!target || !done || reachedZeroRef.current) return;
    reachedZeroRef.current = true;
    setFlash(true);
    const t = setTimeout(() => setFlash(false), 1100);
    try {
      const Ctx = (window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext);
      if (Ctx) {
        const ctx = new Ctx();
        [880, 1320].forEach((freq, i) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.frequency.value = freq;
          osc.connect(gain); gain.connect(ctx.destination);
          const t0 = ctx.currentTime + i * 0.18;
          gain.gain.setValueAtTime(0.0001, t0);
          gain.gain.exponentialRampToValueAtTime(0.25, t0 + 0.02);
          gain.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.35);
          osc.start(t0); osc.stop(t0 + 0.36);
        });
      }
    } catch { /* audio blocked without a gesture — the flash still fires */ }
    return () => clearTimeout(t);
  }, [done, target]);

  if (!target) return null;
  const totalSecs = Math.max(0, Math.ceil(remainingMs / 1000));
  const mm = Math.floor(totalSecs / 60);
  const ss = totalSecs % 60;
  const label = done
    ? (settings.countdownEndMessage || 'Welcome')
    : (settings.countdownMessage || 'Service begins in');

  return (
    <div className="absolute inset-0 z-[46] flex flex-col items-center justify-center bg-slate-950 text-center px-8 animate-fade-in">
      <p
        className="font-semibold text-slate-300/90 mb-[3vh]"
        style={{ fontSize: '4vh', fontFamily: settings.fontFamily || 'Inter' }}
      >
        {label}
      </p>
      {!done && (
        <div
          className="font-bold tabular-nums text-white tracking-tight leading-none drop-shadow-[0_0_40px_rgba(99,102,241,0.35)]"
          style={{ fontSize: '26vh', fontFamily: settings.fontFamily || 'Inter' }}
        >
          {mm}:{ss.toString().padStart(2, '0')}
        </div>
      )}
      {flash && <div className="absolute inset-0 bg-white pointer-events-none animate-flash" />}
    </div>
  );
}
