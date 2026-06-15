'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useRealtimePresentation, useRealtimeSetlist } from '@/utils/sync';
import { resolveAuth } from '@/utils/auth';
import { dirFor } from '@/utils/languages';
import { 
  ArrowLeft, 
  Play, 
  Sparkles, 
  Tv, 
  ChevronLeft, 
  ChevronRight, 
  EyeOff, 
  Image as ImageIcon, 
  XOctagon, 
  RefreshCw,
  LayoutGrid
} from 'lucide-react';

function RemoteContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const presId = searchParams.get('pres');
  const setlistId = searchParams.get('setlist');

  // Load single presentation hook
  const {
    isDemoMode: isPresDemo,
    presentation: singlePres,
    activeSlideId: activePresSlideId,
    setLiveSlide: setPresLiveSlide,
    updateSettings: updatePresSettings,
    setBlankMode: setPresBlankMode
  } = useRealtimePresentation(setlistId ? '' : (presId || ''));

  // Load setlist hook
  const {
    isDemoMode: isSetlistDemo,
    setlist,
    activeSlideId: activeSetlistSlideId,
    setLiveSlide: setSetlistLiveSlide,
    setBlankMode: setSetlistBlankMode
  } = useRealtimeSetlist(setlistId || '');

  const isDemoMode = setlistId ? isSetlistDemo : isPresDemo;

  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
    // Require a real session in cloud mode; localStorage profile only in demo mode
    const checkSession = async () => {
      const identity = await resolveAuth();
      if (!identity) {
        router.push('/login');
      }
    };
    checkSession();
  }, [router]);

  // In setlist mode we wait for the setlist to load; in single-presentation mode
  // singlePres always has a value, so only gate on the client being ready.
  if (!isClient || (setlistId ? !setlist : false)) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-950 text-slate-200">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-violet-500 border-t-transparent" />
      </div>
    );
  }

  // Resolve slides queue, current slide index, current slide, next slide, and settings
  let slides: any[] = [];
  let activeSlideId: string | null = null;
  let blankMode: 'none' | 'black' | 'clear' | 'logo' = 'none';
  let title = '';
  let translationLang: string | undefined;

  if (setlistId) {
    if (setlist) {
      slides = setlist.items.flatMap((item) => {
        const p = item.presentation;
        return p?.slides || [];
      });
      activeSlideId = activeSetlistSlideId;
      blankMode = setlist.settings?.blankMode || 'none';
      title = setlist.title;
      translationLang = setlist.items[0]?.presentation?.settings?.translationLang;
    }
  } else {
    slides = singlePres.slides;
    activeSlideId = activePresSlideId;
    translationLang = singlePres.settings?.translationLang;
    blankMode = singlePres.settings?.blankMode || 'none';
    title = singlePres.title;
  }

  const activeIdx = slides.findIndex((s) => s.id === activeSlideId);
  const currentSlide = slides[activeIdx >= 0 ? activeIdx : 0];
  const nextSlide = activeIdx >= 0 && activeIdx < slides.length - 1 ? slides[activeIdx + 1] : null;

  const handleNext = () => {
    if (slides.length === 0) return;
    if (activeIdx < slides.length - 1) {
      const nextId = slides[activeIdx + 1].id;
      if (setlistId) setSetlistLiveSlide(nextId);
      else setPresLiveSlide(nextId);
    }
  };

  const handlePrev = () => {
    if (slides.length === 0) return;
    if (activeIdx > 0) {
      const prevId = slides[activeIdx - 1].id;
      if (setlistId) setSetlistLiveSlide(prevId);
      else setPresLiveSlide(prevId);
    }
  };

  const toggleBlankMode = (mode: 'none' | 'black' | 'clear' | 'logo') => {
    if (setlistId) setSetlistBlankMode(mode);
    else setPresBlankMode(mode);
  };

  return (
    <div className="min-h-screen bg-slate-950 font-sans text-slate-100 flex flex-col justify-between select-none">
      
      {/* Header */}
      <header className="border-b border-slate-900 bg-slate-950/70 backdrop-blur-md px-4 py-3 flex items-center justify-between sticky top-0 z-30">
        <button
          onClick={() => router.push(setlistId ? `/dashboard/setlist?id=${setlistId}` : `/dashboard?pres=${presId}`)}
          className="flex items-center gap-1.5 rounded-lg bg-slate-900 border border-slate-800 px-3 py-1.5 text-xs text-slate-400 font-bold"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Exit</span>
        </button>

        <div className="text-center overflow-hidden max-w-[50%]">
          <h1 className="font-extrabold text-xs text-white truncate">{title}</h1>
          <span className="text-[9px] text-slate-500 uppercase tracking-widest font-semibold block">Live Touch Remote</span>
        </div>

        <div className="flex items-center gap-1.5 rounded-full bg-slate-900 border border-slate-800 px-2.5 py-1 text-[9px] text-slate-400 font-bold">
          {isDemoMode ? <span>Demo</span> : <span className="text-emerald-400">Live</span>}
        </div>
      </header>

      {/* Main Preview Cards Area */}
      <main className="flex-1 px-4 py-4 flex flex-col justify-center gap-4">
        
        {/* Current Slide Display */}
        <section className="rounded-2xl border border-slate-900 bg-slate-900/10 p-5 backdrop-blur-md flex-1 flex flex-col justify-center min-h-[160px] relative">
          <span className="absolute top-3 left-4 text-[9px] text-slate-550 uppercase tracking-widest font-bold">Current Slide ({activeIdx + 1}/{slides.length})</span>
          {currentSlide ? (
            <div className="space-y-4 text-center mt-2">
              <p className="text-lg font-bold text-white leading-relaxed whitespace-pre-line">{currentSlide.content}</p>
              {currentSlide.translation && (
                <p dir={dirFor(translationLang)} className="text-base font-bold text-indigo-300 leading-relaxed font-serif whitespace-pre-line border-t border-slate-900 pt-2">{currentSlide.translation}</p>
              )}
            </div>
          ) : (
            <p className="text-slate-650 text-center text-sm">No slide active.</p>
          )}
        </section>

        {/* Next Slide Preview */}
        <section className="rounded-2xl border border-slate-900 bg-slate-900/10 p-4 backdrop-blur-md min-h-[90px] relative opacity-60">
          <span className="absolute top-3 left-4 text-[8px] text-slate-600 uppercase tracking-widest font-bold">Next Slide Preview</span>
          {nextSlide ? (
            <div className="text-center mt-2.5">
              <p className="text-xs font-semibold text-slate-350 truncate">{nextSlide.content.split('\n')[0]}</p>
              {nextSlide.translation && (
                <p dir={dirFor(translationLang)} className="text-xs font-semibold text-indigo-400 font-serif truncate mt-0.5">{nextSlide.translation.split('\n')[0]}</p>
              )}
            </div>
          ) : (
            <p className="text-[10px] text-slate-700 text-center mt-3 uppercase tracking-wider font-bold">End of Presentation</p>
          )}
        </section>

      </main>

      {/* Emergency Overlay Controls */}
      <section className="px-4 py-3 bg-slate-950 border-t border-slate-900">
        <span className="text-[8px] text-slate-650 uppercase tracking-widest font-bold block mb-2 text-center">Projector Display Mode</span>
        
        <div className="grid grid-cols-4 gap-2">
          <button
            onClick={() => toggleBlankMode('none')}
            className={`flex flex-col items-center justify-center py-2.5 rounded-xl border text-[10px] font-bold gap-1 transition-all active:scale-95 ${
              blankMode === 'none'
                ? 'bg-violet-600/10 border-violet-500 text-violet-400'
                : 'bg-slate-900/40 border-slate-900 text-slate-400 hover:border-slate-800'
            }`}
          >
            <Tv className="h-4 w-4" />
            <span>Normal</span>
          </button>
          
          <button
            onClick={() => toggleBlankMode('black')}
            className={`flex flex-col items-center justify-center py-2.5 rounded-xl border text-[10px] font-bold gap-1 transition-all active:scale-95 ${
              blankMode === 'black'
                ? 'bg-red-650/15 border-red-500 text-red-400'
                : 'bg-slate-900/40 border-slate-900 text-slate-400 hover:border-slate-800'
            }`}
          >
            <XOctagon className="h-4 w-4" />
            <span>Blackout</span>
          </button>

          <button
            onClick={() => toggleBlankMode('clear')}
            className={`flex flex-col items-center justify-center py-2.5 rounded-xl border text-[10px] font-bold gap-1 transition-all active:scale-95 ${
              blankMode === 'clear'
                ? 'bg-indigo-650/15 border-indigo-500 text-indigo-400'
                : 'bg-slate-900/40 border-slate-900 text-slate-400 hover:border-slate-800'
            }`}
          >
            <EyeOff className="h-4 w-4" />
            <span>Clear Text</span>
          </button>

          <button
            onClick={() => toggleBlankMode('logo')}
            className={`flex flex-col items-center justify-center py-2.5 rounded-xl border text-[10px] font-bold gap-1 transition-all active:scale-95 ${
              blankMode === 'logo'
                ? 'bg-emerald-650/15 border-emerald-500 text-emerald-400'
                : 'bg-slate-900/40 border-slate-900 text-slate-400 hover:border-slate-800'
            }`}
          >
            <Sparkles className="h-4 w-4" />
            <span>Show Logo</span>
          </button>
        </div>
      </section>

      {/* Massive Navigation Buttons */}
      <section className="p-4 bg-slate-950 flex gap-4 border-t border-slate-900">
        <button
          onClick={handlePrev}
          disabled={activeIdx <= 0}
          className="flex-1 flex items-center justify-center gap-1.5 py-5 rounded-2xl bg-slate-900 border border-slate-800 text-slate-300 font-bold active:bg-slate-800 disabled:opacity-35 transition-all"
        >
          <ChevronLeft className="h-5 w-5" />
          <span>PREVIOUS</span>
        </button>

        <button
          onClick={handleNext}
          disabled={activeIdx >= slides.length - 1}
          className="flex-[2] flex items-center justify-center gap-1.5 py-5 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white font-extrabold shadow-lg shadow-indigo-500/25 active:scale-[0.98] disabled:opacity-35 transition-all"
        >
          <span>NEXT SLIDE</span>
          <ChevronRight className="h-5 w-5" />
        </button>
      </section>

    </div>
  );
}

export default function RemotePage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-slate-950 text-slate-200">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-violet-500 border-t-transparent" />
        </div>
      }
    >
      <RemoteContent />
    </Suspense>
  );
}
