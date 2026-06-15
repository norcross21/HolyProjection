'use client';

import { useEffect, useState, useRef, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { useRealtimePresentation, useRealtimeSetlist } from '@/utils/sync';
import { dirFor } from '@/utils/languages';
import { Clock, Tv, AlertTriangle, CheckCircle } from 'lucide-react';

function StageDisplayContent() {
  const searchParams = useSearchParams();
  const presId = searchParams.get('pres');
  const setlistId = searchParams.get('setlist');

  // Load single presentation hook
  const {
    isDemoMode: isPresDemo,
    presentation: singlePres,
    activeSlideId: activePresSlideId,
    activeAlert: presActiveAlert,
  } = useRealtimePresentation(setlistId ? '' : (presId || ''));

  // Load setlist hook
  const {
    isDemoMode: isSetlistDemo,
    setlist,
    activeSlideId: activeSetlistSlideId,
    activeAlert: setlistActiveAlert,
  } = useRealtimeSetlist(setlistId || '');

  const isDemoMode = setlistId ? isSetlistDemo : isPresDemo;
  const activeAlert = setlistId ? setlistActiveAlert : presActiveAlert;

  const [time, setTime] = useState('');

  // Clock tick
  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setTime(now.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  // Resolve slides queue, current slide, and next slide
  let currentSlide: any = null;
  let nextSlide: any = null;
  let translationLang: string | undefined;

  if (setlistId) {
    if (setlist) {
      const allSlides = setlist.items.flatMap((item) => {
        const pres = item.presentation;
        return pres?.slides || [];
      });
      const activeIdx = allSlides.findIndex((s) => s.id === activeSetlistSlideId);
      currentSlide = allSlides[activeIdx >= 0 ? activeIdx : 0];
      if (activeIdx >= 0 && activeIdx < allSlides.length - 1) {
        nextSlide = allSlides[activeIdx + 1];
      }
      translationLang = setlist.items[0]?.presentation?.settings?.translationLang;
    }
  } else {
    const activeIdx = singlePres.slides.findIndex((s) => s.id === activePresSlideId);
    currentSlide = singlePres.slides[activeIdx >= 0 ? activeIdx : 0];
    if (activeIdx >= 0 && activeIdx < singlePres.slides.length - 1) {
      nextSlide = singlePres.slides[activeIdx + 1];
    }
    translationLang = singlePres.settings?.translationLang;
  }

  return (
    <main className="min-h-screen w-screen bg-black text-white font-sans flex flex-col justify-between p-8 select-none">
      
      {/* Top Header Row */}
      <header className="flex justify-between items-center border-b border-slate-900 pb-4">
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded bg-slate-900 border border-slate-800 text-yellow-500">
            <Tv className="h-4 w-4" />
          </div>
          <div>
            <h1 className="font-bold text-xs uppercase tracking-wider text-slate-400">Stage Confidence Monitor</h1>
            <span className="text-[10px] text-slate-500 font-medium">
              {setlistId ? `Setlist: ${setlist?.title || 'Loading...'}` : `Song: ${singlePres.title}`}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-6">
          {/* Real-time Clock */}
          <div className="flex items-center gap-2 bg-slate-950 border border-slate-900 rounded-xl px-4 py-2 text-yellow-400 font-mono font-bold text-lg shadow-inner">
            <Clock className="h-4 w-4 text-yellow-500 animate-pulse" />
            <span>{time || '00:00:00'}</span>
          </div>

          <div className="hidden sm:flex items-center gap-1.5 rounded-full bg-slate-900 border border-slate-800 px-3 py-1 text-[10px] text-slate-400 font-semibold">
            {isDemoMode ? (
              <>
                <AlertTriangle className="h-3 w-3 text-amber-500" />
                <span>Demo Mode</span>
              </>
            ) : (
              <>
                <CheckCircle className="h-3 w-3 text-emerald-500" />
                <span>Cloud Synced</span>
              </>
            )}
          </div>
        </div>
      </header>

      {/* Active Live Alert Overlay for Stage */}
      {activeAlert && (
        <div className={`mt-4 px-6 py-4 rounded-xl border flex items-center gap-3.5 ${
          activeAlert.type === 'nursery'
            ? 'bg-amber-950/60 border-amber-500/65 text-amber-300 shadow-[0_0_15px_rgba(245,158,11,0.1)]'
            : activeAlert.type === 'warning'
              ? 'bg-red-950/60 border-red-500/65 text-red-300 shadow-[0_0_15px_rgba(239,68,68,0.1)]'
              : 'bg-slate-900 border-slate-800 text-slate-300'
        }`}>
          <AlertTriangle className={`h-6 w-6 shrink-0 ${
            activeAlert.type === 'nursery' ? 'text-amber-400 animate-pulse' : activeAlert.type === 'warning' ? 'text-red-400 animate-bounce' : 'text-slate-450'
          }`} />
          <div>
            <span className="text-[9px] uppercase font-black tracking-widest block opacity-75">
              Live Overlay Alert ({activeAlert.type})
            </span>
            <p className="font-extrabold text-sm leading-tight mt-0.5">{activeAlert.message}</p>
          </div>
        </div>
      )}

      {/* Main Content Areas */}
      <div className="flex-1 flex flex-col justify-evenly py-6">
        
        {/* 1. CURRENT SLIDE */}
        <section className="space-y-2.5">
          <span className="text-yellow-500/70 text-[10px] uppercase font-bold tracking-widest block">Current Slide</span>
          {currentSlide ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
              <div className="text-yellow-400 font-extrabold text-3xl md:text-5xl lg:text-6xl whitespace-pre-line leading-tight">
                {currentSlide.content}
              </div>
              {currentSlide.translation && (
                <div dir={dirFor(translationLang)} className="text-indigo-300 font-bold text-3xl md:text-5xl lg:text-6xl whitespace-pre-line leading-tight border-l border-slate-900 md:pl-8 font-serif">
                  {currentSlide.translation}
                </div>
              )}
            </div>
          ) : (
            <div className="text-slate-700 text-3xl">No slide active.</div>
          )}
        </section>

        <div className="border-t border-slate-900 my-4" />

        {/* 2. NEXT SLIDE */}
        <section className="space-y-2.5">
          <span className="text-slate-500 text-[10px] uppercase font-bold tracking-widest block">Next Slide</span>
          {nextSlide ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center opacity-60">
              <div className="text-white font-bold text-xl md:text-3xl lg:text-4xl whitespace-pre-line leading-normal">
                {nextSlide.content}
              </div>
              {nextSlide.translation && (
                <div dir={dirFor(translationLang)} className="text-indigo-200 font-medium text-xl md:text-3xl lg:text-4xl whitespace-pre-line leading-normal border-l border-slate-900 md:pl-8 font-serif">
                  {nextSlide.translation}
                </div>
              )}
            </div>
          ) : (
            <div className="text-slate-800 text-xl">[End of Presentation]</div>
          )}
        </section>

      </div>

      {/* Footer Info bar */}
      <footer className="border-t border-slate-950 pt-4 flex justify-between items-center text-[10px] text-slate-650 font-medium uppercase tracking-wider">
        <span>HolyProjection Stage View</span>
        <span>© 2026</span>
      </footer>
    </main>
  );
}

export default function StageDisplayPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-black text-slate-650">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-slate-800 border-t-slate-500" />
        </div>
      }
    >
      <StageDisplayContent />
    </Suspense>
  );
}
