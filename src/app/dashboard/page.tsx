'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useRealtimePresentation } from '@/utils/sync';
import { 
  Sparkles, 
  Tv, 
  Settings, 
  Users, 
  Edit3, 
  ExternalLink, 
  Play, 
  Check, 
  AlertTriangle,
  LogOut,
  ChevronRight,
  Languages
} from 'lucide-react';

export default function DashboardPage() {
  const router = useRouter();
  const [activePresId, setActivePresId] = useState('demo-presentation-1');
  
  // Custom sync hook
  const {
    isDemoMode,
    presentation,
    activeSlideId,
    presenceUsers,
    currentUser,
    updateSlideContent,
    setLiveSlide,
    updateSettings,
  } = useRealtimePresentation(activePresId);

  const [selectedSlideId, setSelectedSlideId] = useState<string | null>('slide-1');
  const [isClient, setIsClient] = useState(false);

  // Get active slide for edit panel
  const selectedSlide = presentation.slides.find((s) => s.id === selectedSlideId);

  useEffect(() => {
    setIsClient(true);
    // Redirect to login if user identity is not set
    const user = localStorage.getItem('holyproj_user');
    if (!user) {
      router.push('/login');
    }
  }, [router]);

  if (!isClient || !currentUser) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-950 text-slate-200">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-violet-500 border-t-transparent" />
      </div>
    );
  }

  const handleLogout = () => {
    localStorage.removeItem('holyproj_user');
    router.push('/login');
  };

  const openProjectorWindow = () => {
    window.open(`/projector?pres=${activePresId}`, '_blank');
  };

  return (
    <div className="min-h-screen bg-slate-950 font-sans text-slate-100 flex flex-col">
      {/* Glow effects */}
      <div className="absolute top-0 right-0 h-[500px] w-[500px] rounded-full bg-indigo-900/10 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-0 left-0 h-[500px] w-[500px] rounded-full bg-violet-900/5 blur-[120px] pointer-events-none" />

      {/* Header bar */}
      <header className="sticky top-0 z-30 border-b border-slate-900 bg-slate-950/70 backdrop-blur-md px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-tr from-violet-600 to-indigo-600 shadow-md shadow-indigo-500/20">
            <Sparkles className="h-5 w-5 text-white" />
          </div>
          <div>
            <h1 className="font-bold text-lg leading-none">HolyProjection</h1>
            <span className="text-xs text-slate-500 font-medium">Control Dashboard</span>
          </div>
        </div>

        {/* Sync Mode and Projector Launch */}
        <div className="flex items-center gap-4">
          {isDemoMode ? (
            <div className="flex items-center gap-1.5 rounded-full bg-amber-500/10 border border-amber-500/20 px-3 py-1 text-xs font-semibold text-amber-400">
              <AlertTriangle className="h-3.5 w-3.5" />
              <span>Demo Mode</span>
            </div>
          ) : (
            <div className="flex items-center gap-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 px-3 py-1 text-xs font-semibold text-emerald-400">
              <Check className="h-3.5 w-3.5" />
              <span>Connected to Supabase</span>
            </div>
          )}

          <button
            onClick={openProjectorWindow}
            className="flex items-center gap-1.5 rounded-xl bg-slate-900 border border-slate-800 hover:bg-slate-800 px-4 py-2 text-xs font-bold text-indigo-300 transition-all active:scale-[0.98]"
          >
            <Tv className="h-4 w-4" />
            <span>Launch Live Projector</span>
            <ExternalLink className="h-3 w-3" />
          </button>

          <div className="flex items-center gap-3 border-l border-slate-950 pl-4">
            <div className="text-right">
              <p className="text-xs font-bold text-slate-200">{currentUser.displayName}</p>
              <p className="text-[10px] text-slate-500">{currentUser.email}</p>
            </div>
            <button
              onClick={handleLogout}
              title="Sign Out"
              className="rounded-xl p-2 bg-slate-900 border border-slate-800 text-slate-400 hover:text-red-400 hover:bg-red-950/20 hover:border-red-900/30 transition-all"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </div>
      </header>

      {/* Main dashboard content */}
      <div className="flex-1 p-6 grid grid-cols-12 gap-6 overflow-hidden max-h-[calc(100vh-73px)]">
        
        {/* Left Side: Presentation Settings & Presence (Columns: 3) */}
        <aside className="col-span-3 flex flex-col gap-6 overflow-y-auto pr-2">
          {/* Active Project/Song Details */}
          <section className="rounded-2xl border border-slate-900 bg-slate-900/20 p-5 backdrop-blur-md">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-3">Active Presentation</h2>
            <h3 className="text-xl font-bold text-white mb-2">{presentation.title}</h3>
            <p className="text-xs text-slate-400 mb-4">ID: <code className="bg-slate-950 px-1 py-0.5 rounded text-indigo-400">{presentation.id}</code></p>
          </section>

          {/* Settings Panel */}
          <section className="rounded-2xl border border-slate-900 bg-slate-900/20 p-5 backdrop-blur-md">
            <div className="flex items-center gap-2 mb-4">
              <Settings className="h-4 w-4 text-violet-400" />
              <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-300">Live Settings</h2>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs text-slate-400 mb-1.5">Background Theme</label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={presentation.settings.background}
                    onChange={(e) => updateSettings({ background: e.target.value })}
                    className="h-8 w-12 rounded border border-slate-800 bg-transparent cursor-pointer"
                  />
                  <code className="text-xs text-slate-400">{presentation.settings.background}</code>
                </div>
              </div>

              <div>
                <label className="block text-xs text-slate-400 mb-1.5">Font Family</label>
                <select
                  value={presentation.settings.fontFamily}
                  onChange={(e) => updateSettings({ fontFamily: e.target.value })}
                  className="w-full rounded-xl border border-slate-800 bg-slate-950 px-3 py-2 text-xs font-medium text-slate-300 focus:border-violet-500 focus:outline-none"
                >
                  <option value="Inter">Inter (Sans)</option>
                  <option value="Georgia">Georgia (Serif)</option>
                  <option value="system-ui">System Default</option>
                  <option value="Courier New">Monospace</option>
                </select>
              </div>

              <div>
                <div className="flex justify-between text-xs text-slate-400 mb-1.5">
                  <span>Layout Margins</span>
                  <span>{presentation.settings.margin} units</span>
                </div>
                <input
                  type="range"
                  min="2"
                  max="12"
                  value={presentation.settings.margin}
                  onChange={(e) => updateSettings({ margin: Number(e.target.value) })}
                  className="w-full accent-violet-600 bg-slate-800 h-1.5 rounded-lg appearance-none cursor-pointer"
                />
              </div>
            </div>
          </section>

          {/* Multiplayer Presence Panel */}
          <section className="rounded-2xl border border-slate-900 bg-slate-900/20 p-5 backdrop-blur-md flex-1">
            <div className="flex items-center gap-2 mb-4 justify-between">
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4 text-emerald-400" />
                <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-300">Collaborators</h2>
              </div>
              <span className="flex h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
            </div>

            <div className="space-y-3">
              {presenceUsers.map((user) => (
                <div 
                  key={user.id} 
                  className="flex items-center gap-2.5 p-2 rounded-xl bg-slate-950/40 border border-slate-900/30 hover:border-slate-800/40 transition-colors"
                >
                  <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-gradient-to-tr from-violet-600/30 to-indigo-600/30 text-[10px] font-bold text-indigo-300 border border-indigo-500/20">
                    {user.displayName.substring(0, 2).toUpperCase()}
                  </div>
                  <div className="overflow-hidden">
                    <p className="text-xs font-bold truncate text-slate-200">{user.displayName}</p>
                    <p className="text-[10px] text-slate-500 truncate">{user.email}</p>
                  </div>
                </div>
              ))}
              {presenceUsers.length === 0 && (
                <p className="text-xs text-slate-600 text-center py-4">No other presenters online.</p>
              )}
            </div>
          </section>
        </aside>

        {/* Center: Slide Grid Manager (Columns: 6) */}
        <section className="col-span-6 flex flex-col gap-4 overflow-y-auto pr-2">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-400">Presentation Slides Flow</h2>
            <span className="text-xs text-slate-500">{presentation.slides.length} slides</span>
          </div>

          <div className="space-y-4">
            {presentation.slides.map((slide) => {
              const isLive = activeSlideId === slide.id;
              const isSelected = selectedSlideId === slide.id;

              return (
                <div
                  key={slide.id}
                  onClick={() => setSelectedSlideId(slide.id)}
                  className={`group relative flex flex-col rounded-2xl border p-5 cursor-pointer transition-all duration-200 ${
                    isLive 
                      ? 'border-red-500/40 bg-red-950/5 shadow-[0_0_20px_rgba(239,68,68,0.05)]' 
                      : isSelected
                        ? 'border-violet-500/40 bg-slate-900/40'
                        : 'border-slate-900 bg-slate-900/10 hover:border-slate-800 hover:bg-slate-900/20'
                  }`}
                >
                  {/* Indicators */}
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs font-semibold text-slate-500">
                      Slide {slide.order_index + 1}
                    </span>
                    
                    <div className="flex items-center gap-2">
                      {isLive && (
                        <span className="flex items-center gap-1 rounded bg-red-500/10 border border-red-500/30 px-1.5 py-0.5 text-[10px] font-bold text-red-400 uppercase tracking-widest animate-pulse">
                          Live on Screen
                        </span>
                      )}

                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setLiveSlide(slide.id);
                        }}
                        className={`flex items-center gap-1 rounded-lg px-3 py-1 text-xs font-bold transition-all ${
                          isLive 
                            ? 'bg-red-500 text-white shadow-md shadow-red-500/25 pointer-events-none'
                            : 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-md shadow-indigo-500/20'
                        }`}
                      >
                        <Play className="h-3.5 w-3.5 fill-current" />
                        <span>{isLive ? 'LIVE' : 'Go Live'}</span>
                      </button>
                    </div>
                  </div>

                  {/* Core Lyrics Text */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="text-sm font-semibold text-slate-200 whitespace-pre-line leading-relaxed">
                      {slide.content}
                    </div>
                    {slide.translation && (
                      <div dir="rtl" className="text-sm font-bold text-indigo-300 whitespace-pre-line leading-relaxed border-l border-slate-900/80 pr-4 font-serif">
                        {slide.translation}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* Right Side: Live Editor Panel (Columns: 3) */}
        <aside className="col-span-3 flex flex-col gap-6 overflow-y-auto">
          {selectedSlide ? (
            <div className="rounded-2xl border border-slate-900 bg-slate-900/20 p-5 backdrop-blur-md flex flex-col h-full">
              <div className="flex items-center gap-2 mb-4">
                <Edit3 className="h-4 w-4 text-indigo-400" />
                <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-300">Live Editor</h2>
              </div>

              <div className="flex-1 flex flex-col gap-4">
                {/* Editor English Lyrics */}
                <div className="flex-1 flex flex-col">
                  <label className="block text-xs text-slate-400 mb-1.5 font-medium">English Lyrics (Primary)</label>
                  <textarea
                    value={selectedSlide.content}
                    onChange={(e) => updateSlideContent(selectedSlide.id, e.target.value, selectedSlide.translation)}
                    placeholder="Enter slide content..."
                    className="w-full flex-1 rounded-xl border border-slate-800 bg-slate-950/60 p-3 text-xs leading-relaxed text-slate-200 placeholder:text-slate-600 focus:border-violet-500 focus:outline-none resize-none font-sans"
                  />
                </div>

                {/* Editor Translation (Arabic) */}
                <div className="flex-1 flex flex-col">
                  <div className="flex items-center gap-1.5 mb-1.5">
                    <Languages className="h-3.5 w-3.5 text-indigo-400" />
                    <label className="block text-xs text-slate-400 font-medium">Arabic Translation (Linked)</label>
                  </div>
                  <textarea
                    dir="rtl"
                    value={selectedSlide.translation || ''}
                    onChange={(e) => updateSlideContent(selectedSlide.id, selectedSlide.content, e.target.value)}
                    placeholder="أدخل الترجمة هنا..."
                    className="w-full flex-1 rounded-xl border border-slate-800 bg-slate-950/60 p-3 text-xs leading-relaxed text-slate-200 placeholder:text-slate-600 focus:border-violet-500 focus:outline-none resize-none font-serif"
                  />
                </div>

                <div className="mt-2 rounded-xl bg-slate-950/40 border border-slate-800 p-3 text-[10px] text-slate-500 flex items-start gap-2">
                  <Edit3 className="h-3.5 w-3.5 text-indigo-500 shrink-0 mt-0.5" />
                  <span>
                    <strong>Collaborative Live Editing</strong>: Typos fixed in this box propagate instantly to all projector views and other presenter boards in real time without screen refresh.
                  </span>
                </div>
              </div>
            </div>
          ) : (
            <div className="rounded-2xl border border-slate-900 bg-slate-900/20 p-5 text-center text-slate-500 flex items-center justify-center flex-1">
              Select a slide to load the Live Editor.
            </div>
          )}
        </aside>

      </div>
    </div>
  );
}
