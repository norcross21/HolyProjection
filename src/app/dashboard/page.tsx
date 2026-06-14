'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useRealtimePresentation, usePresentationsPortal } from '@/utils/sync';
import { supabase } from '@/utils/supabase';
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
  Plus,
  ArrowLeft,
  ChevronRight,
  Languages,
  LayoutGrid
} from 'lucide-react';

function DashboardContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const presId = searchParams.get('pres');

  // Hook for Listing & Creating Presentations
  const {
    presentations,
    loading: portalLoading,
    isDemoMode: portalDemoMode,
    createNewPresentation,
  } = usePresentationsPortal();

  // Hook for Active Presentation Sync (Only runs if presId is set)
  const {
    isDemoMode,
    presentation,
    activeSlideId,
    presenceUsers,
    currentUser,
    loading: presLoading,
    updateSlideContent,
    setLiveSlide,
    updateSettings,
  } = useRealtimePresentation(presId || '');

  const [selectedSlideId, setSelectedSlideId] = useState<string | null>(null);
  const [newPresTitle, setNewPresTitle] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [isClient, setIsClient] = useState(false);

  // Set default selected slide when presentation loads
  useEffect(() => {
    if (presentation.slides.length > 0) {
      setSelectedSlideId(presentation.slides[0].id);
    }
  }, [presentation.slides]);

  useEffect(() => {
    setIsClient(true);
    // Redirect to login if user identity is not set
    const user = localStorage.getItem('holyproj_user');
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session && !user) {
        router.push('/login');
      }
    };
    checkSession();
  }, [router]);

  if (!isClient || !currentUser) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-950 text-slate-200">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-violet-500 border-t-transparent" />
      </div>
    );
  }

  const handleLogout = async () => {
    localStorage.removeItem('holyproj_user');
    await supabase.auth.signOut();
    router.push('/login');
  };

  const handleCreatePres = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPresTitle.trim()) return;
    setIsCreating(true);
    const newId = await createNewPresentation(newPresTitle);
    setIsCreating(false);
    setNewPresTitle('');
    if (newId) {
      router.push(`/dashboard?pres=${newId}`);
    }
  };

  const openProjectorWindow = () => {
    if (presId) {
      window.open(`/projector?pres=${presId}`, '_blank');
    }
  };

  const selectedSlide = presentation.slides.find((s) => s.id === selectedSlideId);

  // ----------------------------------------------------
  // Portal View (No presentation selected)
  // ----------------------------------------------------
  if (!presId) {
    return (
      <div className="min-h-screen bg-slate-950 font-sans text-slate-100 flex flex-col relative overflow-hidden">
        {/* Glow effects */}
        <div className="absolute top-0 right-0 h-[600px] w-[600px] rounded-full bg-indigo-900/10 blur-[130px] pointer-events-none" />
        <div className="absolute bottom-0 left-0 h-[500px] w-[500px] rounded-full bg-violet-900/5 blur-[120px] pointer-events-none" />

        <header className="sticky top-0 z-30 border-b border-slate-900 bg-slate-950/70 backdrop-blur-md px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-tr from-violet-600 to-indigo-600 shadow-md shadow-indigo-500/20">
              <Sparkles className="h-5 w-5 text-white" />
            </div>
            <div>
              <h1 className="font-bold text-lg leading-none">HolyProjection</h1>
              <span className="text-xs text-slate-500 font-medium">Presenter Portal</span>
            </div>
          </div>

          <div className="flex items-center gap-4">
            {portalDemoMode ? (
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

            <div className="flex items-center gap-3 border-l border-slate-900 pl-4">
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

        <main className="flex-1 max-w-5xl w-full mx-auto p-6 md:py-12 flex flex-col gap-8 z-10">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-2xl md:text-3xl font-extrabold tracking-tight bg-gradient-to-r from-white via-slate-100 to-slate-400 bg-clip-text text-transparent">
                Worship Presentations
              </h2>
              <p className="text-slate-400 text-sm mt-1">Select a presentation to edit, collaborate, and project live.</p>
            </div>
            
            <button
              onClick={() => router.push('/dashboard/import')}
              className="flex items-center justify-center gap-1.5 rounded-xl bg-violet-600/10 border border-violet-500/20 hover:bg-violet-600/20 px-4 py-2.5 text-xs font-bold text-violet-300 transition-all active:scale-[0.98] self-start sm:self-auto"
            >
              <Sparkles className="h-4 w-4 text-violet-400" />
              <span>AI Bulk Importer</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-start">
            
            {/* Create Presentation Form Card */}
            <section className="rounded-2xl border border-slate-900 bg-slate-900/35 p-6 backdrop-blur-xl ring-1 ring-white/5 shadow-xl md:col-span-1">
              <div className="flex items-center gap-2 mb-4">
                <Plus className="h-5 w-5 text-violet-400" />
                <h3 className="font-bold text-white text-base">New Presentation</h3>
              </div>
              
              <form onSubmit={handleCreatePres} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
                    Title / Song Name
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Amazing Grace"
                    value={newPresTitle}
                    onChange={(e) => setNewPresTitle(e.target.value)}
                    className="w-full rounded-xl border border-slate-800 bg-slate-950/60 py-3 px-4 text-sm text-slate-100 placeholder:text-slate-600 focus:border-violet-500 focus:outline-none focus:ring-1 focus:ring-violet-500 transition-all"
                  />
                </div>

                <button
                  type="submit"
                  disabled={isCreating}
                  className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 py-3 font-semibold text-white shadow-lg shadow-indigo-500/20 active:scale-[0.98] transition-all disabled:opacity-50"
                >
                  {isCreating ? (
                    <div className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  ) : (
                    <span>Create Presentation</span>
                  )}
                </button>
              </form>
            </section>

            {/* Presentations list */}
            <div className="md:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-4">
              {portalLoading ? (
                <div className="col-span-2 py-20 flex justify-center">
                  <div className="h-8 w-8 animate-spin rounded-full border-4 border-violet-500 border-t-transparent" />
                </div>
              ) : presentations.length === 0 ? (
                <div className="col-span-2 border border-dashed border-slate-800 rounded-2xl py-16 text-center text-slate-500 text-sm">
                  No presentations created yet. Use the sidebar to create one!
                </div>
              ) : (
                presentations.map((pres) => (
                  <div
                    key={pres.id}
                    onClick={() => router.push(`/dashboard?pres=${pres.id}`)}
                    className="group rounded-2xl border border-slate-900 bg-slate-900/10 p-5 hover:border-violet-500/40 hover:bg-slate-900/20 cursor-pointer shadow-lg transition-all duration-200"
                  >
                    <div className="flex justify-between items-start gap-4 mb-3">
                      <h4 className="font-bold text-slate-100 group-hover:text-white transition-colors truncate">
                        {pres.title}
                      </h4>
                      <ChevronRight className="h-4 w-4 text-slate-600 group-hover:text-violet-400 group-hover:translate-x-0.5 transition-all" />
                    </div>
                    
                    <div className="flex items-center gap-3 text-xs text-slate-500">
                      <span className="bg-slate-900 px-2.5 py-1 rounded-full border border-slate-800">
                        {pres.slides.length} {pres.slides.length === 1 ? 'slide' : 'slides'}
                      </span>
                      <span className="flex items-center gap-1.5 font-medium text-slate-500">
                        <LayoutGrid className="h-3.5 w-3.5" />
                        Bilingual
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>

          </div>
        </main>
      </div>
    );
  }

  // ----------------------------------------------------
  // Dashboard Panel View (Presentation Selected)
  // ----------------------------------------------------
  return (
    <div className="min-h-screen bg-slate-950 font-sans text-slate-100 flex flex-col">
      <div className="absolute top-0 right-0 h-[500px] w-[500px] rounded-full bg-indigo-900/10 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-0 left-0 h-[500px] w-[500px] rounded-full bg-violet-900/5 blur-[120px] pointer-events-none" />

      {/* Header */}
      <header className="sticky top-0 z-30 border-b border-slate-900 bg-slate-950/70 backdrop-blur-md px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            onClick={() => router.push('/dashboard')}
            className="flex items-center gap-1.5 rounded-xl bg-slate-900 border border-slate-800 hover:bg-slate-800 px-3 py-2 text-xs font-bold text-slate-400 hover:text-slate-200 transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Portal</span>
          </button>
          
          <div className="h-4 w-px bg-slate-800" />

          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-tr from-violet-600 to-indigo-600 shadow-md shadow-indigo-500/20">
              <Sparkles className="h-4 w-4 text-white" />
            </div>
            <div>
              <h1 className="font-bold text-sm leading-none">HolyProjection</h1>
              <span className="text-[10px] text-slate-500 font-medium">Presenter Dashboard</span>
            </div>
          </div>
        </div>

        {/* Action controls */}
        <div className="flex items-center gap-4">
          {isDemoMode ? (
            <div className="flex items-center gap-1.5 rounded-full bg-amber-500/10 border border-amber-500/20 px-3 py-1 text-xs font-semibold text-amber-400">
              <AlertTriangle className="h-3.5 w-3.5" />
              <span>Demo Mode</span>
            </div>
          ) : (
            <div className="flex items-center gap-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 px-3 py-1 text-xs font-semibold text-emerald-400">
              <Check className="h-3.5 w-3.5" />
              <span>Live Synced</span>
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

          <div className="flex items-center gap-3 border-l border-slate-900 pl-4">
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

      {/* Main presentation dashboard workspace */}
      <div className="flex-1 p-6 grid grid-cols-12 gap-6 overflow-hidden max-h-[calc(100vh-73px)]">
        
        {/* Left Panel: Settings & Collaborators */}
        <aside className="col-span-3 flex flex-col gap-6 overflow-y-auto pr-2">
          
          {/* Active Presentation Title */}
          <section className="rounded-2xl border border-slate-900 bg-slate-900/20 p-5 backdrop-blur-md">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-3">Active Presentation</h2>
            <h3 className="text-xl font-bold text-white mb-2">{presentation.title}</h3>
            <p className="text-xs text-slate-400">ID: <code className="bg-slate-950 px-1 py-0.5 rounded text-indigo-400">{presentation.id}</code></p>
          </section>

          {/* Settings Section */}
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

          {/* Collaborator Presence indicator */}
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

        {/* Center Panel: Slide Queue flow */}
        <section className="col-span-6 flex flex-col gap-4 overflow-y-auto pr-2">
          {presLoading ? (
            <div className="flex-1 flex items-center justify-center py-20">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-violet-500 border-t-transparent" />
            </div>
          ) : (
            <>
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
                      <div className="flex items-center justify-between mb-3">
                        <span className="text-xs font-semibold text-slate-500">
                          Slide {slide.order_index + 1}
                        </span>
                        
                        <div className="flex items-center gap-2">
                          {isLive && (
                            <span className="flex items-center gap-1 rounded bg-red-500/10 border border-red-500/30 px-1.5 py-0.5 text-[10px] font-bold text-red-400 uppercase tracking-widest animate-pulse">
                              Live
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
            </>
          )}
        </section>

        {/* Right Panel: Live Text Editor */}
        <aside className="col-span-3 flex flex-col gap-6 overflow-y-auto">
          {selectedSlide ? (
            <div className="rounded-2xl border border-slate-900 bg-slate-900/20 p-5 backdrop-blur-md flex flex-col h-full">
              <div className="flex items-center gap-2 mb-4">
                <Edit3 className="h-4 w-4 text-indigo-400" />
                <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-300">Live Editor</h2>
              </div>

              <div className="flex-1 flex flex-col gap-4">
                <div className="flex-1 flex flex-col">
                  <label className="block text-xs text-slate-400 mb-1.5 font-medium">English Lyrics (Primary)</label>
                  <textarea
                    value={selectedSlide.content}
                    onChange={(e) => updateSlideContent(
                      selectedSlide.id, 
                      e.target.value, 
                      selectedSlide.translation,
                      selectedSlide.media_type,
                      selectedSlide.media_url
                    )}
                    placeholder="Enter slide content..."
                    className="w-full flex-1 rounded-xl border border-slate-800 bg-slate-950/60 p-3 text-xs leading-relaxed text-slate-200 placeholder:text-slate-600 focus:border-violet-500 focus:outline-none resize-none font-sans"
                  />
                </div>

                <div className="flex-1 flex flex-col">
                  <div className="flex items-center gap-1.5 mb-1.5">
                    <Languages className="h-3.5 w-3.5 text-indigo-400" />
                    <label className="block text-xs text-slate-400 font-medium">Arabic Translation (Linked)</label>
                  </div>
                  <textarea
                    dir="rtl"
                    value={selectedSlide.translation || ''}
                    onChange={(e) => updateSlideContent(
                      selectedSlide.id, 
                      selectedSlide.content, 
                      e.target.value,
                      selectedSlide.media_type,
                      selectedSlide.media_url
                    )}
                    placeholder="أدخل الترجمة هنا..."
                    className="w-full flex-1 rounded-xl border border-slate-800 bg-slate-950/60 p-3 text-xs leading-relaxed text-slate-200 placeholder:text-slate-600 focus:border-violet-500 focus:outline-none resize-none font-serif"
                  />
                </div>

                {/* Background Media Settings */}
                <div className="border-t border-slate-900 pt-4 space-y-3">
                  <label className="block text-xs text-slate-400 font-medium">Slide Media Background</label>
                  <select
                    value={selectedSlide.media_type || 'none'}
                    onChange={(e) => updateSlideContent(
                      selectedSlide.id, 
                      selectedSlide.content, 
                      selectedSlide.translation, 
                      e.target.value as any, 
                      selectedSlide.media_url
                    )}
                    className="w-full rounded-xl border border-slate-800 bg-slate-950 px-3 py-2 text-xs font-medium text-slate-300 focus:border-violet-500 focus:outline-none"
                  >
                    <option value="none">Color Theme (Default)</option>
                    <option value="video">Abstract Video Loop</option>
                    <option value="camera">Live Camera Overlay (WebRTC)</option>
                  </select>

                  {selectedSlide.media_type === 'video' && (
                    <div className="space-y-2 animate-fade-in">
                      <input
                        type="text"
                        placeholder="Paste MP4 Video Loop URL"
                        value={selectedSlide.media_url || ''}
                        onChange={(e) => updateSlideContent(
                          selectedSlide.id, 
                          selectedSlide.content, 
                          selectedSlide.translation, 
                          'video', 
                          e.target.value
                        )}
                        className="w-full rounded-xl border border-slate-800 bg-slate-950/60 py-2 px-3 text-xs text-slate-200 placeholder:text-slate-650 focus:border-violet-500 focus:outline-none"
                      />
                      <button
                        type="button"
                        onClick={() => updateSlideContent(
                          selectedSlide.id, 
                          selectedSlide.content, 
                          selectedSlide.translation, 
                          'video', 
                          'https://assets.mixkit.co/videos/preview/mixkit-nebula-in-outer-space-40348-large.mp4'
                        )}
                        className="text-[10px] font-bold text-indigo-400 hover:text-indigo-300 transition-colors"
                      >
                        ⚡ Load Demo Space Nebular Loop
                      </button>
                    </div>
                  )}
                </div>

                <div className="mt-2 rounded-xl bg-slate-950/40 border border-slate-800 p-3 text-[10px] text-slate-500 flex items-start gap-2">
                  <Edit3 className="h-3.5 w-3.5 text-indigo-500 shrink-0 mt-0.5" />
                  <span>
                    <strong>Collaborative Live Editing</strong>: Typos fixed here propagate instantly to the live projector and other connected boards.
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

export default function DashboardPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-slate-950 text-slate-200">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-violet-500 border-t-transparent" />
        </div>
      }
    >
      <DashboardContent />
    </Suspense>
  );
}
