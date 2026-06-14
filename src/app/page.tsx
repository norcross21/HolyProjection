'use client';

import { useRouter } from 'next/navigation';
import { Sparkles, Tv, ArrowRight, PlayCircle, ShieldCheck, Zap, Layers, RefreshCw } from 'lucide-react';

export default function Home() {
  const router = useRouter();

  return (
    <div className="relative flex min-h-screen flex-col bg-slate-950 text-slate-100 font-sans overflow-hidden">
      {/* Dynamic Background Gradients */}
      <div className="absolute top-[-20%] left-[-10%] h-[70vw] w-[70vw] rounded-full bg-violet-900/10 blur-[130px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] h-[70vw] w-[70vw] rounded-full bg-indigo-900/10 blur-[130px] pointer-events-none" />

      {/* Main hero area */}
      <div className="flex-1 flex flex-col items-center justify-center text-center px-6 py-20 max-w-4xl mx-auto z-10">
        
        {/* Badge */}
        <div className="inline-flex items-center gap-2 rounded-full bg-violet-500/10 border border-violet-500/25 px-4 py-1.5 text-xs font-semibold text-violet-300 mb-8 animate-fade-in">
          <Sparkles className="h-3.5 w-3.5" />
          <span>Church Presentation Reimagined</span>
        </div>

        {/* Title */}
        <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight mb-6 animate-slide-up">
          <span className="block bg-gradient-to-r from-white via-slate-100 to-slate-400 bg-clip-text text-transparent">
            Next Generation
          </span>
          <span className="block bg-gradient-to-r from-violet-400 to-indigo-400 bg-clip-text text-transparent mt-2">
            Worship Projection
          </span>
        </h1>

        {/* Description */}
        <p className="text-slate-400 text-lg md:text-xl max-w-2xl mb-12 leading-relaxed animate-slide-up">
          A modern, dual-view church presentation engine built for instant, real-time collaboration. Drive live projector screens and resolve typos on-the-fly from a single collaborative interface.
        </p>

        {/* Action buttons */}
        <div className="flex flex-col sm:flex-row gap-4 w-full justify-center items-center mb-20 animate-slide-up">
          <button
            onClick={() => router.push('/dashboard')}
            className="flex items-center justify-center gap-2 w-full sm:w-auto px-8 py-4 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 rounded-2xl font-bold text-white shadow-xl shadow-indigo-500/20 active:scale-[0.98] transition-all"
          >
            <span>Open Presenter Dashboard</span>
            <ArrowRight className="h-5 w-5" />
          </button>
          
          <button
            onClick={() => window.open('/projector', '_blank')}
            className="flex items-center justify-center gap-2 w-full sm:w-auto px-8 py-4 bg-slate-900 border border-slate-800 hover:bg-slate-800 rounded-2xl font-bold text-indigo-300 active:scale-[0.98] transition-all"
          >
            <Tv className="h-5 w-5" />
            <span>Open Projector Screen</span>
          </button>
        </div>

        {/* Features Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full text-left">
          
          {/* Card 1 */}
          <div className="rounded-2xl border border-slate-900 bg-slate-900/10 p-6 backdrop-blur-sm">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-600/10 border border-violet-500/20 text-violet-400 mb-4">
              <RefreshCw className="h-5 w-5 animate-spin-slow" />
            </div>
            <h3 className="font-bold text-lg text-slate-100 mb-2">Live Sync & Typos Fix</h3>
            <p className="text-sm text-slate-400 leading-relaxed">
              Advance slides or correct spelling mistakes in lyrics instantly. Projector views update in real time without refreshing.
            </p>
          </div>

          {/* Card 2 */}
          <div className="rounded-2xl border border-slate-900 bg-slate-900/10 p-6 backdrop-blur-sm">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-600/10 border border-indigo-500/20 text-indigo-400 mb-4">
              <Layers className="h-5 w-5" />
            </div>
            <h3 className="font-bold text-lg text-slate-100 mb-2">Auto-Sizing Text</h3>
            <p className="text-sm text-slate-400 leading-relaxed">
              Smart font engine scales your lyrics dynamically to perfectly fill the canvas on any screen aspect ratio, preventing overflow.
            </p>
          </div>

          {/* Card 3 */}
          <div className="rounded-2xl border border-slate-900 bg-slate-900/10 p-6 backdrop-blur-sm">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-600/10 border border-emerald-500/20 text-emerald-400 mb-4">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <h3 className="font-bold text-lg text-slate-100 mb-2">Multi-Presenter Sync</h3>
            <p className="text-sm text-slate-400 leading-relaxed">
              Powered by Supabase Auth and Realtime Presence. Multiple collaborators can edit and manage the projection queue concurrently.
            </p>
          </div>

        </div>

      </div>

      {/* Footer */}
      <footer className="border-t border-slate-900 py-6 text-center text-xs text-slate-600">
        © 2026 HolyProjection. Ready for Vercel deployment.
      </footer>
    </div>
  );
}
