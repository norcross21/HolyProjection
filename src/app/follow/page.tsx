'use client';

import { useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { useRealtimePresentation, useRealtimeSetlist, type Slide, type Presentation } from '@/utils/sync';
import { dirFor } from '@/utils/languages';
import PollView from '@/components/PollView';
import SlideElementsLayer from '@/components/SlideElementsLayer';
import SlideBranding from '@/components/SlideBranding';
import { 
  Sparkles, 
  Tv, 
  MessageSquare, 
  Moon, 
  Sun, 
  Type, 
  Languages, 
  Check, 
  Send, 
  X,
  HeartHandshake,
  AlertTriangle
} from 'lucide-react';

function FollowContent() {
  const searchParams = useSearchParams();
  const presId = searchParams.get('pres');
  const setlistId = searchParams.get('setlist');

  // Load single presentation hook
  const {
    presentation: singlePres,
    activeSlideId: activePresSlideId,
    sendPrayerRequest: sendPresPrayer,
    activeAlert: presActiveAlert,
    activePoll,
    pollCounts,
    votePoll,
  } = useRealtimePresentation(setlistId ? '' : (presId || ''));

  // Load setlist hook
  const {
    setlist,
    activeSlideId: activeSetlistSlideId,
    sendPrayerRequest: sendSetlistPrayer,
    activeAlert: setlistActiveAlert,
  } = useRealtimeSetlist(setlistId || '');

  const activeAlert = setlistId ? setlistActiveAlert : presActiveAlert;

  const [langMode, setLangMode] = useState<'bilingual' | 'primary' | 'translation'>('bilingual');
  const [textSize, setTextSize] = useState<number>(1.2); // scaling multiplier
  const [isLightTheme, setIsLightTheme] = useState(false);
  const [isPrayerOpen, setIsPrayerOpen] = useState(false);

  // Prayer request form states
  const [prayerName, setPrayerName] = useState('');
  const [prayerText, setPrayerText] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [sendSuccess, setSendSuccess] = useState(false);

  // Resolve slides queue, current slide index, current slide, next slide, and settings
  let slides: Slide[] = [];
  let activeSlideId: string | null = null;
  let blankMode: 'none' | 'black' | 'clear' | 'logo' = 'none';
  let title = 'HolyProjection Live';
  let translationLang: string | undefined;
  let presSettings: Presentation['settings'] | undefined;

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
      presSettings = setlist.items[0]?.presentation?.settings;
    }
  } else {
    if (singlePres) {
      slides = singlePres.slides;
      activeSlideId = activePresSlideId;
      blankMode = singlePres.settings?.blankMode || 'none';
      title = singlePres.title;
      translationLang = singlePres.settings?.translationLang;
      presSettings = singlePres.settings;
    }
  }

  const activeIdx = slides.findIndex((s) => s.id === activeSlideId);
  const currentSlide = slides[activeIdx >= 0 ? activeIdx : 0];
  const nextSlide = activeIdx >= 0 && activeIdx < slides.length - 1 ? slides[activeIdx + 1] : null;

  const handleSubmitPrayer = (e: React.FormEvent) => {
    e.preventDefault();
    if (!prayerText.trim()) return;

    setIsSending(true);
    const senderName = prayerName.trim() || 'Anonymous Member';
    
    // Broadcast the prayer request using the active hook channel
    if (setlistId) {
      sendSetlistPrayer(senderName, prayerText.trim());
    } else {
      sendPresPrayer(senderName, prayerText.trim());
    }

    setTimeout(() => {
      setIsSending(false);
      setSendSuccess(true);
      setPrayerText('');
      setTimeout(() => {
        setSendSuccess(false);
        setIsPrayerOpen(false);
      }, 2000);
    }, 800);
  };

  return (
    <div className={`min-h-screen font-sans flex flex-col justify-between transition-colors duration-300 ${
      isLightTheme ? 'bg-slate-50 text-slate-900' : 'bg-slate-950 text-slate-100'
    }`}>
      
      {/* Background glow styling (Dark theme only) */}
      {!isLightTheme && (
        <>
          <div className="absolute top-0 right-0 h-[400px] w-[400px] rounded-full bg-indigo-900/10 blur-[100px] pointer-events-none" />
          <div className="absolute bottom-0 left-0 h-[400px] w-[400px] rounded-full bg-violet-900/5 blur-[100px] pointer-events-none" />
        </>
      )}

      {/* Header */}
      <header className={`border-b sticky top-0 z-30 px-4 py-3.5 flex items-center justify-between backdrop-blur-md transition-colors ${
        isLightTheme ? 'border-slate-200 bg-white/75' : 'border-slate-900 bg-slate-950/70'
      }`}>
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-tr from-violet-600 to-indigo-600 shadow-md">
            <HeartHandshake className="h-4 w-4 text-white" />
          </div>
          <div className="overflow-hidden max-w-[150px] sm:max-w-xs">
            <h1 className="font-extrabold text-xs leading-none truncate">{title}</h1>
            <span className="text-[9px] text-slate-550 uppercase tracking-widest font-semibold block mt-0.5">Congregation Follower</span>
          </div>
        </div>

        {/* Accessibility Panel */}
        <div className="flex items-center gap-2">
          {/* Text size selector */}
          <button
            onClick={() => setTextSize(prev => prev >= 1.8 ? 1.0 : prev + 0.2)}
            title="Text Size"
            className={`p-1.5 rounded-lg border transition-all ${
              isLightTheme ? 'border-slate-200 bg-slate-100 text-slate-700' : 'border-slate-800 bg-slate-900 text-slate-300'
            }`}
          >
            <Type className="h-3.5 w-3.5" />
          </button>

          {/* Theme toggle */}
          <button
            onClick={() => setIsLightTheme(!isLightTheme)}
            title="Toggle Theme"
            className={`p-1.5 rounded-lg border transition-all ${
              isLightTheme ? 'border-slate-200 bg-slate-100 text-slate-700' : 'border-slate-800 bg-slate-900 text-slate-300'
            }`}
          >
            {isLightTheme ? <Moon className="h-3.5 w-3.5" /> : <Sun className="h-3.5 w-3.5" />}
          </button>
        </div>
      </header>

      {/* Primary Display Area */}
      <main className="flex-1 px-4 py-6 flex flex-col justify-center max-w-lg w-full mx-auto gap-6 z-10">
        
        {/* Active Live Alert Overlay */}
        {activeAlert && (
          <div className={`w-full rounded-2xl border p-4 flex items-start gap-3 shadow-md transition-all duration-355 ${
            activeAlert.type === 'nursery'
              ? isLightTheme
                ? 'bg-amber-50 border-amber-250 text-amber-900 shadow-amber-100/30'
                : 'bg-amber-950/45 border-amber-500/35 text-amber-250 shadow-amber-950/20'
              : activeAlert.type === 'warning'
                ? isLightTheme
                  ? 'bg-red-50 border-red-250 text-red-900 shadow-red-100/30'
                  : 'bg-red-950/45 border-red-500/35 text-red-250 shadow-red-950/20'
                : isLightTheme
                  ? 'bg-slate-100 border-slate-200 text-slate-800 shadow-slate-100/30'
                  : 'bg-slate-900/60 border-slate-800/80 text-slate-200 shadow-slate-950/25'
          }`}>
            <AlertTriangle className={`h-5 w-5 shrink-0 ${
              activeAlert.type === 'nursery'
                ? 'text-amber-550 animate-pulse'
                : activeAlert.type === 'warning'
                  ? 'text-red-550 animate-bounce'
                  : isLightTheme ? 'text-slate-500' : 'text-slate-400'
            }`} />
            <div className="flex-1 overflow-hidden">
              <span className="text-[9px] uppercase font-black tracking-widest block opacity-70 font-sans">
                {activeAlert.type === 'nursery' ? 'Nursery Call' : activeAlert.type === 'warning' ? 'Urgent Alert' : 'Live Notice'}
              </span>
              <p className="font-extrabold text-xs leading-relaxed mt-0.5">{activeAlert.message}</p>
            </div>
          </div>
        )}

        {/* Language Tabs Selector */}
        <div className={`flex items-center gap-1 p-1 rounded-xl border transition-colors ${
          isLightTheme ? 'border-slate-200 bg-slate-100' : 'border-slate-900 bg-slate-900/40'
        }`}>
          {(['bilingual', 'primary', 'translation'] as const).map((mode) => (
            <button
              key={mode}
              onClick={() => setLangMode(mode)}
              className={`flex-1 rounded-lg py-1.5 text-[10px] font-extrabold capitalize transition-all ${
                langMode === mode
                  ? 'bg-violet-600 text-white shadow-md'
                  : isLightTheme ? 'text-slate-500 hover:text-slate-900' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {mode}
            </button>
          ))}
        </div>

        {/* Live poll */}
        {activePoll && (
          <section className="rounded-3xl border border-violet-500/30 bg-violet-950/20 p-6 mb-2 shadow-xl">
            <PollView poll={activePoll} counts={pollCounts} onVote={votePoll} />
          </section>
        )}

        {/* Slide Display Container */}
        <section className={`rounded-3xl border p-8 flex-1 flex flex-col justify-center min-h-[260px] relative shadow-xl backdrop-blur-sm transition-all ${
          isLightTheme 
            ? 'border-slate-200 bg-white/60 shadow-slate-100' 
            : 'border-slate-900 bg-slate-900/10 shadow-slate-950/20'
        }`}>
          {blankMode === 'black' ? (
            <div className="absolute inset-0 bg-black rounded-3xl z-20 flex items-center justify-center text-slate-650 text-xs font-semibold select-none">
              Display Mode: Blackout
            </div>
          ) : blankMode === 'logo' ? (
            <div className="flex flex-col items-center justify-center gap-3 animate-fade-in py-10">
              <Sparkles className="h-12 w-12 text-indigo-400 animate-pulse" />
              <p className="text-[10px] uppercase tracking-widest text-slate-500 font-extrabold">Worshiping Together</p>
            </div>
          ) : (
            <div 
              className="space-y-6 text-center transition-all duration-300"
              style={{ opacity: blankMode === 'clear' ? 0.05 : 1.0 }}
            >
              {currentSlide && (currentSlide.elements?.length ?? 0) > 0 ? (
                /* Designed (free-placement) slide — show the actual slide layout */
                <div className="relative w-full aspect-video rounded-2xl overflow-hidden ring-1 ring-white/10" style={{ backgroundColor: currentSlide.settings?.bgColor || '#0f172a' }}>
                  {currentSlide.media_type === 'image' && currentSlide.media_url && (
                    <img src={currentSlide.media_url} alt="" className="absolute inset-0 w-full h-full object-cover" />
                  )}
                  {currentSlide.media_type === 'video' && currentSlide.media_url && (
                    <video src={currentSlide.media_url} muted loop autoPlay playsInline className="absolute inset-0 w-full h-full object-cover" />
                  )}
                  <SlideElementsLayer elements={currentSlide.elements} />
                  {presSettings && <SlideBranding settings={presSettings} />}
                </div>
              ) : currentSlide ? (
                <>
                  {/* Primary Lyrics content */}
                  {(langMode === 'bilingual' || langMode === 'primary') && (
                    <p 
                      className={`font-extrabold leading-relaxed whitespace-pre-line transition-all duration-300 ${
                        isLightTheme ? 'text-slate-800' : 'text-white'
                      }`}
                      style={{ fontSize: `${1.4 * textSize}rem` }}
                    >
                      {currentSlide.content}
                    </p>
                  )}

                  {/* Divider */}
                  {langMode === 'bilingual' && currentSlide.translation && (
                    <div className={`h-px w-16 mx-auto ${isLightTheme ? 'bg-slate-200' : 'bg-slate-900'}`} />
                  )}

                  {/* Translation Lyrics content */}
                  {(langMode === 'bilingual' || langMode === 'translation') && currentSlide.translation && (
                    <p
                      dir={dirFor(translationLang)}
                      className="font-extrabold leading-relaxed font-serif whitespace-pre-line text-indigo-400/95 transition-all duration-300"
                      style={{ fontSize: `${1.3 * textSize}rem` }}
                    >
                      {currentSlide.translation}
                    </p>
                  )}
                </>
              ) : (
                <p className="text-slate-500 text-sm italic">Waiting for presenter to start slides...</p>
              )}
            </div>
          )}
        </section>

        {/* Next Slide Preview */}
        {nextSlide && blankMode === 'none' && (
          <section className={`rounded-2xl border p-4 opacity-50 transition-all ${
            isLightTheme ? 'border-slate-200 bg-white/40' : 'border-slate-900 bg-slate-900/5'
          }`}>
            <span className="text-[8px] text-slate-500 uppercase tracking-widest font-extrabold block mb-1">Next Slide</span>
            <div className="overflow-hidden">
              {langMode !== 'translation' && (
                <p className="text-xs font-semibold truncate">{nextSlide.content.split('\n')[0]}</p>
              )}
              {langMode !== 'primary' && nextSlide.translation && (
                <p dir={dirFor(translationLang)} className="text-xs font-semibold text-indigo-400 font-serif truncate mt-0.5">{nextSlide.translation.split('\n')[0]}</p>
              )}
            </div>
          </section>
        )}

      </main>

      {/* Floating Action / Footer */}
      <footer className={`px-4 py-4 border-t flex justify-center items-center z-20 ${
        isLightTheme ? 'border-slate-200 bg-slate-50' : 'border-slate-900 bg-slate-950'
      }`}>
        <button
          onClick={() => setIsPrayerOpen(true)}
          className="flex items-center gap-2 rounded-2xl bg-gradient-to-tr from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 px-6 py-3 text-xs font-bold text-white shadow-lg shadow-indigo-500/20 active:scale-95 transition-all w-full max-w-xs justify-center"
        >
          <MessageSquare className="h-4 w-4" />
          <span>Send Prayer Request / Note</span>
        </button>
      </footer>

      {/* Prayer Request Sliding Drawer (Modal) */}
      {isPrayerOpen && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className={`w-full max-w-md rounded-t-3xl border-t p-6 shadow-2xl space-y-4 transition-all duration-300 translate-y-0 ${
            isLightTheme ? 'bg-white border-slate-200 text-slate-900' : 'bg-slate-900 border-slate-800 text-slate-100'
          }`}>
            <div className="flex items-center justify-between border-b pb-3 border-slate-800/20">
              <div className="flex items-center gap-2">
                <HeartHandshake className="h-5 w-5 text-violet-400" />
                <h3 className="font-bold text-sm">Send Prayer Request / Note</h3>
              </div>
              <button 
                onClick={() => setIsPrayerOpen(false)}
                className={`p-1.5 rounded-full hover:bg-slate-800/10 transition-colors ${
                  isLightTheme ? 'text-slate-500' : 'text-slate-400'
                }`}
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {sendSuccess ? (
              <div className="py-8 flex flex-col items-center justify-center gap-3 animate-scale-up">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
                  <Check className="h-6 w-6" />
                </div>
                <p className="text-xs font-bold text-emerald-400">Note Sent to Presenter!</p>
              </div>
            ) : (
              <form onSubmit={handleSubmitPrayer} className="space-y-4">
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1.5">
                    Your Name (Optional)
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Sarah"
                    value={prayerName}
                    onChange={(e) => setPrayerName(e.target.value)}
                    className={`w-full rounded-xl border py-2.5 px-3.5 text-xs focus:outline-none transition-all ${
                      isLightTheme 
                        ? 'border-slate-200 bg-slate-50 focus:border-violet-500' 
                        : 'border-slate-800 bg-slate-950 focus:border-violet-500 text-slate-200'
                    }`}
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1.5">
                    Prayer Request or Message
                  </label>
                  <textarea
                    required
                    rows={3}
                    placeholder="Type your prayer request or quick note here..."
                    value={prayerText}
                    onChange={(e) => setPrayerText(e.target.value)}
                    className={`w-full rounded-xl border py-2.5 px-3.5 text-xs focus:outline-none transition-all resize-none ${
                      isLightTheme 
                        ? 'border-slate-200 bg-slate-50 focus:border-violet-500' 
                        : 'border-slate-800 bg-slate-950 focus:border-violet-500 text-slate-200'
                    }`}
                  />
                </div>

                <button
                  type="submit"
                  disabled={isSending}
                  className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-tr from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 py-3 text-xs font-bold text-white shadow-md active:scale-98 transition-all disabled:opacity-50"
                >
                  {isSending ? (
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  ) : (
                    <>
                      <Send className="h-3.5 w-3.5" />
                      <span>Send Note</span>
                    </>
                  )}
                </button>
              </form>
            )}
          </div>
        </div>
      )}

    </div>
  );
}

export default function FollowPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-slate-950 text-slate-200">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-violet-500 border-t-transparent" />
        </div>
      }
    >
      <FollowContent />
    </Suspense>
  );
}
