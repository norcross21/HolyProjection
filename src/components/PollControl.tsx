'use client';

import { useState } from 'react';
import { Poll } from '@/utils/sync';
import { BarChart3, Plus, X, Play, Square } from 'lucide-react';

interface PollControlProps {
  activePoll: Poll | null;
  pollCounts: number[];
  onStart: (poll: Poll) => void;
  onEnd: () => void;
}

/** Presenter control: compose & launch a live poll, watch live results, end it. */
export default function PollControl({ activePoll, pollCounts, onStart, onEnd }: PollControlProps) {
  const [question, setQuestion] = useState('');
  const [options, setOptions] = useState<string[]>(['', '']);
  const total = pollCounts.reduce((a, b) => a + b, 0);

  if (activePoll) {
    return (
      <div className="space-y-2.5">
        <p className="text-xs font-bold text-slate-200">{activePoll.question}</p>
        {activePoll.options.map((opt, i) => {
          const c = pollCounts[i] || 0;
          const pct = total ? Math.round((c / total) * 100) : 0;
          return (
            <div key={i}>
              <div className="flex justify-between text-[11px] text-slate-300 mb-0.5"><span>{opt}</span><span>{c} · {pct}%</span></div>
              <div className="h-2 rounded-full bg-slate-800 overflow-hidden"><div className="h-full bg-violet-500 transition-all" style={{ width: `${pct}%` }} /></div>
            </div>
          );
        })}
        <div className="flex items-center justify-between pt-1">
          <span className="text-[10px] text-slate-500">{total} vote{total === 1 ? '' : 's'}</span>
          <button onClick={onEnd} className="flex items-center gap-1.5 rounded-lg bg-red-600/20 border border-red-500/30 hover:bg-red-600/40 px-3 py-1.5 text-[11px] font-bold text-red-300"><Square className="h-3 w-3 fill-current" /> End poll</button>
        </div>
      </div>
    );
  }

  const canStart = question.trim() && options.filter((o) => o.trim()).length >= 2;

  return (
    <div className="space-y-2">
      <input
        value={question}
        onChange={(e) => setQuestion(e.target.value)}
        placeholder="Poll question…"
        className="w-full rounded-lg border border-slate-800 bg-slate-950/60 py-1.5 px-2.5 text-xs text-slate-200 placeholder:text-slate-700 focus:border-violet-500 focus:outline-none"
      />
      {options.map((opt, i) => (
        <div key={i} className="flex items-center gap-1.5">
          <input
            value={opt}
            onChange={(e) => setOptions((prev) => prev.map((o, j) => (j === i ? e.target.value : o)))}
            placeholder={`Option ${i + 1}`}
            className="flex-1 rounded-lg border border-slate-800 bg-slate-950/60 py-1.5 px-2.5 text-xs text-slate-200 placeholder:text-slate-700 focus:border-violet-500 focus:outline-none"
          />
          {options.length > 2 && (
            <button onClick={() => setOptions((prev) => prev.filter((_, j) => j !== i))} className="p-1 text-slate-500 hover:text-red-400"><X className="h-3.5 w-3.5" /></button>
          )}
        </div>
      ))}
      <div className="flex items-center gap-2">
        {options.length < 5 && (
          <button onClick={() => setOptions((prev) => [...prev, ''])} className="flex items-center gap-1 text-[11px] font-bold text-slate-400 hover:text-slate-200"><Plus className="h-3.5 w-3.5" /> Option</button>
        )}
        <button
          onClick={() => { onStart({ id: `poll-${Date.now()}`, question: question.trim(), options: options.map((o) => o.trim()).filter(Boolean) }); }}
          disabled={!canStart}
          className="ml-auto flex items-center gap-1.5 rounded-lg bg-violet-600 hover:bg-violet-500 px-3 py-1.5 text-[11px] font-bold text-white disabled:opacity-40"
        >
          <Play className="h-3 w-3 fill-current" /> Start poll
        </button>
      </div>
      <p className="flex items-center gap-1 text-[10px] text-slate-600"><BarChart3 className="h-3 w-3" /> Shows live on congregation phones &amp; the projector.</p>
    </div>
  );
}
