'use client';

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { useRealtimePresentation, useRealtimeSetlist, type Slide } from '@/utils/sync';
import { dirFor } from '@/utils/languages';
import SlideElementsLayer from '@/components/SlideElementsLayer';
import CountdownOverlay from '@/components/CountdownOverlay';
import { Clock, Tv, AlertTriangle, CheckCircle, StickyNote } from 'lucide-react';

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
  let currentSlide: Slide | undefined;
  let nextSlide: Slide | undefined;
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

  const ss = setlistId ? setlist?.items?.[0]?.presentation?.settings : singlePres.settings;
  const showClock = ss?.stageShowClock !== false;
  const showNext = ss?.stageShowNext !== false;
  const showTranslation = ss?.stageShowTranslation !== false;
  const stageMessage = ss?.stageMessage;

  // Countdown is controlled at the setlist level in setlist mode, on the presentation otherwise.
  const cdSource = setlistId ? setlist?.settings : ss;
  const countdownSettings = {
    countdownTarget: cdSource?.countdownTarget ?? null,
    countdownMessage: cdSource?.countdownMessage,
    countdownEndMessage: cdSource?.countdownEndMessage,
    fontFamily: ss?.fontFamily,
  };

  return (
    <main className="relative min-h-screen w-screen bg-black text-white font-sans flex flex-col justify-between p-8 select-none">

      {/* Pre-service countdown (full-screen) — same synced timer the band & projector share */}
      <CountdownOverlay settings={countdownSettings} />

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
          {showClock && (
            <div className="flex items-center gap-2 bg-slate-950 border border-slate-900 rounded-xl px-4 py-2 text-yellow-400 font-mono font-bold text-lg shadow-inner">
              <Clock className="h-4 w-4 text-yellow-500 animate-pulse" />
              <span>{time || '00:00:00'}</span>
            </div>
          )}

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
          {currentSlide && (currentSlide.elements?.length ?? 0) > 0 ? (
            <div className="relative w-full max-w-3xl aspect-video rounded-xl overflow-hidden ring-1 ring-white/10" style={{ backgroundColor: currentSlide.settings?.bgColor || '#0f172a' }}>
              {currentSlide.media_type === 'image' && currentSlide.media_url && (
                <img src={currentSlide.media_url} alt="" className="absolute inset-0 w-full h-full object-cover" />
              )}
              {currentSlide.media_type === 'video' && currentSlide.media_url && (
                <video src={currentSlide.media_url} muted loop autoPlay playsInline className="absolute inset-0 w-full h-full object-cover" />
              )}
              <SlideElementsLayer elements={currentSlide.elements} />
            </div>
          ) : currentSlide ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
              <div className="text-yellow-400 font-extrabold text-3xl md:text-5xl lg:text-6xl whitespace-pre-line leading-tight">
                {currentSlide.content}
              </div>
              {showTranslation && currentSlide.translation && (
                <div dir={dirFor(translationLang)} className="text-indigo-300 font-bold text-3xl md:text-5xl lg:text-6xl whitespace-pre-line leading-tight border-l border-slate-900 md:pl-8 font-serif">
                  {currentSlide.translation}
                </div>
              )}
            </div>
          ) : (
            <div className="text-slate-700 text-3xl">No slide active.</div>
          )}
        </section>

        {/* Presenter notes for the current slide — stage monitor only */}
        {currentSlide?.settings?.notes?.trim() && (
          <section className="mt-4 flex items-start gap-3 rounded-xl border border-amber-500/30 bg-amber-950/20 px-5 py-3.5">
            <StickyNote className="h-5 w-5 shrink-0 text-amber-400 mt-0.5" />
            <div>
              <span className="text-[9px] uppercase font-black tracking-widest text-amber-500/70 block">Presenter note</span>
              <p className="text-amber-200 font-semibold text-lg md:text-xl leading-snug whitespace-pre-line mt-0.5">{currentSlide.settings.notes}</p>
            </div>
          </section>
        )}

        {showNext && <div className="border-t border-slate-900 my-4" />}

        {/* 2. NEXT SLIDE */}
        {showNext && (
        <section className="space-y-2.5">
          <span className="text-slate-500 text-[10px] uppercase font-bold tracking-widest block">Next Slide</span>
          {nextSlide && (nextSlide.elements?.length ?? 0) > 0 ? (
            <div className="relative w-full max-w-md aspect-video rounded-xl overflow-hidden ring-1 ring-white/10 opacity-60" style={{ backgroundColor: nextSlide.settings?.bgColor || '#0f172a' }}>
              {nextSlide.media_type === 'image' && nextSlide.media_url && (
                <img src={nextSlide.media_url} alt="" className="absolute inset-0 w-full h-full object-cover" />
              )}
              {nextSlide.media_type === 'video' && nextSlide.media_url && (
                <video src={nextSlide.media_url} muted loop playsInline className="absolute inset-0 w-full h-full object-cover" />
              )}
              <SlideElementsLayer elements={nextSlide.elements} />
            </div>
          ) : nextSlide ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center opacity-60">
              <div className="text-white font-bold text-xl md:text-3xl lg:text-4xl whitespace-pre-line leading-normal">
                {nextSlide.content}
              </div>
              {showTranslation && nextSlide.translation && (
                <div dir={dirFor(translationLang)} className="text-indigo-200 font-medium text-xl md:text-3xl lg:text-4xl whitespace-pre-line leading-normal border-l border-slate-900 md:pl-8 font-serif">
                  {nextSlide.translation}
                </div>
              )}
            </div>
          ) : (
            <div className="text-slate-800 text-xl">[End of Presentation]</div>
          )}
        </section>
        )}

        {stageMessage && (
          <div className="mt-4 rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-amber-200 text-lg font-bold text-center">
            {stageMessage}
          </div>
        )}

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
