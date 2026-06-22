'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useRealtimeSetlist, usePresentationsPortal } from '@/utils/sync';
import QuickFind, { type QuickItem } from '@/components/QuickFind';
import { resolveAuth, signOut } from '@/utils/auth';
import { dirFor } from '@/utils/languages';
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
  BookOpen,
  LayoutGrid,
  ExternalLink,
  Smartphone,
  MessageSquare,
  X,
  Pencil
} from 'lucide-react';

type AlertType = 'general' | 'nursery' | 'warning';
type AlertPosition = 'top' | 'bottom';

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
    setLiveSlide,
    addPresentationToSetlist,
    removePresentationFromSetlist,
    reorderSetlistItems,
    setBlankMode,
    prayerRequests,
    clearPrayerRequests,
    sendAlert,
    clearAlert,
    activeAlert,
  } = useRealtimeSetlist(setlistId);

  const [isShareModalOpen, setIsShareModalOpen] = useState(false);

  // Live Alert States
  const [alertText, setAlertText] = useState('');
  const [alertType, setAlertType] = useState<AlertType>('general');
  const [alertPosition, setAlertPosition] = useState<AlertPosition>('bottom');
  const [nurseryNumber, setNurseryNumber] = useState('');

  // Portal hook to list existing presentations
  const {
    presentations,
    loading: presentationsLoading
  } = usePresentationsPortal();

  const [searchQuery, setSearchQuery] = useState('');
  const [quickAddOpen, setQuickAddOpen] = useState(false);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); setQuickAddOpen((v) => !v); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  useEffect(() => {
    // Require a real session in cloud mode; localStorage profile only in demo mode
    const checkSession = async () => {
      const identity = await resolveAuth();
      if (!identity) {
        router.push('/login');
      }
    };
    void checkSession();
  }, [router]);

  if (!currentUser || !setlist) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-stone-50 text-stone-800">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-teal-400 border-t-transparent" />
      </div>
    );
  }

  const handleLogout = async () => {
    await signOut();
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
  // Everything addable (ignoring the inline filter) for the Quick Find palette.
  const addableItems: QuickItem[] = presentations
    .filter((pres) => !addedPresIds.has(pres.id))
    .map((pres) => ({ id: pres.id, title: pres.title, subtitle: `${pres.slides.length} slide${pres.slides.length === 1 ? '' : 's'}`, badge: (pres.settings?.tags || [])[0] }));

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
    <div className="h-screen bg-stone-50 font-sans text-stone-900 flex flex-col overflow-hidden">
      <div className="absolute top-0 right-0 h-[500px] w-[500px] rounded-full bg-sky-200/40 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-0 left-0 h-[500px] w-[500px] rounded-full bg-teal-200/40 blur-[120px] pointer-events-none" />

      {/* Header */}
      <header className="sticky top-0 z-30 border-b border-stone-200 bg-white/80 backdrop-blur-md px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            onClick={() => router.push('/dashboard')}
            className="flex items-center gap-1.5 rounded-xl bg-stone-100 border border-stone-200 hover:bg-stone-200 px-3 py-2 text-xs font-bold text-stone-500 hover:text-stone-800 transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Portal</span>
          </button>
          
          <div className="h-4 w-px bg-stone-100" />

          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-tr from-sky-500 to-teal-600 shadow-md shadow-teal-500/15">
              <BookOpen className="h-4 w-4 text-white" />
            </div>
            <div>
              <h1 className="font-bold text-sm leading-none">{setlist.title}</h1>
              <span className="text-[10px] text-stone-500 font-medium">Service Setlist Planner</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-4">
          {isDemoMode ? (
            <div className="flex items-center gap-1.5 rounded-full bg-amber-500/10 border border-amber-500/20 px-3 py-1 text-xs font-semibold text-amber-600">
              <AlertTriangle className="h-3.5 w-3.5" />
              <span>Demo Mode</span>
            </div>
          ) : (
            <div className="flex items-center gap-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 px-3 py-1 text-xs font-semibold text-emerald-600">
              <Check className="h-3.5 w-3.5" />
              <span>Live Synced</span>
            </div>
          )}

          <button
            onClick={openProjectorWindow}
            className="flex items-center gap-1.5 rounded-xl bg-stone-100 border border-stone-200 hover:bg-stone-200 px-4 py-2 text-xs font-bold text-sky-600 transition-all active:scale-[0.98]"
          >
            <Tv className="h-4 w-4" />
            <span>Projector</span>
            <ExternalLink className="h-3 w-3" />
          </button>

          <button
            onClick={() => window.open(`/projector/stage?setlist=${setlistId}`, '_blank')}
            className="flex items-center gap-1.5 rounded-xl bg-stone-100 border border-stone-200 hover:bg-stone-200 px-4 py-2 text-xs font-bold text-yellow-400 transition-all active:scale-[0.98]"
          >
            <LayoutGrid className="h-4 w-4" />
            <span>Stage Monitor</span>
            <ExternalLink className="h-3 w-3" />
          </button>

          <button
            onClick={() => window.open(`/dashboard/remote?setlist=${setlistId}`, '_blank')}
            className="flex items-center gap-1.5 rounded-xl bg-stone-100 border border-stone-200 hover:bg-stone-200 px-4 py-2 text-xs font-bold text-teal-600 transition-all active:scale-[0.98]"
          >
            <Smartphone className="h-4 w-4" />
            <span>Mobile Remote</span>
            <ExternalLink className="h-3 w-3" />
          </button>

          <button
            onClick={() => setIsShareModalOpen(true)}
            className="flex items-center gap-1.5 rounded-xl bg-gradient-to-tr from-pink-600/20 to-teal-600/20 border border-pink-500/30 hover:bg-pink-600/10 px-4 py-2 text-xs font-bold text-pink-300 transition-all active:scale-[0.98]"
          >
            <Users className="h-4 w-4 text-pink-400" />
            <span>Share Follower Link</span>
          </button>

          <div className="flex items-center gap-3 border-l border-stone-200 pl-4">
            <div className="text-right">
              <p className="text-xs font-bold text-stone-800">{currentUser.displayName}</p>
              <p className="text-[10px] text-stone-500">{currentUser.email}</p>
            </div>
            <button
              onClick={handleLogout}
              title="Sign Out"
              className="rounded-xl p-2 bg-stone-100 border border-stone-200 text-stone-500 hover:text-red-600 hover:bg-red-50 hover:border-red-200 transition-all"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </div>
      </header>

      {/* Workspace Grid */}
      <div className="flex-1 min-h-0 p-6 grid grid-cols-12 gap-6 overflow-hidden">
        
        {/* Left column: Setlist Items & Song Search */}
        <aside className="col-span-4 min-h-0 flex flex-col gap-6 overflow-y-auto pr-2">
          
          {/* Order Queue */}
          <section className="rounded-2xl border border-stone-200 bg-white p-5 backdrop-blur-md flex flex-col max-h-[50%]">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-stone-500 mb-4 flex justify-between items-center">
              <span>Presentation items</span>
              <span className="text-[10px] bg-stone-100 px-2 py-0.5 rounded-full text-stone-500">{setlist.items.length} blocks</span>
            </h2>

            <div className="flex-1 overflow-y-auto space-y-2.5 pr-1">
              {setlist.items.map((item, idx) => (
                <div 
                  key={item.id} 
                  className="flex items-center justify-between p-3 rounded-xl bg-white border border-stone-200 hover:border-stone-300 transition-all"
                >
                  <div className="overflow-hidden mr-3">
                    <span className="text-[10px] font-bold text-stone-500 block uppercase">{idx + 1} · {item.presentation?.slides?.length ?? 0} slides</span>
                    <p className="text-sm font-bold text-stone-800 truncate">{item.presentation?.title || 'Loading...'}</p>
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => router.push(`/dashboard?pres=${item.presentation_id}`)}
                      title="Edit this block's slides"
                      className="p-1.5 rounded-lg bg-stone-100 text-stone-500 hover:text-teal-600"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </button>
                    <button
                      onClick={() => handleMoveUp(idx)}
                      disabled={idx === 0}
                      className="p-1.5 rounded-lg bg-stone-100 text-stone-500 hover:text-stone-800 disabled:opacity-30 disabled:hover:text-stone-600"
                    >
                      <ArrowUp className="h-3.5 w-3.5" />
                    </button>
                    <button
                      onClick={() => handleMoveDown(idx)}
                      disabled={idx === setlist.items.length - 1}
                      className="p-1.5 rounded-lg bg-stone-100 text-stone-500 hover:text-stone-800 disabled:opacity-30 disabled:hover:text-stone-600"
                    >
                      <ArrowDown className="h-3.5 w-3.5" />
                    </button>
                    <button
                      onClick={() => removePresentationFromSetlist(item.id)}
                      className="p-1.5 rounded-lg bg-stone-100 text-stone-500 hover:text-red-600 ml-1.5 transition-colors"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              ))}

              {setlist.items.length === 0 && (
                <div className="text-center py-10 text-stone-400 text-xs border border-dashed border-stone-200 rounded-xl">
                  No blocks yet. Add songs or readings below to build this presentation.
                </div>
              )}
            </div>
          </section>

          {/* Add songs area */}
          <section className="rounded-2xl border border-stone-200 bg-white p-5 backdrop-blur-md flex-1 flex flex-col overflow-hidden">
            <div className="flex items-center justify-between gap-2 mb-2">
              <div className="flex items-center gap-2">
                <Plus className="h-4 w-4 text-teal-600" />
                <h2 className="text-xs font-semibold uppercase tracking-wider text-stone-700">Add songs &amp; readings</h2>
              </div>
              <button
                onClick={() => setQuickAddOpen(true)}
                className="flex items-center gap-1.5 rounded-lg bg-stone-100 border border-stone-200 hover:bg-stone-200 px-2.5 py-1.5 text-[11px] font-bold text-stone-600 transition-all"
              >
                <Search className="h-3.5 w-3.5" />Quick add
                <kbd className="hidden sm:inline text-[10px] font-bold text-stone-400 border border-stone-300 rounded px-1">⌘K</kbd>
              </button>
            </div>
            <p className="text-[11px] text-stone-500 mb-3">
              Pick from your Song Library, or{' '}
              <button onClick={() => router.push('/dashboard/liturgy')} className="font-bold text-sky-600 hover:underline">import a scripture reading</button>
              {' '}to add it to your library first.
            </p>

            <QuickFind
              open={quickAddOpen}
              onClose={() => setQuickAddOpen(false)}
              onSelect={(id) => addPresentationToSetlist(id)}
              items={addableItems}
              placeholder="Search songs to add…"
              hint="add"
            />

            <div className="relative mb-3.5">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-stone-400" />
              <input
                type="text"
                placeholder="Search presentations..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full rounded-xl border border-stone-200 bg-white py-2.5 pl-10 pr-4 text-xs text-stone-800 placeholder:text-stone-400 focus:border-teal-400 focus:outline-none"
              />
            </div>

            <div className="flex-1 overflow-y-auto space-y-2 pr-1">
              {presentationsLoading ? (
                <div className="flex justify-center py-6">
                  <div className="h-5 w-5 animate-spin rounded-full border-2 border-teal-400 border-t-transparent" />
                </div>
              ) : availablePres.length === 0 ? (
                <div className="text-[10px] text-stone-400 text-center py-6">No matching songs available.</div>
              ) : (
                availablePres.map((pres) => (
                  <div
                    key={pres.id}
                    onClick={() => addPresentationToSetlist(pres.id)}
                    className="group flex items-center justify-between p-2.5 rounded-xl border border-stone-200/40 hover:border-teal-300 bg-stone-50/20 hover:bg-white cursor-pointer transition-all duration-200"
                  >
                    <div className="overflow-hidden mr-2">
                      <p className="text-xs font-bold text-stone-700 group-hover:text-stone-900 transition-colors truncate">{pres.title}</p>
                      <span className="text-[9px] text-stone-400">{pres.slides.length} slides</span>
                    </div>
                    <Plus className="h-4 w-4 text-stone-400 group-hover:text-teal-600 group-hover:scale-110 transition-all" />
                  </div>
                ))
              )}
            </div>
          </section>

          {/* Live Alerts Section */}
          <section className="rounded-2xl border border-stone-200 bg-white p-5 backdrop-blur-md">
            <div className="flex items-center gap-2 mb-4 justify-between">
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-amber-600" />
                <h2 className="text-xs font-semibold uppercase tracking-wider text-stone-700">Live View Alerts</h2>
              </div>
              {activeAlert && (
                <span className="flex h-2 w-2 rounded-full bg-red-500 animate-pulse" />
              )}
            </div>

            <div className="space-y-4">
              {/* Nursery quick preset call */}
              <div>
                <label className="block text-xs text-stone-500 mb-1.5 font-medium">Quick Nursery Call</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="e.g. #304"
                    value={nurseryNumber}
                    onChange={(e) => setNurseryNumber(e.target.value)}
                    className="flex-1 rounded-xl border border-stone-200 bg-white py-2 px-3 text-xs text-stone-800 placeholder:text-stone-400 focus:border-teal-400 focus:outline-none"
                  />
                  <button
                    type="button"
                    disabled={!nurseryNumber.trim()}
                    onClick={() => {
                      const msg = `Nursery Alert: Child ${nurseryNumber.trim().startsWith('#') ? '' : '#'}${nurseryNumber.trim()}`;
                      sendAlert(msg, 'nursery', 'top');
                      setNurseryNumber('');
                    }}
                    className="rounded-xl bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/30 text-amber-350 px-3.5 text-xs font-bold transition-all active:scale-[0.98] disabled:opacity-30 disabled:pointer-events-none"
                  >
                    Call
                  </button>
                </div>
              </div>

              {/* Custom alert banner */}
              <div>
                <label className="block text-xs text-stone-500 mb-1.5 font-medium">Custom Alert Message</label>
                <textarea
                  placeholder="e.g. Please move vehicle with plate XYZ-123..."
                  value={alertText}
                  onChange={(e) => setAlertText(e.target.value)}
                  className="w-full h-16 rounded-xl border border-stone-200 bg-white p-2.5 text-xs text-stone-800 placeholder:text-stone-400 focus:border-teal-400 focus:outline-none resize-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] uppercase font-bold text-stone-500 mb-1">Alert Type</label>
                  <select
                    value={alertType}
                    onChange={(e) => setAlertType(e.target.value as AlertType)}
                    className="w-full rounded-xl border border-stone-200 bg-stone-50 px-2.5 py-1.5 text-[10px] font-bold text-stone-600 focus:outline-none"
                  >
                    <option value="general">General (Slate)</option>
                    <option value="nursery">Nursery (Amber)</option>
                    <option value="warning">Warning (Red)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] uppercase font-bold text-stone-500 mb-1">Position</label>
                  <select
                    value={alertPosition}
                    onChange={(e) => setAlertPosition(e.target.value as AlertPosition)}
                    className="w-full rounded-xl border border-stone-200 bg-stone-50 px-2.5 py-1.5 text-[10px] font-bold text-stone-600 focus:outline-none"
                  >
                    <option value="top">Top Screen</option>
                    <option value="bottom">Bottom Screen</option>
                  </select>
                </div>
              </div>

              <div className="flex gap-2 border-t border-stone-200 pt-3 mt-1">
                {activeAlert && (
                  <button
                    type="button"
                    onClick={() => {
                      clearAlert();
                      setAlertText('');
                    }}
                    className="flex-1 rounded-xl border border-red-500/20 hover:border-red-200 bg-red-50 text-red-600 py-2 text-xs font-bold transition-all active:scale-[0.98]"
                  >
                    Clear Alert
                  </button>
                )}
                <button
                  type="button"
                  disabled={!alertText.trim()}
                  onClick={() => {
                    sendAlert(alertText, alertType, alertPosition);
                    setAlertText('');
                  }}
                  className="flex-[2] rounded-xl bg-teal-600 hover:bg-teal-500 text-white py-2 text-xs font-bold transition-all active:scale-[0.98] disabled:opacity-30 disabled:pointer-events-none shadow-md shadow-teal-500/10"
                >
                  Broadcast Alert
                </button>
              </div>

              {activeAlert && (
                <div className={`mt-2 rounded-xl p-3 text-[10px] flex flex-col gap-1 border border-dashed ${
                  activeAlert.type === 'nursery' 
                    ? 'bg-amber-500/5 border-amber-500/30 text-amber-600' 
                    : activeAlert.type === 'warning'
                      ? 'bg-red-500/5 border-red-200 text-red-600'
                      : 'bg-white border-stone-200 text-stone-500'
                }`}>
                  <div className="flex justify-between items-center font-extrabold uppercase tracking-wide">
                    <span>Active Alert ({activeAlert.type})</span>
                    <span className="text-[8px] opacity-70">
                      {new Date(activeAlert.timestamp).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                    </span>
                  </div>
                  <p className="font-medium mt-0.5 leading-normal">{activeAlert.message}</p>
                </div>
              )}
            </div>
          </section>
        </aside>

        {/* Center Panel: Unified Slides queue scroll */}
        <section className="col-span-5 min-h-0 flex flex-col gap-4 overflow-y-auto pr-2">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-stone-500">Unified Presentation Flow</h2>
            <span className="text-xs text-stone-500">{allSlidesWithMeta.length} total slides</span>
          </div>

          <div className="space-y-6 pb-20">
            {setlist.items.map((item, itemIdx) => {
              const pres = item.presentation;
              if (!pres) return null;

              return (
                <div key={item.id} className="space-y-3">
                  <div className="sticky top-0 z-10 flex items-center justify-between bg-white/90 backdrop-blur px-3 py-2 rounded-xl border border-stone-200 shadow-sm">
                    <div className="flex items-center gap-2">
                      <span className="flex h-5 w-5 items-center justify-center rounded-lg bg-teal-50 border border-teal-200 text-[10px] font-bold text-teal-600">
                        {itemIdx + 1}
                      </span>
                      <h3 className="font-extrabold text-sm text-stone-900">{pres.title}</h3>
                    </div>
                    <span className="text-[10px] text-stone-500">{pres.slides.length} slides</span>
                  </div>

                  <div className="space-y-3 pl-2 border-l border-stone-200/50">
                    {pres.slides.map((slide) => {
                      const isLive = activeSlideId === slide.id;
                      return (
                        <div
                          key={slide.id}
                          onClick={() => setLiveSlide(slide.id)}
                          className={`group relative flex flex-col rounded-2xl border p-4.5 cursor-pointer transition-all duration-200 ${
                            isLive 
                              ? 'border-red-200 bg-red-50 shadow-[0_0_20px_rgba(239,68,68,0.05)]' 
                              : 'border-stone-200 bg-white hover:border-stone-300 hover:bg-stone-50'
                          }`}
                        >
                          <div className="flex items-center justify-between mb-2.5">
                            <span className="text-[10px] font-semibold text-stone-400">
                              Slide {slide.order_index + 1}
                            </span>
                            
                            <div className="flex items-center gap-2">
                              {isLive && (
                                <span className="flex items-center gap-1 rounded bg-red-500/10 border border-red-200 px-1.5 py-0.5 text-[9px] font-bold text-red-600 uppercase tracking-widest animate-pulse">
                                  Live
                                </span>
                              )}

                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  router.push(`/dashboard?pres=${item.presentation_id}&edit=${slide.id}`);
                                }}
                                title="Edit this slide"
                                className="flex items-center justify-center rounded-lg h-6 w-6 bg-stone-100 border border-stone-200 text-stone-500 hover:text-teal-600 hover:bg-stone-200 transition-all"
                              >
                                <Pencil className="h-3 w-3" />
                              </button>

                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setLiveSlide(slide.id);
                                }}
                                className={`flex items-center gap-1 rounded-lg px-2.5 py-0.5 text-[10px] font-bold transition-all ${
                                  isLive 
                                    ? 'bg-red-500 text-white shadow-md shadow-red-500/25 pointer-events-none'
                                    : 'bg-teal-600 hover:bg-teal-500 text-white shadow-md shadow-teal-500/15'
                                }`}
                              >
                                <Play className="h-3 w-3 fill-current" />
                                <span>{isLive ? 'LIVE' : 'Go Live'}</span>
                              </button>
                            </div>
                          </div>

                          <div className="grid grid-cols-2 gap-4">
                            <div className="text-xs font-semibold text-stone-800 whitespace-pre-line leading-relaxed">
                              {slide.content}
                            </div>
                            {slide.translation && (
                              <div dir={dirFor(pres.settings?.translationLang)} className="text-xs font-bold text-sky-600 whitespace-pre-line leading-relaxed border-l border-stone-200 pr-4 font-serif">
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
              <div className="text-center py-24 text-stone-400 text-sm border border-dashed border-stone-200 rounded-2xl">
                Select and add songs from the sidebar to plan this service order.
              </div>
            )}
          </div>
        </section>

        {/* Right Panel: Settings, Collaborators & Live Preview */}
        <aside className="col-span-3 min-h-0 flex flex-col gap-6 overflow-y-auto">
          
          {/* Live Preview Box */}
          <section className="rounded-2xl border border-stone-200 bg-white p-5 backdrop-blur-md">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-stone-500 mb-3">Live Projector Preview</h2>
            
            <div 
              className="rounded-xl aspect-video relative flex flex-col justify-center items-center text-center p-3 border border-stone-200 shadow-inner overflow-hidden"
              style={{
                backgroundColor: '#0f172a',
                fontFamily: 'Inter, sans-serif'
              }}
            >
              {activeSlide ? (
                <div className="w-full space-y-1">
                  <p className="text-[8px] font-bold text-stone-900 leading-normal truncate">{activeSlide.content.split('\n')[0]}</p>
                  {activeSlide.translation && (
                    <p dir={dirFor(setlist.items[0]?.presentation?.settings?.translationLang)} className="text-[8px] font-bold text-sky-600 leading-normal font-serif truncate">{activeSlide.translation.split('\n')[0]}</p>
                  )}
                </div>
              ) : (
                <div className="text-[10px] text-stone-400">Screen is currently empty</div>
              )}
            </div>
          </section>

          {/* Quick Screen Overlays */}
          <section className="rounded-2xl border border-stone-200 bg-white p-5 backdrop-blur-md">
            <div className="flex items-center gap-2 mb-4">
              <Settings className="h-4 w-4 text-teal-600" />
              <h2 className="text-xs font-semibold uppercase tracking-wider text-stone-700">Quick Screen Overlays</h2>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => setBlankMode(setlist.settings?.blankMode === 'black' ? 'none' : 'black')}
                className={`rounded-xl py-2 px-2 text-[10px] font-bold border transition-all ${
                  setlist.settings?.blankMode === 'black'
                    ? 'bg-red-50 border-red-500/50 text-red-600'
                    : 'bg-white border-stone-200 text-stone-500 hover:border-stone-300'
                }`}
              >
                ⚫ Blackout
              </button>
              <button
                onClick={() => setBlankMode(setlist.settings?.blankMode === 'clear' ? 'none' : 'clear')}
                className={`rounded-xl py-2 px-2 text-[10px] font-bold border transition-all ${
                  setlist.settings?.blankMode === 'clear'
                    ? 'bg-teal-50 border-teal-300 text-sky-600'
                    : 'bg-white border-stone-200 text-stone-500 hover:border-stone-300'
                }`}
              >
                🔍 Clear Text
              </button>
              <button
                onClick={() => setBlankMode(setlist.settings?.blankMode === 'logo' ? 'none' : 'logo')}
                className={`rounded-xl py-2 px-2 text-[10px] font-bold border col-span-2 transition-all ${
                  setlist.settings?.blankMode === 'logo'
                    ? 'bg-emerald-50 border-emerald-500/50 text-emerald-600'
                    : 'bg-white border-stone-200 text-stone-500 hover:border-stone-300'
                }`}
              >
                ✨ Show Logo Placeholder
              </button>
            </div>
          </section>

          {/* Collaborator Presence */}
          <section className="rounded-2xl border border-stone-200 bg-white p-5 backdrop-blur-md flex-1 flex flex-col overflow-hidden">
            <div className="flex items-center gap-2 mb-4 justify-between">
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4 text-emerald-600" />
                <h2 className="text-xs font-semibold uppercase tracking-wider text-stone-700">Live Presenters</h2>
              </div>
              <span className="flex h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
            </div>

            <div className="flex-1 overflow-y-auto space-y-3 pr-1">
              {presenceUsers.map((user) => (
                <div 
                  key={user.id} 
                  className="flex items-center gap-2.5 p-2 rounded-xl bg-white border border-stone-200/30 hover:border-stone-300 transition-colors"
                >
                  <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-gradient-to-tr from-sky-500/30 to-teal-600/30 text-[10px] font-bold text-sky-600 border border-teal-200">
                    {user.displayName.substring(0, 2).toUpperCase()}
                  </div>
                  <div className="overflow-hidden">
                    <p className="text-xs font-bold truncate text-stone-800">{user.displayName}</p>
                    <p className="text-[10px] text-stone-500 truncate">{user.email}</p>
                  </div>
                </div>
              ))}
              {presenceUsers.length === 0 && (
                <p className="text-xs text-stone-400 text-center py-4">No other presenters online.</p>
              )}
            </div>
          </section>

          {/* Live Congregation Requests card */}
          <section className="rounded-2xl border border-stone-200 bg-white p-5 backdrop-blur-md flex-1 flex flex-col overflow-hidden min-h-[220px]">
            <div className="flex items-center gap-2 mb-4 justify-between">
              <div className="flex items-center gap-2">
                <MessageSquare className="h-4 w-4 text-pink-400" />
                <h2 className="text-xs font-semibold uppercase tracking-wider text-stone-700">Congregation Feed</h2>
              </div>
              {prayerRequests.length > 0 && (
                <button
                  onClick={clearPrayerRequests}
                  className="text-[9px] font-bold text-stone-500 hover:text-red-600 transition-colors"
                >
                  Clear Feed
                </button>
              )}
            </div>

            <div className="flex-1 overflow-y-auto space-y-2.5 pr-1">
              {prayerRequests.map((req) => (
                <div 
                  key={req.id} 
                  className="p-3 rounded-xl bg-white border border-pink-950/20 hover:border-pink-900/30 transition-all text-xs"
                >
                  <div className="flex justify-between items-center mb-1">
                    <span className="font-extrabold text-pink-400 truncate">{req.name}</span>
                    <span className="text-[9px] text-stone-400">
                      {new Date(req.timestamp).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                  <p className="text-stone-600 leading-normal font-medium whitespace-pre-line">{req.text}</p>
                </div>
              ))}
              {prayerRequests.length === 0 && (
                <p className="text-[10px] text-stone-400 text-center py-8">No live messages or prayer requests yet.</p>
              )}
            </div>
          </section>

        </aside>
      </div>

      {/* Share Follower Link Modal */}
      {isShareModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-md animate-fade-in">
          <div className="w-full max-w-md rounded-3xl border border-stone-200 bg-stone-50 p-6 shadow-2xl relative ring-1 ring-white/10">
            <button
              onClick={() => setIsShareModalOpen(false)}
              className="absolute top-4 right-4 rounded-full p-1.5 bg-stone-100 border border-stone-200 text-stone-500 hover:text-stone-900 transition-colors"
            >
              <X className="h-4 w-4" />
            </button>

            <div className="flex flex-col items-center text-center space-y-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-pink-600/10 border border-pink-500/20 text-pink-400 shadow-md">
                <Users className="h-6 w-6" />
              </div>
              <div>
                <h3 className="font-extrabold text-base text-stone-900">Share Congregation Link</h3>
                <p className="text-stone-500 text-xs mt-1">Let members follow the setlist in real-time on their phones.</p>
              </div>

              {/* QR Code */}
              <div className="bg-white p-3.5 rounded-2xl border border-stone-200 shadow-inner">
                <img 
                  src={`https://api.qrserver.com/v1/create-qr-code/?size=250x250&color=7c3aed&data=${encodeURIComponent(
                    typeof window !== 'undefined' ? `${window.location.origin}/follow?setlist=${setlistId}` : ''
                  )}`} 
                  alt="Scan to follow" 
                  className="h-48 w-48 object-contain" 
                />
              </div>

              {/* Follower link input wrapper */}
              <div className="w-full space-y-2 text-left">
                <span className="block text-[10px] text-stone-500 uppercase tracking-widest font-extrabold">Follower Web Link</span>
                <div className="flex gap-2">
                  <input
                    type="text"
                    readOnly
                    value={typeof window !== 'undefined' ? `${window.location.origin}/follow?setlist=${setlistId}` : ''}
                    className="flex-1 rounded-xl border border-stone-200 bg-white py-2.5 px-3.5 text-xs text-sky-600 font-medium focus:outline-none"
                  />
                  <button
                    onClick={() => {
                      const link = typeof window !== 'undefined' ? `${window.location.origin}/follow?setlist=${setlistId}` : '';
                      navigator.clipboard.writeText(link);
                      alert('Congregation follower link copied to clipboard!');
                    }}
                    className="rounded-xl bg-teal-600 hover:bg-teal-500 px-4 text-xs font-bold text-white transition-colors"
                  >
                    Copy
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function SetlistPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-stone-50 text-stone-800">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-teal-400 border-t-transparent" />
        </div>
      }
    >
      <SetlistContent />
    </Suspense>
  );
}
