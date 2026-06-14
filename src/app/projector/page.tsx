'use client';

import { useEffect, useRef, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { useRealtimePresentation } from '@/utils/sync';
import { Maximize2, Minimize2, Tv, CheckCircle, AlertTriangle } from 'lucide-react';

function ProjectorContent() {
  const searchParams = useSearchParams();
  const presId = searchParams.get('pres') || 'demo-presentation-1';
  
  // Custom sync hook
  const {
    isDemoMode,
    presentation,
    activeSlideId,
  } = useRealtimePresentation(presId);

  // Layout parameters
  const [displayMode, setDisplayMode] = useState<'primary' | 'translation' | 'bilingual'>('bilingual');
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [statusVisible, setStatusVisible] = useState(true);

  const containerRef = useRef<HTMLDivElement>(null);
  const primaryTextRef = useRef<HTMLDivElement>(null);
  const translationTextRef = useRef<HTMLDivElement>(null);

  // Active slide details
  const activeSlide = presentation.slides.find((s) => s.id === activeSlideId) || presentation.slides[0];

  // Auto-sizing text function
  const adjustFontSizes = () => {
    const container = containerRef.current;
    if (!container || !activeSlide) return;

    const availableWidth = container.clientWidth - (presentation.settings.margin * 32); // Convert margin scale
    const availableHeight = container.clientHeight - (presentation.settings.margin * 32);

    if (availableWidth <= 0 || availableHeight <= 0) return;

    // Helper to calculate font size for a specific text block
    const findOptimalSize = (textEl: HTMLDivElement | null, textContent: string, maxH: number, maxW: number) => {
      if (!textEl || !textContent) return;

      let min = 12;
      let max = 250;
      let optimal = 24;

      while (min <= max) {
        const mid = Math.floor((min + max) / 2);
        textEl.style.fontSize = `${mid}px`;

        const overflow = textEl.scrollHeight > maxH || textEl.scrollWidth > maxW;

        if (overflow) {
          max = mid - 1;
        } else {
          optimal = mid;
          min = mid + 1;
        }
      }

      textEl.style.fontSize = `${optimal}px`;
    };

    if (displayMode === 'primary') {
      findOptimalSize(primaryTextRef.current, activeSlide.content, availableHeight, availableWidth);
    } else if (displayMode === 'translation') {
      findOptimalSize(translationTextRef.current, activeSlide.translation || '', availableHeight, availableWidth);
    } else if (displayMode === 'bilingual') {
      // Split vertical height between primary and translation
      const halfHeight = (availableHeight / 2) - 20;
      findOptimalSize(primaryTextRef.current, activeSlide.content, halfHeight, availableWidth);
      findOptimalSize(translationTextRef.current, activeSlide.translation || '', halfHeight, availableWidth);
    }
  };

  // Run auto-sizing when slide content, display mode, settings, or window size changes
  useEffect(() => {
    adjustFontSizes();

    const container = containerRef.current;
    if (!container) return;

    const resizeObserver = new ResizeObserver(() => {
      adjustFontSizes();
    });

    resizeObserver.observe(container);

    return () => {
      resizeObserver.disconnect();
    };
  }, [activeSlide, displayMode, presentation.settings]);

  // Hide connection status badge after 4 seconds
  useEffect(() => {
    setStatusVisible(true);
    const timer = setTimeout(() => {
      setStatusVisible(false);
    }, 4000);
    return () => clearTimeout(timer);
  }, [isDemoMode]);

  // Handle browser fullscreen toggle
  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().then(() => {
        setIsFullscreen(true);
      }).catch((err) => {
        console.error('Fullscreen request failed:', err);
      });
    } else {
      document.exitFullscreen().then(() => {
        setIsFullscreen(false);
      });
    }
  };

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  return (
    <main
      className="relative flex h-screen w-screen flex-col items-center justify-center overflow-hidden transition-all duration-300"
      style={{
        backgroundColor: presentation.settings.background || '#0f172a',
        fontFamily: presentation.settings.fontFamily || 'sans-serif',
      }}
    >
      {/* Floating Status Notification Overlay */}
      {statusVisible && (
        <div className="absolute top-6 left-6 z-50 flex items-center gap-2 rounded-xl bg-slate-900/80 border border-slate-700/50 px-4 py-2 text-xs font-medium text-slate-200 shadow-xl backdrop-blur-md animate-fade-in">
          {isDemoMode ? (
            <>
              <AlertTriangle className="h-4 w-4 text-amber-400" />
              <span>Offline Demo Sync Active (Multi-tab)</span>
            </>
          ) : (
            <>
              <CheckCircle className="h-4 w-4 text-emerald-400" />
              <span>Live Supabase Sync Active</span>
            </>
          )}
        </div>
      )}

      {/* Floating Control Toolbar (Hidden in true fullscreen display or faded on mouse idle) */}
      <div className="absolute bottom-6 left-1/2 z-50 -translate-x-1/2 flex items-center gap-3 rounded-full bg-slate-900/70 border border-slate-800 px-5 py-3 shadow-2xl backdrop-blur-md opacity-30 hover:opacity-100 transition-opacity duration-300">
        <div className="flex items-center gap-1.5 border-r border-slate-800 pr-3">
          <Tv className="h-4 w-4 text-violet-400" />
          <span className="text-xs font-semibold text-slate-300 uppercase tracking-wider">Projector Screen</span>
        </div>

        <div className="flex items-center gap-1">
          <button
            onClick={() => setDisplayMode('primary')}
            className={`rounded-full px-3 py-1 text-xs font-medium transition-all ${
              displayMode === 'primary' ? 'bg-violet-600 text-white shadow-sm shadow-violet-500/30' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            English Only
          </button>
          <button
            onClick={() => setDisplayMode('translation')}
            className={`rounded-full px-3 py-1 text-xs font-medium transition-all ${
              displayMode === 'translation' ? 'bg-violet-600 text-white shadow-sm shadow-violet-500/30' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Arabic Only
          </button>
          <button
            onClick={() => setDisplayMode('bilingual')}
            className={`rounded-full px-3 py-1 text-xs font-medium transition-all ${
              displayMode === 'bilingual' ? 'bg-violet-600 text-white shadow-sm shadow-violet-500/30' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Bilingual
          </button>
        </div>

        <div className="flex items-center gap-2 border-l border-slate-800 pl-3">
          <button
            onClick={toggleFullscreen}
            title="Toggle Fullscreen"
            className="rounded-full p-1.5 text-slate-400 hover:bg-slate-800 hover:text-slate-200 transition-colors"
          >
            {isFullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
          </button>
        </div>
      </div>

      {/* Main Projection Canvas */}
      <div
        ref={containerRef}
        className="flex h-full w-full flex-col justify-center text-center select-none"
        style={{
          padding: `${presentation.settings.margin * 1.5}rem`,
        }}
      >
        {!activeSlide ? (
          <div className="text-slate-500 text-lg">No slides loaded. Go to the dashboard to project.</div>
        ) : (
          <div className="flex h-full w-full flex-col justify-center items-center gap-8">
            {/* Primary Language Layer */}
            {(displayMode === 'primary' || displayMode === 'bilingual') && (
              <div
                ref={primaryTextRef}
                className="text-white font-bold leading-snug whitespace-pre-line tracking-tight transition-all duration-150 ease-out drop-shadow-md text-center max-w-full"
              >
                {activeSlide.content}
              </div>
            )}

            {/* Language Divider for Bilingual display */}
            {displayMode === 'bilingual' && activeSlide.translation && (
              <div className="w-1/4 border-t border-white/20 my-1 animate-fade-in" />
            )}

            {/* Translation Layer (Arabic / Right-to-Left styling) */}
            {(displayMode === 'translation' || displayMode === 'bilingual') && activeSlide.translation && (
              <div
                ref={translationTextRef}
                dir="rtl"
                className="text-indigo-200 font-extrabold leading-normal whitespace-pre-line transition-all duration-150 ease-out drop-shadow-md text-center max-w-full font-serif"
              >
                {activeSlide.translation}
              </div>
            )}
          </div>
        )}
      </div>
    </main>
  );
}

export default function ProjectorPage() {
  return (
    <Suspense
      fallback={
        <div className="flex h-screen w-screen items-center justify-center bg-slate-950 text-slate-400">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-violet-500 border-t-transparent" />
        </div>
      }
    >
      <ProjectorContent />
    </Suspense>
  );
}
