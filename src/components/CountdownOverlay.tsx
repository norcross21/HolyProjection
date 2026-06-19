'use client';

import { useEffect, useState } from 'react';
import { Presentation } from '@/utils/sync';

/**
 * Full-screen pre-service countdown shown on the projector. Driven by an absolute
 * target timestamp in settings (countdownTarget), so every connected screen ticks
 * down in lockstep with no per-device drift. Renders nothing once cleared.
 */
export default function CountdownOverlay({ settings }: { settings: Presentation['settings'] }) {
  const target = settings.countdownTarget ? new Date(settings.countdownTarget).getTime() : 0;
  const [now, setNow] = useState<number>(() => Date.now());

  useEffect(() => {
    if (!target) return;
    setNow(Date.now());
    const id = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(id);
  }, [target]);

  if (!target) return null;

  const remainingMs = target - now;
  const done = remainingMs <= 0;
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
    </div>
  );
}
