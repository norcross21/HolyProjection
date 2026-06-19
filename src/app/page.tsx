'use client';

import { useRouter } from 'next/navigation';
import { Sparkles, Tv, ArrowRight, ShieldCheck, Layers, RefreshCw } from 'lucide-react';
import Logo from '@/components/Logo';

export default function Home() {
  const router = useRouter();

  return (
    <div className="relative flex min-h-screen flex-col bg-slate-50 text-slate-900 font-sans overflow-hidden">
      {/* Soft ambient colour wash */}
      <div className="absolute top-[-25%] left-[-10%] h-[60vw] w-[60vw] rounded-full bg-indigo-200/40 blur-[130px] pointer-events-none" />
      <div className="absolute bottom-[-20%] right-[-10%] h-[60vw] w-[60vw] rounded-full bg-violet-200/40 blur-[130px] pointer-events-none" />

      {/* Top bar */}
      <header className="relative z-10 flex items-center justify-between px-6 md:px-10 py-5 max-w-6xl mx-auto w-full">
        <Logo size={34} />
        <button
          onClick={() => router.push('/dashboard')}
          className="rounded-full bg-white border border-slate-200 hover:border-indigo-300 hover:text-indigo-600 shadow-sm px-4 py-2 text-sm font-semibold text-slate-700 transition-all"
        >
          Sign in
        </button>
      </header>

      {/* Main hero area */}
      <div className="flex-1 flex flex-col items-center justify-center text-center px-6 py-16 max-w-4xl mx-auto z-10">

        {/* Badge */}
        <div className="inline-flex items-center gap-2 rounded-full bg-white border border-slate-200 shadow-sm px-4 py-1.5 text-xs font-semibold text-indigo-600 mb-8">
          <Sparkles className="h-3.5 w-3.5" />
          <span>Church presentation, reimagined</span>
        </div>

        {/* Title */}
        <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight mb-6 text-slate-900">
          <span className="block">Beautiful worship</span>
          <span className="block bg-gradient-to-r from-indigo-600 to-violet-600 bg-clip-text text-transparent mt-2">
            on every screen
          </span>
        </h1>

        {/* Description */}
        <p className="text-slate-500 text-lg md:text-xl max-w-2xl mb-12 leading-relaxed">
          A modern, dual-view church presentation engine built for instant, real-time collaboration. Drive live projector screens and fix typos on the fly — all from one clean, friendly interface.
        </p>

        {/* Action buttons */}
        <div className="flex flex-col sm:flex-row gap-4 w-full justify-center items-center mb-20">
          <button
            onClick={() => router.push('/dashboard')}
            className="flex items-center justify-center gap-2 w-full sm:w-auto px-8 py-4 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 rounded-2xl font-bold text-white shadow-lg shadow-indigo-500/25 active:scale-[0.98] transition-all"
          >
            <span>Open presenter dashboard</span>
            <ArrowRight className="h-5 w-5" />
          </button>

          <button
            onClick={() => window.open('/projector', '_blank')}
            className="flex items-center justify-center gap-2 w-full sm:w-auto px-8 py-4 bg-white border border-slate-200 hover:border-indigo-300 hover:text-indigo-600 rounded-2xl font-bold text-slate-700 shadow-sm active:scale-[0.98] transition-all"
          >
            <Tv className="h-5 w-5" />
            <span>Open projector screen</span>
          </button>
        </div>

        {/* Features Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full text-left">
          {[
            { icon: RefreshCw, chip: 'bg-indigo-50 text-indigo-600 ring-1 ring-indigo-100', title: 'Live sync & instant fixes', body: 'Advance slides or correct lyrics instantly. Every connected screen updates in real time — no refresh.' },
            { icon: Layers, chip: 'bg-violet-50 text-violet-600 ring-1 ring-violet-100', title: 'Auto-sizing text', body: 'A smart font engine scales lyrics to fill any screen perfectly, so setup is effortless and nothing overflows.' },
            { icon: ShieldCheck, chip: 'bg-emerald-50 text-emerald-600 ring-1 ring-emerald-100', title: 'Multi-presenter sync', body: 'Powered by realtime presence — your whole team can edit and drive the running order together.' },
          ].map(({ icon: Icon, chip, title, body }) => (
            <div key={title} className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all">
              <div className={`flex h-11 w-11 items-center justify-center rounded-xl mb-4 ${chip}`}>
                <Icon className="h-5 w-5" />
              </div>
              <h3 className="font-bold text-lg text-slate-900 mb-2">{title}</h3>
              <p className="text-sm text-slate-500 leading-relaxed">{body}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Footer */}
      <footer className="relative z-10 border-t border-slate-200 py-6 text-center text-xs text-slate-400">
        © 2026 HolyProjection · Crafted for worship teams.
      </footer>
    </div>
  );
}
