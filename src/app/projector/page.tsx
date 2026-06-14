'use client';

import { useEffect, useRef, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { useRealtimePresentation, useRealtimeSetlist } from '@/utils/sync';
import { Maximize2, Minimize2, Tv, CheckCircle, AlertTriangle, Camera } from 'lucide-react';

function ProjectorContent() {
  const searchParams = useSearchParams();
  const presId = searchParams.get('pres');
  const setlistId = searchParams.get('setlist');
  const langParam = searchParams.get('lang'); // 'primary' | 'translation' | 'bilingual'
  
  // Custom sync hooks (called unconditionally)
  const {
    isDemoMode: isPresDemo,
    presentation: singlePres,
    activeSlideId: activePresSlideId,
  } = useRealtimePresentation(setlistId ? '' : (presId || 'demo-presentation-1'));

  const {
    isDemoMode: isSetlistDemo,
    setlist,
    activeSlideId: activeSetlistSlideId,
  } = useRealtimeSetlist(setlistId || '');

  const isDemoMode = setlistId ? isSetlistDemo : isPresDemo;

  // Layout parameters
  const [displayMode, setDisplayMode] = useState<'primary' | 'translation' | 'bilingual'>('bilingual');
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [statusVisible, setStatusVisible] = useState(true);

  const containerRef = useRef<HTMLDivElement>(null);
  const primaryTextRef = useRef<HTMLDivElement>(null);
  const translationTextRef = useRef<HTMLDivElement>(null);

  // WebRTC camera video reference
  const cameraVideoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // Resolve slides, active slide, and settings based on routing mode
  let activeSlide: any = null;
  let fontSettings = { fontFamily: 'sans-serif', margin: 8, background: '#0f172a' };

  if (setlistId) {
    if (setlist) {
      const allSlides = setlist.items.flatMap((item) => {
        const pres = item.presentation;
        return pres?.slides || [];
      });
      activeSlide = allSlides.find((s) => s.id === activeSetlistSlideId) || allSlides[0];
      if (setlist.items.length > 0 && setlist.items[0].presentation) {
        fontSettings = setlist.items[0].presentation.settings;
      }
    }
  } else {
    activeSlide = singlePres.slides.find((s) => s.id === activePresSlideId) || singlePres.slides[0];
    fontSettings = singlePres.settings;
  }

  // 1. Handle language query parameter routing
  useEffect(() => {
    if (langParam === 'primary') setDisplayMode('primary');
    else if (langParam === 'translation') setDisplayMode('translation');
    else if (langParam === 'bilingual') setDisplayMode('bilingual');
  }, [langParam]);

  // 2. Handle WebRTC Live Camera Stream lifecycle
  useEffect(() => {
    const isCameraActive = activeSlide?.media_type === 'camera';

    if (isCameraActive) {
      navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' }, audio: false })
        .then((stream) => {
          streamRef.current = stream;
          if (cameraVideoRef.current) {
            cameraVideoRef.current.srcObject = stream;
            cameraVideoRef.current.play().catch((err) => {
              console.error("Camera play failed:", err);
            });
          }
        })
        .catch((err) => {
          console.error("WebRTC camera stream access blocked:", err);
        });
    } else {
      // Stop webcam stream tracks if active to free user resources
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
      }
    }

    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
      }
    };
  }, [activeSlide?.media_type]);

  // Auto-sizing text function
  const adjustFontSizes = () => {
    const container = containerRef.current;
    if (!container || !activeSlide) return;

    // Adjust margins
    const marginScale = fontSettings.margin * 32;
    const availableWidth = container.clientWidth - marginScale;
    const availableHeight = container.clientHeight - marginScale;

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
      const halfHeight = (availableHeight / 2) - 40;
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
  }, [activeSlide, displayMode, fontSettings]);

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

  const hasMediaBg = 
    activeSlide?.media_type === 'video' || 
    activeSlide?.media_type === 'camera' || 
    activeSlide?.media_type === 'image';

  return (
    <main
      className="relative flex h-screen w-screen flex-col items-center justify-center overflow-hidden transition-all duration-300"
      style={{
        backgroundColor: fontSettings.background || '#0f172a',
        fontFamily: fontSettings.fontFamily || 'sans-serif',
      }}
    >
      {/* Background Image Layer */}
      {activeSlide?.media_type === 'image' && activeSlide.media_url && (
        <img
          key={activeSlide.media_url}
          src={activeSlide.media_url}
          alt="Slide background"
          className="absolute inset-0 w-full h-full object-cover z-0 pointer-events-none brightness-[0.35] contrast-[1.1] transition-opacity duration-300"
        />
      )}

      {/* 1. Background Video Layer */}
      {activeSlide?.media_type === 'video' && activeSlide.media_url && (
        <video
          key={activeSlide.media_url}
          src={activeSlide.media_url}
          autoPlay
          loop
          muted
          playsInline
          className="absolute inset-0 w-full h-full object-cover z-0 pointer-events-none brightness-[0.35] contrast-[1.1] saturate-[0.8]"
        />
      )}

      {/* 2. WebRTC Live Camera Stream Layer */}
      <video
        ref={cameraVideoRef}
        autoPlay
        playsInline
        muted
        className={`absolute inset-0 w-full h-full object-cover z-0 pointer-events-none brightness-[0.35] contrast-[1.1] transition-opacity duration-300 ${
          activeSlide?.media_type === 'camera' ? 'opacity-100' : 'opacity-0'
        }`}
      />

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

      {/* Floating Control Toolbar (Hidden if query parameter forces a specific language) */}
      {!langParam && (
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
      )}

      {/* Main Projection Canvas */}
      <div
        ref={containerRef}
        className="flex h-full w-full flex-col justify-center text-center select-none z-10"
        style={{
          padding: `${fontSettings.margin * 1.5}rem`,
        }}
      >
        {!activeSlide ? (
          <div className="text-slate-500 text-lg">No slides loaded. Go to the dashboard to project.</div>
        ) : (
          <div 
            className={`flex flex-col justify-center items-center gap-8 w-full transition-all duration-300 ${
              hasMediaBg 
                ? 'backdrop-blur-md bg-slate-950/45 border border-white/5 rounded-3xl p-10 max-w-4xl mx-auto shadow-[0_0_50px_rgba(0,0,0,0.5)]'
                : ''
            }`}
          >
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
