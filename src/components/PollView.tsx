'use client';

import { useState } from 'react';
import { Poll } from '@/utils/sync';

/** Read-only on the projector; pass onVote to make it interactive (followers). */
export default function PollView({ poll, counts, onVote, compact }: { poll: Poll; counts: number[]; onVote?: (i: number) => void; compact?: boolean }) {
  const [voted, setVoted] = useState<number | null>(null);
  const total = counts.reduce((a, b) => a + b, 0);
  const showResults = !onVote || voted !== null;

  return (
    <div className="w-full">
      <h3 className={`font-extrabold text-white text-center ${compact ? 'text-base mb-2' : 'text-2xl md:text-4xl mb-5'}`}>{poll.question}</h3>
      <div className={`space-y-2.5 ${compact ? '' : 'max-w-2xl mx-auto'}`}>
        {poll.options.map((opt, i) => {
          const c = counts[i] || 0;
          const pct = total ? Math.round((c / total) * 100) : 0;
          if (onVote && voted === null) {
            return (
              <button
                key={i}
                onClick={() => { onVote(i); setVoted(i); }}
                className="w-full rounded-2xl border border-slate-700 bg-slate-900/60 hover:border-violet-500 hover:bg-violet-950/30 px-4 py-3.5 text-left text-base font-bold text-slate-100 transition-all active:scale-[0.99]"
              >
                {opt}
              </button>
            );
          }
          return (
            <div key={i} className={`relative overflow-hidden rounded-2xl border px-4 ${compact ? 'py-2' : 'py-3.5'} ${voted === i ? 'border-violet-500' : 'border-slate-700'}`}>
              <div className="absolute inset-0 bg-violet-600/25 transition-all" style={{ width: `${pct}%` }} />
              <div className="relative flex justify-between font-bold text-slate-100">
                <span>{opt}{voted === i ? ' ✓' : ''}</span>
                <span>{pct}%</span>
              </div>
            </div>
          );
        })}
      </div>
      {showResults && <p className={`text-center text-slate-400 ${compact ? 'text-[10px] mt-2' : 'text-sm mt-4'}`}>{total} vote{total === 1 ? '' : 's'}</p>}
    </div>
  );
}
