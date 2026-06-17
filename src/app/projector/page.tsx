'use client';

import { useEffect, useRef, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { useRealtimePresentation, useRealtimeSetlist, type Presentation, type Slide } from '@/utils/sync';
import { dirFor } from '@/utils/languages';
import SlideElementsLayer from '@/components/SlideElementsLayer';
import { Maximize2, Minimize2, Tv, CheckCircle, AlertTriangle, Camera, Sparkles } from 'lucide-react';

type DisplayMode = 'primary' | 'translation' | 'bilingual';

function parseDisplayMode(value: string | null): DisplayMode {
  return value === 'primary' || value === 'translation' || value === 'bilingual' ? value : 'bilingual';
}

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
    activeAlert: presActiveAlert,
  } = useRealtimePresentation(setlistId ? '' : (presId || ''));

  const {
    isDemoMode: isSetlistDemo,
    setlist,
    activeSlideId: activeSetlistSlideId,
    activeAlert: setlistActiveAlert,
  } = useRealtimeSetlist(setlistId || '');

  const isDemoMode = setlistId ? isSetlistDemo : isPresDemo;
  const activeAlert = setlistId ? setlistActiveAlert : presActiveAlert;

  // Layout parameters
  const [displayMode, setDisplayMode] = useState<DisplayMode>(() => parseDisplayMode(langParam));
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [statusVisible, setStatusVisible] = useState(true);

  // Transition & Slide rendering states
  const [transitionState, setTransitionState] = useState<'idle' | 'exiting' | 'entering'>('idle');
  const [slideToShow, setSlideToShow] = useState<Slide | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);
  const primaryTextRef = useRef<HTMLDivElement>(null);
  const translationTextRef = useRef<HTMLDivElement>(null);

  // WebRTC camera video reference
  const cameraVideoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // Resolve slides, active slide, and settings based on routing mode
  let activeSlide: Slide | null = null;
  let fontSettings: Presentation['settings'] = { fontSize: 48, fontFamily: 'sans-serif', margin: 8, background: '#0f172a', blankMode: 'none' };

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

  // 1. Load Google Fonts dynamically
  useEffect(() => {
    const linkId = 'google-fonts-projector';
    if (!document.getElementById(linkId)) {
      const link = document.createElement('link');
      link.id = linkId;
      link.rel = 'stylesheet';
      link.href = 'https://fonts.googleapis.com/css2?family=Montserrat:wght@400;700;900&family=Outfit:wght@450;700;900&family=Lora:ital,wght@0,600;0,700;1,600&family=Playfair+Display:ital,wght@0,700;1,700&display=swap';
      document.head.appendChild(link);
    }
  }, []);

  // 2. Handle stateful slide transitions and live updates
  useEffect(() => {
    if (!activeSlide) {
      queueMicrotask(() => {
        setSlideToShow(null);
        setTransitionState('idle');
      });
      return;
    }

    if (!slideToShow) {
      queueMicrotask(() => {
        setSlideToShow(activeSlide);
        setTransitionState('idle');
      });
      return;
    }

    const transition = fontSettings.slideTransition || 'none';

    // Live edit updates (same slide ID, content/media edited)
    if (activeSlide.id === slideToShow.id) {
      if (
        activeSlide.content !== slideToShow.content ||
        activeSlide.translation !== slideToShow.translation ||
        activeSlide.media_type !== slideToShow.media_type ||
        activeSlide.media_url !== slideToShow.media_url
      ) {
        queueMicrotask(() => {
          setSlideToShow(activeSlide);
        });
      }
      return;
    }

    // Active slide changed
    if (transition === 'none') {
      queueMicrotask(() => {
        setSlideToShow(activeSlide);
        setTransitionState('idle');
      });
    } else {
      queueMicrotask(() => {
        setTransitionState('exiting');
      });
      const exitTimer = setTimeout(() => {
        setSlideToShow(activeSlide);
        setTransitionState('entering');
        const enterTimer = setTimeout(() => {
          setTransitionState('idle');
        }, 50);
        return () => clearTimeout(enterTimer);
      }, 300);
      return () => clearTimeout(exitTimer);
    }
  }, [
    activeSlide?.id,
    activeSlide?.content,
    activeSlide?.translation,
    activeSlide?.media_type,
    activeSlide?.media_url,
    fontSettings.slideTransition
  ]);

  // 3. Handle WebRTC Live Camera Stream lifecycle based on currently showing slide
  useEffect(() => {
    const isCameraActive = slideToShow?.media_type === 'camera';
    let cancelled = false;

    if (isCameraActive) {
      navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' }, audio: false })
        .then((stream) => {
          // The slide may have changed away from camera before this resolved —
          // if so, stop the stream immediately instead of leaving the camera on.
          if (cancelled) {
            stream.getTracks().forEach((track) => track.stop());
            return;
          }
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
      cancelled = true;
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
      }
    };
  }, [slideToShow?.media_type]);

  // Alignment styling helper functions
  const getVerticalAlignClass = () => {
    const val = fontSettings.verticalAlign || 'center';
    if (val === 'top') return 'justify-start';
    if (val === 'bottom') return 'justify-end';
    return 'justify-center';
  };

  const getHorizontalAlignClass = () => {
    const val = fontSettings.textAlign || 'center';
    if (val === 'left') return 'items-start text-left';
    if (val === 'right') return 'items-end text-right';
    return 'items-center text-center';
  };

  const getDividerAlignClass = () => {
    const val = fontSettings.textAlign || 'center';
    if (val === 'left') return 'self-start mr-auto w-1/4';
    if (val === 'right') return 'self-end ml-auto w-1/4';
    return 'self-center mx-auto w-1/4';
  };

  const getTextAlignClass = () => {
    const val = fontSettings.textAlign || 'center';
    if (val === 'left') return 'text-left';
    if (val === 'right') return 'text-right';
    return 'text-center';
  };

  // Text decoration styling (stroke + shadow + capitalization)
  const getTextStyle = () => {
    const style: React.CSSProperties = {};
    
    // Text transform
    if (fontSettings.textTransform === 'uppercase') {
      style.textTransform = 'uppercase';
    }
    
    // Text outline
    const outline = fontSettings.textOutline || 'none';
    if (outline === 'subtle') {
      style.WebkitTextStroke = '1px rgba(0, 0, 0, 0.85)';
    } else if (outline === 'strong') {
      style.WebkitTextStroke = '2.5px rgba(0, 0, 0, 0.95)';
    }
    
    // Text shadow
    const shadow = fontSettings.textShadow || 'none';
    if (shadow === 'subtle') {
      style.textShadow = '1px 1px 3px rgba(0, 0, 0, 0.85)';
    } else if (shadow === 'strong') {
      style.textShadow = '3px 3px 8px rgba(0, 0, 0, 0.95), 0 0 15px rgba(0, 0, 0, 0.8)';
    }
    
    return style;
  };

  // Transition animations class calculation
  const getTransitionClasses = () => {
    const transition = fontSettings.slideTransition || 'none';
    if (transition === 'none') return '';

    if (transition === 'fade') {
      if (transitionState === 'exiting') return 'opacity-0 scale-100 transition-all duration-300 ease-in-out';
      if (transitionState === 'entering') return 'opacity-0 scale-100';
      return 'opacity-100 scale-100 transition-all duration-300 ease-in-out';
    }

    if (transition === 'slide') {
      if (transitionState === 'exiting') return 'opacity-0 -translate-x-12 transition-all duration-300 ease-in-out';
      if (transitionState === 'entering') return 'opacity-0 translate-x-12';
      return 'opacity-100 translate-x-0 transition-all duration-300 ease-in-out';
    }

    if (transition === 'zoom') {
      if (transitionState === 'exiting') return 'opacity-0 scale-90 transition-all duration-300 ease-in-out';
      if (transitionState === 'entering') return 'opacity-0 scale-110';
      return 'opacity-100 scale-100 transition-all duration-300 ease-in-out';
    }

    return '';
  };

  // Auto-sizing text function
  const adjustFontSizes = () => {
    const container = containerRef.current;
    if (!container || !slideToShow) return;

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
      findOptimalSize(primaryTextRef.current, slideToShow.content, availableHeight, availableWidth);
    } else if (displayMode === 'translation') {
      findOptimalSize(translationTextRef.current, slideToShow.translation || '', availableHeight, availableWidth);
    } else if (displayMode === 'bilingual') {
      // Split vertical height between primary and translation
      const halfHeight = (availableHeight / 2) - 40;
      findOptimalSize(primaryTextRef.current, slideToShow.content, halfHeight, availableWidth);
      findOptimalSize(translationTextRef.current, slideToShow.translation || '', halfHeight, availableWidth);
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
  }, [slideToShow, displayMode, fontSettings]);

  // Hide connection status badge after 4 seconds
  useEffect(() => {
    queueMicrotask(() => {
      setStatusVisible(true);
    });
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
    slideToShow?.media_type === 'video' || 
    slideToShow?.media_type === 'camera' || 
    slideToShow?.media_type === 'image';

  return (
    <main
      className="relative flex h-screen w-screen flex-col items-center justify-center overflow-hidden transition-all duration-300"
      style={{
        backgroundColor: slideToShow?.settings?.bgColor || fontSettings.background || '#0f172a',
        fontFamily: fontSettings.fontFamily || 'sans-serif',
      }}
    >
      {/* CSS Marquee Animation Keyframes */}
      <style>{`
        @keyframes marquee {
          0% { transform: translate3d(0, 0, 0); }
          100% { transform: translate3d(-100%, 0, 0); }
        }
        .animate-marquee {
          animation: marquee 16s linear infinite;
        }
      `}</style>

      {/* Live Alert Overlay Banner */}
      {activeAlert && (
        <div 
          className={`absolute left-8 right-8 z-[60] transition-all duration-500 ease-in-out ${
            activeAlert.position === 'top' ? 'top-8' : 'bottom-8'
          }`}
        >
          <div 
            className={`flex items-center gap-4 rounded-2xl border px-6 py-4 backdrop-blur-lg shadow-2xl ${
              activeAlert.type === 'nursery'
                ? 'bg-amber-950/70 border-amber-500/40 text-amber-200 shadow-[0_0_25px_rgba(245,158,11,0.25)]'
                : activeAlert.type === 'warning'
                  ? 'bg-red-950/70 border-red-500/40 text-red-200 shadow-[0_0_25px_rgba(239,68,68,0.25)]'
                  : 'bg-slate-950/70 border-slate-800 text-slate-200 shadow-[0_0_25px_rgba(0,0,0,0.5)]'
            }`}
          >
            <div className="flex items-center gap-2.5 shrink-0 font-sans">
              <AlertTriangle 
                className={`h-5 w-5 ${
                  activeAlert.type === 'nursery'
                    ? 'text-amber-400 animate-pulse'
                    : activeAlert.type === 'warning'
                      ? 'text-red-400 animate-bounce'
                      : 'text-slate-400'
                }`} 
              />
              <span className="text-[10px] font-black uppercase tracking-widest">
                {activeAlert.type === 'nursery' 
                  ? 'Nursery Call' 
                  : activeAlert.type === 'warning' 
                    ? 'Urgent Alert' 
                    : 'Announcement'}
              </span>
            </div>
            
            <div className="h-5 w-px bg-white/10 shrink-0" />
            
            <div className="flex-1 overflow-hidden relative">
              {activeAlert.type === 'general' && activeAlert.message.length > 50 ? (
                <div className="w-full overflow-hidden whitespace-nowrap">
                  <div className="inline-block animate-marquee pl-[100%] font-bold text-sm tracking-wide">
                    {activeAlert.message}
                  </div>
                </div>
              ) : (
                <p className="font-extrabold text-sm tracking-wide leading-relaxed">
                  {activeAlert.message}
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Blackout Overlay */}
      {fontSettings.blankMode === 'black' && (
        <div className="absolute inset-0 bg-black z-50 pointer-events-none transition-opacity duration-300" />
      )}

      {/* Logo Overlay */}
      {fontSettings.blankMode === 'logo' && (
        <div className="absolute inset-0 flex items-center justify-center z-20 pointer-events-none animate-fade-in">
          <div className="flex flex-col items-center justify-center p-8 rounded-full bg-slate-950/45 border border-white/5 backdrop-blur-md shadow-2xl">
            <Sparkles className="h-16 w-16 text-indigo-400 drop-shadow-[0_0_15px_rgba(129,140,248,0.3)] animate-pulse" />
          </div>
        </div>
      )}

      {/* Background Image Layer (full brightness when set to fill the screen) */}
      {slideToShow?.media_type === 'image' && slideToShow.media_url && (
        <img
          key={slideToShow.media_url}
          src={slideToShow.media_url}
          alt="Slide background"
          className={`absolute inset-0 w-full h-full object-cover z-0 pointer-events-none transition-opacity duration-300 ${
            slideToShow.media_fill || (slideToShow.elements?.length ?? 0) > 0 ? '' : 'brightness-[0.35] contrast-[1.1]'
          }`}
        />
      )}

      {/* 1. Background Video Layer */}
      {slideToShow?.media_type === 'video' && slideToShow.media_url && (
        <video
          key={slideToShow.media_url}
          src={slideToShow.media_url}
          autoPlay
          loop
          muted
          playsInline
          className={`absolute inset-0 w-full h-full object-cover z-0 pointer-events-none ${
            slideToShow.media_fill || (slideToShow.elements?.length ?? 0) > 0 ? '' : 'brightness-[0.35] contrast-[1.1] saturate-[0.8]'
          }`}
        />
      )}

      {/* 2. WebRTC Live Camera Stream Layer */}
      <video
        ref={cameraVideoRef}
        autoPlay
        playsInline
        muted
        className={`absolute inset-0 w-full h-full object-cover z-0 pointer-events-none transition-opacity duration-300 ${
          slideToShow?.media_fill || (slideToShow?.elements?.length ?? 0) > 0 ? '' : 'brightness-[0.35] contrast-[1.1]'
        } ${
          slideToShow?.media_type === 'camera' ? 'opacity-100' : 'opacity-0'
        }`}
      />

      {/* Free-placement elements layer (Phase 2) */}
      <SlideElementsLayer elements={slideToShow?.elements} fontFamily={fontSettings.fontFamily} />

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

      {/* Main Projection Canvas (hidden when media fills the screen) */}
      <div
        ref={containerRef}
        className={`flex h-full w-full flex-col select-none z-10 ${getVerticalAlignClass()} ${getHorizontalAlignClass()} ${(slideToShow?.media_fill && slideToShow?.media_url) || (slideToShow?.elements?.length ?? 0) > 0 ? 'hidden' : ''}`}
        style={{
          padding: `${fontSettings.margin * 1.5}rem`,
        }}
      >
        {!slideToShow ? (
          <div className="text-slate-500 text-lg">No slides loaded. Go to the dashboard to project.</div>
        ) : (
          <div 
            className={`flex flex-col gap-8 w-full ${getVerticalAlignClass()} ${getHorizontalAlignClass()} ${getTransitionClasses()} ${
              hasMediaBg 
                ? 'backdrop-blur-md bg-slate-950/45 border border-white/5 rounded-3xl p-10 max-w-4xl shadow-[0_0_50px_rgba(0,0,0,0.5)]'
                : ''
            } ${
              fontSettings.blankMode === 'clear' || fontSettings.blankMode === 'logo'
                ? 'opacity-0 scale-95 pointer-events-none'
                : ''
            }`}
          >
            {/* Primary Language Layer */}
            {(displayMode === 'primary' || displayMode === 'bilingual') && (
              <div
                ref={primaryTextRef}
                style={getTextStyle()}
                className={`text-white font-bold leading-snug whitespace-pre-line tracking-tight transition-all duration-150 ease-out max-w-full ${getTextAlignClass()}`}
              >
                {slideToShow.content}
              </div>
            )}

            {/* Language Divider for Bilingual display */}
            {displayMode === 'bilingual' && slideToShow.translation && (
              <div className={`border-t border-white/20 my-1 animate-fade-in ${getDividerAlignClass()}`} />
            )}

            {/* Translation Layer (direction follows the chosen language) */}
            {(displayMode === 'translation' || displayMode === 'bilingual') && slideToShow.translation && (
              <div
                ref={translationTextRef}
                dir={dirFor(fontSettings.translationLang)}
                style={getTextStyle()}
                className={`text-indigo-200 font-extrabold leading-normal whitespace-pre-line transition-all duration-150 ease-out max-w-full ${getTextAlignClass()}`}
              >
                {slideToShow.translation}
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
