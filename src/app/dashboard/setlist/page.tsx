'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useRealtimeSetlist, usePresentationsPortal } from '@/utils/sync';
import { supabase } from '@/utils/supabase';
import { 
  ArrowLeft, 
  Tv, 
  Settings, 
  Users, 
  Play, 
  Check, 
  AlertTriangle,
  LogOut,
  Plus,
  ArrowUp,
  ArrowDown,
  Trash2,
  Search,
  Layers,
  BookOpen,
  LayoutGrid,
  ChevronRight,
  ExternalLink,
  Sparkles,
  Smartphone
} from 'lucide-react';

function SetlistContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const setlistId = searchParams.get('id') || '';

  // Setlist hook
  const {
    isDemoMode,
    setlist,
    activeSlideId,
    presenceUsers,
    currentUser,
    loading: setlistLoading,
    setLiveSlide,
    addPresentationToSetlist,
    removePresentationFromSetlist,
    reorderSetlistItems,
    setBlankMode
  } = useRealtimeSetlist(setlistId);

  // Portal hook to list existing presentations
  const {
    presentations,
    loading: presentationsLoading
  } = usePresentationsPortal();

  const [searchQuery, setSearchQuery] = useState('');
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
    // Redirect if not logged in
    const user = localStorage.getItem('holyproj_user');
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session && !user) {
        router.push('/login');
      }
    };
    checkSession();
  }, [router]);

  if (!isClient || !currentUser || !setlist) {
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

  const handleMoveUp = (index: number) => {
    if (index === 0) return;
    const itemIds = setlist.items.map((i) => i.id);
    const temp = itemIds[index];
    itemIds[index] = itemIds[index - 1];
    itemIds[index - 1] = temp;
    reorderSetlistItems(itemIds);
  };

  const handleMoveDown = (index: number) => {
    if (index === setlist.items.length - 1) return;
    const itemIds = setlist.items.map((i) => i.id);
    const temp = itemIds[index];
    itemIds[index] = itemIds[index + 1];
    itemIds[index + 1] = temp;
    reorderSetlistItems(itemIds);
  };

  const openProjectorWindow = () => {
    window.open(`/projector?setlist=${setlistId}`, '_blank');
  };

  // Filter out presentations already in the setlist
  const addedPresIds = new Set(setlist.items.map((i) => i.presentation_id));
  const availablePres = presentations.filter(
    (pres) => !addedPresIds.has(pres.id) && pres.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Compile all slides from all presentations in setlist order
  const allSlidesWithMeta = setlist.items.flatMap((item, itemIdx) => {
    const pres = item.presentation;
    if (!pres || !pres.slides) return [];
    return pres.slides.map((slide) => ({
      ...slide,
      presentationTitle: pres.title,
      presentationIndex: itemIdx,
      itemId: item.id
    }));
  });

  const activeSlide = allSlidesWithMeta.find((s) => s.id === activeSlideId);

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
              <BookOpen className="h-4 w-4 text-white" />
            </div>
            <div>
              <h1 className="font-bold text-sm leading-none">{setlist.title}</h1>
              <span className="text-[10px] text-slate-500 font-medium">Service Setlist Planner</span>
            </div>
          </div>
        </div>

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
            <span>Projector</span>
            <ExternalLink className="h-3 w-3" />
          </button>

          <button
            onClick={() => window.open(`/projector/stage?setlist=${setlistId}`, '_blank')}
            className="flex items-center gap-1.5 rounded-xl bg-slate-900 border border-slate-800 hover:bg-slate-800 px-4 py-2 text-xs font-bold text-yellow-400 transition-all active:scale-[0.98]"
          >
            <LayoutGrid className="h-4 w-4" />
            <span>Stage Monitor</span>
            <ExternalLink className="h-3 w-3" />
          </button>

          <button
            onClick={() => window.open(`/dashboard/remote?setlist=${setlistId}`, '_blank')}
            className="flex items-center gap-1.5 rounded-xl bg-slate-900 border border-slate-800 hover:bg-slate-800 px-4 py-2 text-xs font-bold text-violet-400 transition-all active:scale-[0.98]"
          >
            <Smartphone className="h-4 w-4" />
            <span>Mobile Remote</span>
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

      {/* Workspace Grid */}
      <div className="flex-1 p-6 grid grid-cols-12 gap-6 overflow-hidden max-h-[calc(100vh-73px)]">
        
        {/* Left column: Setlist Items & Song Search */}
        <aside className="col-span-4 flex flex-col gap-6 overflow-y-auto pr-2">
          
          {/* Order Queue */}
          <section className="rounded-2xl border border-slate-900 bg-slate-900/20 p-5 backdrop-blur-md flex flex-col max-h-[50%]">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-4 flex justify-between items-center">
              <span>Service Songs Queue</span>
              <span className="text-[10px] bg-slate-900 px-2 py-0.5 rounded-full text-slate-400">{setlist.items.length} items</span>
            </h2>

            <div className="flex-1 overflow-y-auto space-y-2.5 pr-1">
              {setlist.items.map((item, idx) => (
                <div 
                  key={item.id} 
                  className="flex items-center justify-between p-3 rounded-xl bg-slate-950/50 border border-slate-900 hover:border-slate-800 transition-all"
                >
                  <div className="overflow-hidden mr-3">
                    <span className="text-[10px] font-bold text-slate-500 block uppercase">Song {idx + 1}</span>
                    <p className="text-sm font-bold text-slate-200 truncate">{item.presentation?.title || 'Loading...'}</p>
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => handleMoveUp(idx)}
                      disabled={idx === 0}
                      className="p-1.5 rounded-lg bg-slate-900 text-slate-400 hover:text-slate-200 disabled:opacity-30 disabled:hover:text-slate-400"
                    >
                      <ArrowUp className="h-3.5 w-3.5" />
                    </button>
                    <button
                      onClick={() => handleMoveDown(idx)}
                      disabled={idx === setlist.items.length - 1}
                      className="p-1.5 rounded-lg bg-slate-900 text-slate-400 hover:text-slate-200 disabled:opacity-30 disabled:hover:text-slate-400"
                    >
                      <ArrowDown className="h-3.5 w-3.5" />
                    </button>
                    <button
                      onClick={() => removePresentationFromSetlist(item.id)}
                      className="p-1.5 rounded-lg bg-slate-900 text-slate-500 hover:text-red-400 ml-1.5 transition-colors"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              ))}

              {setlist.items.length === 0 && (
                <div className="text-center py-10 text-slate-650 text-xs border border-dashed border-slate-900 rounded-xl">
                  No songs in this setlist. Add some songs below!
                </div>
              )}
            </div>
          </section>

          {/* Add songs area */}
          <section className="rounded-2xl border border-slate-900 bg-slate-900/20 p-5 backdrop-blur-md flex-1 flex flex-col overflow-hidden">
            <div className="flex items-center gap-2 mb-4">
              <Plus className="h-4 w-4 text-violet-400" />
              <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-300">Add Songs to Setlist</h2>
            </div>

            <div className="relative mb-3.5">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-550" />
              <input
                type="text"
                placeholder="Search presentations..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full rounded-xl border border-slate-850 bg-slate-950/60 py-2.5 pl-10 pr-4 text-xs text-slate-200 placeholder:text-slate-650 focus:border-violet-500 focus:outline-none"
              />
            </div>

            <div className="flex-1 overflow-y-auto space-y-2 pr-1">
              {presentationsLoading ? (
                <div className="flex justify-center py-6">
                  <div className="h-5 w-5 animate-spin rounded-full border-2 border-violet-500 border-t-transparent" />
                </div>
              ) : availablePres.length === 0 ? (
                <div className="text-[10px] text-slate-600 text-center py-6">No matching songs available.</div>
              ) : (
                availablePres.map((pres) => (
                  <div
                    key={pres.id}
                    onClick={() => addPresentationToSetlist(pres.id)}
                    className="group flex items-center justify-between p-2.5 rounded-xl border border-slate-900/40 hover:border-violet-500/30 bg-slate-950/20 hover:bg-slate-900/10 cursor-pointer transition-all duration-200"
                  >
                    <div className="overflow-hidden mr-2">
                      <p className="text-xs font-bold text-slate-300 group-hover:text-white transition-colors truncate">{pres.title}</p>
                      <span className="text-[9px] text-slate-600">{pres.slides.length} slides</span>
                    </div>
                    <Plus className="h-4 w-4 text-slate-600 group-hover:text-violet-400 group-hover:scale-110 transition-all" />
                  </div>
                ))
              )}
            </div>
          </section>
        </aside>

        {/* Center Panel: Unified Slides queue scroll */}
        <section className="col-span-5 flex flex-col gap-4 overflow-y-auto pr-2">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-400">Unified Presentation Flow</h2>
            <span className="text-xs text-slate-500">{allSlidesWithMeta.length} total slides</span>
          </div>

          <div className="space-y-6 pb-20">
            {setlist.items.map((item, itemIdx) => {
              const pres = item.presentation;
              if (!pres) return null;

              return (
                <div key={item.id} className="space-y-3">
                  <div className="sticky top-0 z-10 flex items-center justify-between bg-slate-950/80 backdrop-blur px-3 py-2 rounded-xl border border-slate-900 shadow-sm">
                    <div className="flex items-center gap-2">
                      <span className="flex h-5 w-5 items-center justify-center rounded-lg bg-violet-600/20 border border-violet-500/20 text-[10px] font-bold text-violet-400">
                        {itemIdx + 1}
                      </span>
                      <h3 className="font-extrabold text-sm text-slate-100">{pres.title}</h3>
                    </div>
                    <span className="text-[10px] text-slate-500">{pres.slides.length} slides</span>
                  </div>

                  <div className="space-y-3 pl-2 border-l border-slate-900/50">
                    {pres.slides.map((slide) => {
                      const isLive = activeSlideId === slide.id;
                      return (
                        <div
                          key={slide.id}
                          onClick={() => setLiveSlide(slide.id)}
                          className={`group relative flex flex-col rounded-2xl border p-4.5 cursor-pointer transition-all duration-200 ${
                            isLive 
                              ? 'border-red-500/40 bg-red-950/5 shadow-[0_0_20px_rgba(239,68,68,0.05)]' 
                              : 'border-slate-900 bg-slate-900/10 hover:border-slate-800 hover:bg-slate-900/20'
                          }`}
                        >
                          <div className="flex items-center justify-between mb-2.5">
                            <span className="text-[10px] font-semibold text-slate-550">
                              Slide {slide.order_index + 1}
                            </span>
                            
                            <div className="flex items-center gap-2">
                              {isLive && (
                                <span className="flex items-center gap-1 rounded bg-red-500/10 border border-red-500/30 px-1.5 py-0.5 text-[9px] font-bold text-red-400 uppercase tracking-widest animate-pulse">
                                  Live
                                </span>
                              )}

                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setLiveSlide(slide.id);
                                }}
                                className={`flex items-center gap-1 rounded-lg px-2.5 py-0.5 text-[10px] font-bold transition-all ${
                                  isLive 
                                    ? 'bg-red-500 text-white shadow-md shadow-red-500/25 pointer-events-none'
                                    : 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-md shadow-indigo-500/20'
                                }`}
                              >
                                <Play className="h-3 w-3 fill-current" />
                                <span>{isLive ? 'LIVE' : 'Go Live'}</span>
                              </button>
                            </div>
                          </div>

                          <div className="grid grid-cols-2 gap-4">
                            <div className="text-xs font-semibold text-slate-200 whitespace-pre-line leading-relaxed">
                              {slide.content}
                            </div>
                            {slide.translation && (
                              <div dir="rtl" className="text-xs font-bold text-indigo-300 whitespace-pre-line leading-relaxed border-l border-slate-900/80 pr-4 font-serif">
                                {slide.translation}
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}

            {setlist.items.length === 0 && (
              <div className="text-center py-24 text-slate-600 text-sm border border-dashed border-slate-900 rounded-2xl">
                Select and add songs from the sidebar to plan this service order.
              </div>
            )}
          </div>
        </section>

        {/* Right Panel: Settings, Collaborators & Live Preview */}
        <aside className="col-span-3 flex flex-col gap-6 overflow-y-auto">
          
          {/* Live Preview Box */}
          <section className="rounded-2xl border border-slate-900 bg-slate-900/20 p-5 backdrop-blur-md">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-3">Live Projector Preview</h2>
            
            <div 
              className="rounded-xl aspect-video relative flex flex-col justify-center items-center text-center p-3 border border-slate-900 shadow-inner overflow-hidden"
              style={{
                backgroundColor: '#0f172a',
                fontFamily: 'Inter, sans-serif'
              }}
            >
              {activeSlide ? (
                <div className="w-full space-y-1">
                  <p className="text-[8px] font-bold text-white leading-normal truncate">{activeSlide.content.split('\n')[0]}</p>
                  {activeSlide.translation && (
                    <p dir="rtl" className="text-[8px] font-bold text-indigo-300 leading-normal font-serif truncate">{activeSlide.translation.split('\n')[0]}</p>
                  )}
                </div>
              ) : (
                <div className="text-[10px] text-slate-600">Screen is currently empty</div>
              )}
            </div>
          </section>

          {/* Quick Screen Overlays */}
          <section className="rounded-2xl border border-slate-900 bg-slate-900/20 p-5 backdrop-blur-md">
            <div className="flex items-center gap-2 mb-4">
              <Settings className="h-4 w-4 text-violet-400" />
              <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-300">Quick Screen Overlays</h2>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => setBlankMode(setlist.settings?.blankMode === 'black' ? 'none' : 'black')}
                className={`rounded-xl py-2 px-2 text-[10px] font-bold border transition-all ${
                  setlist.settings?.blankMode === 'black'
                    ? 'bg-red-950/40 border-red-500/50 text-red-400'
                    : 'bg-slate-950/60 border-slate-900 text-slate-400 hover:border-slate-800'
                }`}
              >
                ⚫ Blackout
              </button>
              <button
                onClick={() => setBlankMode(setlist.settings?.blankMode === 'clear' ? 'none' : 'clear')}
                className={`rounded-xl py-2 px-2 text-[10px] font-bold border transition-all ${
                  setlist.settings?.blankMode === 'clear'
                    ? 'bg-indigo-950/40 border-indigo-500/50 text-indigo-400'
                    : 'bg-slate-950/60 border-slate-900 text-slate-400 hover:border-slate-800'
                }`}
              >
                🔍 Clear Text
              </button>
              <button
                onClick={() => setBlankMode(setlist.settings?.blankMode === 'logo' ? 'none' : 'logo')}
                className={`rounded-xl py-2 px-2 text-[10px] font-bold border col-span-2 transition-all ${
                  setlist.settings?.blankMode === 'logo'
                    ? 'bg-emerald-950/40 border-emerald-500/50 text-emerald-400'
                    : 'bg-slate-950/60 border-slate-900 text-slate-400 hover:border-slate-800'
                }`}
              >
                ✨ Show Logo Placeholder
              </button>
            </div>
          </section>

          {/* Collaborator Presence */}
          <section className="rounded-2xl border border-slate-900 bg-slate-900/20 p-5 backdrop-blur-md flex-1 flex flex-col overflow-hidden">
            <div className="flex items-center gap-2 mb-4 justify-between">
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4 text-emerald-400" />
                <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-300">Live Presenters</h2>
              </div>
              <span className="flex h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
            </div>

            <div className="flex-1 overflow-y-auto space-y-3 pr-1">
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
                <p className="text-xs text-slate-650 text-center py-4">No other presenters online.</p>
              )}
            </div>
          </section>

        </aside>

      </div>
    </div>
  );
}

export default function SetlistPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-slate-950 text-slate-200">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-violet-500 border-t-transparent" />
        </div>
      }
    >
      <SetlistContent />
    </Suspense>
  );
}
