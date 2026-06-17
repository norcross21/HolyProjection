'use client';

import { useState, useEffect, useRef, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useRealtimePresentation, usePresentationsPortal, useSetlistsPortal } from '@/utils/sync';
import { resolveAuth, signOut, AuthIdentity } from '@/utils/auth';
import { LANGUAGES, dirFor, DEFAULT_TRANSLATION_LANG } from '@/utils/languages';
import MediaLibrary from '@/components/MediaLibrary';
import SlideDesigner from '@/components/SlideDesigner';
import SlidePreview from '@/components/SlidePreview';
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
  LayoutGrid,
  BookOpen,
  FileText,
  Upload,
  Smartphone,
  MessageSquare,
  X,
  Trash2,
  Layers,
  Copy
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
    deletePresentation,
  } = usePresentationsPortal();

  // Hook for Active Presentation Sync (Only runs if presId is set)
  const {
    isDemoMode,
    presentation,
    activeSlideId,
    presenceUsers,
    loading: presLoading,
    updateSlideContent,
    updateSlideElements,
    updateSlideSettings,
    addSlide,
    duplicateSlide,
    reorderSlides,
    deleteSlide,
    setSlideFill,
    setLiveSlide,
    updateSettings,
    setBlankMode,
    prayerRequests,
    clearPrayerRequests,
    sendAlert,
    clearAlert,
    activeAlert,
  } = useRealtimePresentation(presId || '');

  const [selectedSlideId, setSelectedSlideId] = useState<string | null>(null);
  const [newPresTitle, setNewPresTitle] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [isClient, setIsClient] = useState(false);
  const [authUser, setAuthUser] = useState<AuthIdentity | null>(null);
  const [designingSlideId, setDesigningSlideId] = useState<string | null>(null);
  const dragIndexRef = useRef<number | null>(null);

  const handleReorderDrop = (toIndex: number) => {
    const from = dragIndexRef.current;
    dragIndexRef.current = null;
    if (from === null || from === toIndex) return;
    const ids = presentation.slides.map((s) => s.id);
    const [moved] = ids.splice(from, 1);
    ids.splice(toIndex, 0, moved);
    reorderSlides(ids);
  };
  const [isLegacyDragging, setIsLegacyDragging] = useState(false);
  const [activeTab, setActiveTab] = useState<'presentations' | 'setlists'>('presentations');
  const [newSetlistTitle, setNewSetlistTitle] = useState('');
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [screenTab, setScreenTab] = useState<'projector' | 'stage' | 'follow'>('follow');
  const [copied, setCopied] = useState(false);
  const [isTranslating, setIsTranslating] = useState(false);

  // Live Alert States
  const [alertText, setAlertText] = useState('');
  const [alertType, setAlertType] = useState<'general' | 'nursery' | 'warning'>('general');
  const [alertPosition, setAlertPosition] = useState<'top' | 'bottom'>('bottom');
  const [nurseryNumber, setNurseryNumber] = useState('');

  const translationLang = presentation.settings.translationLang || DEFAULT_TRANSLATION_LANG;

  const handleTranslateSlide = async (langOverride?: string) => {
    if (!selectedSlide || !selectedSlide.content.trim()) return;
    const target = langOverride || translationLang;
    setIsTranslating(true);
    try {
      const response = await fetch('/api/translate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: selectedSlide.content, targetLang: target }),
      });
      const data = await response.json();
      if (data.success && data.translation) {
        updateSlideContent(
          selectedSlide.id,
          selectedSlide.content,
          data.translation,
          selectedSlide.media_type,
          selectedSlide.media_url
        );
      } else {
        alert(data.error || 'Failed to translate lyrics.');
      }
    } catch (err) {
      console.error(err);
      alert('Translation failed. Please try again.');
    } finally {
      setIsTranslating(false);
    }
  };

  // Hook for Listing & Creating Setlists
  const {
    setlists,
    loading: setlistsLoading,
    createNewSetlist,
    deleteSetlist
  } = useSetlistsPortal();

  // Keep a valid slide selected: preserve the current selection if it still
  // exists (so editing/adding doesn't yank focus back to slide 1), otherwise
  // fall back to the first slide.
  useEffect(() => {
    setSelectedSlideId((prev) => {
      if (prev && presentation.slides.some((s) => s.id === prev)) return prev;
      return presentation.slides[0]?.id ?? null;
    });
  }, [presentation.slides]);

  useEffect(() => {
    setIsClient(true);
    // Require a real session in cloud mode; localStorage profile only in demo mode
    const checkSession = async () => {
      const identity = await resolveAuth();
      if (!identity) {
        router.push('/login');
      } else {
        setAuthUser(identity);
      }
    };
    checkSession();
  }, [router]);

  useEffect(() => {
    const linkId = 'google-fonts-dashboard';
    if (!document.getElementById(linkId)) {
      const link = document.createElement('link');
      link.id = linkId;
      link.rel = 'stylesheet';
      link.href = 'https://fonts.googleapis.com/css2?family=Montserrat:wght@400;700;900&family=Outfit:wght@450;700;900&family=Lora:ital,wght@0,600;0,700;1,600&family=Playfair+Display:ital,wght@0,700;1,700&display=swap';
      document.head.appendChild(link);
    }
  }, []);

  if (!isClient || !authUser) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-950 text-slate-200">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-violet-500 border-t-transparent" />
      </div>
    );
  }

  const handleLogout = async () => {
    await signOut();
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

  const handleDeletePresentation = async (e: React.MouseEvent, id: string, title: string) => {
    e.stopPropagation();
    if (!confirm(`Delete "${title}"? This permanently removes it and its slides.`)) return;
    const ok = await deletePresentation(id);
    if (!ok) alert('Could not delete. Make sure you are signed in and that delete is enabled in the database.');
  };

  const handleDeleteSetlist = async (e: React.MouseEvent, id: string, title: string) => {
    e.stopPropagation();
    if (!confirm(`Delete setlist "${title}"?`)) return;
    const ok = await deleteSetlist(id);
    if (!ok) alert('Could not delete. Make sure you are signed in and that delete is enabled in the database.');
  };

  const handleCreateSetlist = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSetlistTitle.trim()) return;
    setIsCreating(true);
    const newId = await createNewSetlist(newSetlistTitle);
    setIsCreating(false);
    setNewSetlistTitle('');
    if (newId) {
      router.push(`/dashboard/setlist?id=${newId}`);
    }
  };

  const importFile = async (file: File) => {
    setIsCreating(true);
    const reader = new FileReader();
    
    reader.onload = async (event) => {
      try {
        const text = event.target?.result as string;
        const title = file.name.substring(0, file.name.lastIndexOf('.')) || file.name;
        
        let slides: { content: string; translation?: string }[] = [];
        
        if (file.name.endsWith('.json')) {
          const parsed = JSON.parse(text);
          if (Array.isArray(parsed)) {
            slides = parsed.map(s => ({
              content: s.content || s.text || '',
              translation: s.translation || s.arabic || ''
            }));
          } else if (parsed.slides && Array.isArray(parsed.slides)) {
            slides = parsed.slides.map((s: any) => ({
              content: s.content || s.text || '',
              translation: s.translation || s.arabic || ''
            }));
          }
        } else {
          // Plain text .txt files
          const chunks = text.split(/\n\s*\n/);
          slides = chunks.map(chunk => ({
            content: chunk.trim(),
            translation: ''
          })).filter(s => s.content.length > 0);
        }
        
        if (slides.length === 0) {
          alert('Could not parse any slides from this file.');
          setIsCreating(false);
          return;
        }
        
        const newId = await createNewPresentation(title, slides);
        if (newId) {
          router.push(`/dashboard?pres=${newId}`);
        }
      } catch (err) {
        console.error(err);
        alert('Failed to parse file. Make sure it is a clean text file or valid JSON.');
      } finally {
        setIsCreating(false);
      }
    };
    
    reader.readAsText(file);
  };

  const handleLegacyFileImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    importFile(files[0]);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsLegacyDragging(true);
  };

  const handleDragLeave = () => {
    setIsLegacyDragging(false);
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsLegacyDragging(false);
    const files = e.dataTransfer.files;
    if (!files || files.length === 0) return;
    importFile(files[0]);
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
            {portalDemoMode && (
              <div className="flex items-center gap-1.5 rounded-full bg-amber-500/10 border border-amber-500/20 px-3 py-1 text-xs font-semibold text-amber-400">
                <AlertTriangle className="h-3.5 w-3.5" />
                <span>Demo Mode</span>
              </div>
            )}

            <div className="flex items-center gap-3 border-l border-slate-900 pl-4">
              <div className="text-right">
                <p className="text-xs font-bold text-slate-200">{authUser.displayName}</p>
                <p className="text-[10px] text-slate-500">{authUser.email}</p>
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
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-900 pb-6">
            <div>
              <h2 className="text-2xl md:text-3xl font-extrabold tracking-tight bg-gradient-to-r from-white via-slate-100 to-slate-400 bg-clip-text text-transparent">
                Worship Portal
              </h2>
              <p className="text-slate-400 text-sm mt-1">Manage individual song presentations or plan full service setlists.</p>
            </div>
            
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
              {/* Tab Toggles */}
              <div className="flex items-center gap-1.5 bg-slate-900/60 p-1.5 rounded-xl border border-slate-800">
                <button
                  onClick={() => setActiveTab('presentations')}
                  className={`rounded-lg px-4 py-2 text-xs font-bold transition-all ${
                    activeTab === 'presentations'
                      ? 'bg-violet-600 text-white shadow-md'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  Songs / Readings
                </button>
                <button
                  onClick={() => setActiveTab('setlists')}
                  className={`rounded-lg px-4 py-2 text-xs font-bold transition-all ${
                    activeTab === 'setlists'
                      ? 'bg-violet-600 text-white shadow-md'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  Service Setlists
                </button>
              </div>

              {activeTab === 'presentations' && (
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => router.push('/dashboard/liturgy')}
                    className="flex items-center justify-center gap-1.5 rounded-xl bg-indigo-600/10 border border-indigo-500/20 hover:bg-indigo-600/20 px-4 py-2.5 text-xs font-bold text-indigo-300 transition-all active:scale-[0.98]"
                  >
                    <BookOpen className="h-4 w-4 text-indigo-400" />
                    <span>Liturgy Importer</span>
                  </button>

                  <button
                    onClick={() => router.push('/dashboard/import')}
                    className="flex items-center justify-center gap-1.5 rounded-xl bg-violet-600/10 border border-violet-500/20 hover:bg-violet-600/20 px-4 py-2.5 text-xs font-bold text-violet-300 transition-all active:scale-[0.98]"
                  >
                    <Sparkles className="h-4 w-4 text-violet-400" />
                    <span>AI Bulk Importer</span>
                  </button>
                </div>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-start">
            
            {activeTab === 'presentations' ? (
              <>
                {/* Left Column: Create & Import */}
                <div className="md:col-span-1 flex flex-col gap-6">
                  {/* Create Presentation Form Card */}
                  <section className="rounded-2xl border border-slate-900 bg-slate-900/35 p-6 backdrop-blur-xl ring-1 ring-white/5 shadow-xl">
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

                  {/* Legacy Presentation Importer Card */}
                  <section className="rounded-2xl border border-slate-900 bg-slate-900/35 p-6 backdrop-blur-xl ring-1 ring-white/5 shadow-xl">
                    <div className="flex items-center gap-2 mb-4">
                      <Upload className="h-5 w-5 text-indigo-400" />
                      <h3 className="font-bold text-white text-base">Legacy Importer</h3>
                    </div>

                    <div
                      onDragOver={handleDragOver}
                      onDragLeave={handleDragLeave}
                      onDrop={handleDrop}
                      onClick={() => document.getElementById('legacy-file-input')?.click()}
                      className={`border-2 border-dashed rounded-2xl p-6 text-center cursor-pointer transition-all duration-200 ${
                        isLegacyDragging
                          ? 'border-violet-500 bg-violet-950/15 shadow-md shadow-violet-500/10'
                          : 'border-slate-800 hover:border-violet-500/40 bg-slate-950/40 hover:bg-slate-950/60'
                      }`}
                    >
                      <input
                        type="file"
                        id="legacy-file-input"
                        onChange={handleLegacyFileImport}
                        accept=".txt,.json"
                        className="hidden"
                      />
                      {isCreating ? (
                        <div className="flex flex-col items-center justify-center gap-2">
                          <div className="h-6 w-6 animate-spin rounded-full border-2 border-violet-500 border-t-transparent" />
                          <span className="text-[10px] text-slate-400">Importing presentation...</span>
                        </div>
                      ) : (
                        <div className="flex flex-col items-center justify-center gap-2">
                          <FileText className={`h-8 w-8 transition-colors ${isLegacyDragging ? 'text-violet-400' : 'text-slate-500'}`} />
                          <span className="text-xs font-bold text-slate-300">
                            {isLegacyDragging ? 'Drop it here!' : 'Import .TXT or .JSON file'}
                          </span>
                          <span className="text-[9px] text-slate-500 max-w-[180px] mx-auto">
                            Drag and drop or click to browse. TXT songs are split by double-newlines.
                          </span>
                        </div>
                      )}
                    </div>
                  </section>
                </div>

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
                          <div className="flex items-center gap-1 shrink-0">
                            <button
                              onClick={(e) => handleDeletePresentation(e, pres.id, pres.title)}
                              title="Delete presentation"
                              className="rounded-lg p-1.5 text-slate-600 hover:text-red-400 hover:bg-red-950/30 transition-colors opacity-0 group-hover:opacity-100"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                            <ChevronRight className="h-4 w-4 text-slate-600 group-hover:text-violet-400 group-hover:translate-x-0.5 transition-all" />
                          </div>
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
              </>
            ) : (
              <>
                {/* Left Column: Create Setlist */}
                <div className="md:col-span-1 flex flex-col gap-6">
                  <section className="rounded-2xl border border-slate-900 bg-slate-900/35 p-6 backdrop-blur-xl ring-1 ring-white/5 shadow-xl">
                    <div className="flex items-center gap-2 mb-4">
                      <Plus className="h-5 w-5 text-indigo-400" />
                      <h3 className="font-bold text-white text-base">New Service Setlist</h3>
                    </div>
                    
                    <form onSubmit={handleCreateSetlist} className="space-y-4">
                      <div>
                        <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
                          Setlist Title / Event Date
                        </label>
                        <input
                          type="text"
                          required
                          placeholder="e.g. Sunday Morning - June 14"
                          value={newSetlistTitle}
                          onChange={(e) => setNewSetlistTitle(e.target.value)}
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
                          <span>Create Setlist Planner</span>
                        )}
                      </button>
                    </form>
                  </section>
                </div>

                {/* Setlists list */}
                <div className="md:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {setlistsLoading ? (
                    <div className="col-span-2 py-20 flex justify-center">
                      <div className="h-8 w-8 animate-spin rounded-full border-4 border-violet-500 border-t-transparent" />
                    </div>
                  ) : setlists.length === 0 ? (
                    <div className="col-span-2 border border-dashed border-slate-800 rounded-2xl py-16 text-center text-slate-500 text-sm">
                      No service setlists created yet. Use the sidebar to create your first setlist!
                    </div>
                  ) : (
                    setlists.map((slist) => (
                      <div
                        key={slist.id}
                        onClick={() => router.push(`/dashboard/setlist?id=${slist.id}`)}
                        className="group rounded-2xl border border-slate-900 bg-slate-900/10 p-5 hover:border-violet-500/40 hover:bg-slate-900/20 cursor-pointer shadow-lg transition-all duration-200"
                      >
                        <div className="flex justify-between items-start gap-4 mb-3">
                          <h4 className="font-bold text-slate-100 group-hover:text-white transition-colors truncate">
                            {slist.title}
                          </h4>
                          <div className="flex items-center gap-1 shrink-0">
                            <button
                              onClick={(e) => handleDeleteSetlist(e, slist.id, slist.title)}
                              title="Delete setlist"
                              className="rounded-lg p-1.5 text-slate-600 hover:text-red-400 hover:bg-red-950/30 transition-colors opacity-0 group-hover:opacity-100"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                            <ChevronRight className="h-4 w-4 text-slate-600 group-hover:text-violet-400 group-hover:translate-x-0.5 transition-all" />
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-3 text-xs text-slate-500">
                          <span className="bg-slate-900 px-2.5 py-1 rounded-full border border-slate-800">
                            Setlist
                          </span>
                          <span className="font-medium text-slate-400">
                            {new Date(slist.created_at || '').toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                          </span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </>
            )}

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
      <header className="sticky top-0 z-30 border-b border-slate-900 bg-slate-950/70 backdrop-blur-md px-4 md:px-6 py-4 flex flex-wrap items-center justify-between gap-y-3 gap-x-4">
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
        <div className="flex flex-wrap items-center gap-2 md:gap-4">
          {isDemoMode && (
            <div className="flex items-center gap-1.5 rounded-full bg-amber-500/10 border border-amber-500/20 px-3 py-1 text-xs font-semibold text-amber-400">
              <AlertTriangle className="h-3.5 w-3.5" />
              <span>Demo Mode</span>
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
            onClick={() => window.open(`/projector/stage?pres=${presId}`, '_blank')}
            className="flex items-center gap-1.5 rounded-xl bg-slate-900 border border-slate-800 hover:bg-slate-800 px-4 py-2 text-xs font-bold text-yellow-400 transition-all active:scale-[0.98]"
          >
            <LayoutGrid className="h-4 w-4" />
            <span>Stage Monitor</span>
            <ExternalLink className="h-3 w-3" />
          </button>

          <button
            onClick={() => window.open(`/dashboard/remote?pres=${presId}`, '_blank')}
            className="flex items-center gap-1.5 rounded-xl bg-slate-900 border border-slate-800 hover:bg-slate-800 px-4 py-2 text-xs font-bold text-violet-400 transition-all active:scale-[0.98]"
          >
            <Smartphone className="h-4 w-4" />
            <span>Mobile Remote</span>
            <ExternalLink className="h-3 w-3" />
          </button>

          <button
            onClick={() => setIsShareModalOpen(true)}
            className="flex items-center gap-1.5 rounded-xl bg-gradient-to-tr from-pink-600/20 to-violet-600/20 border border-pink-500/30 hover:bg-pink-600/10 px-4 py-2 text-xs font-bold text-pink-300 transition-all active:scale-[0.98]"
          >
            <Users className="h-4 w-4 text-pink-400" />
            <span>Connect a Screen</span>
          </button>

          <div className="flex items-center gap-3 border-l border-slate-900 pl-4">
            <div className="text-right">
              <p className="text-xs font-bold text-slate-200">{authUser.displayName}</p>
              <p className="text-[10px] text-slate-500">{authUser.email}</p>
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
      <div className="flex-1 p-4 md:p-6 grid grid-cols-1 lg:grid-cols-12 gap-6 lg:overflow-hidden lg:max-h-[calc(100vh-73px)]">

        {/* Left Panel: Settings & Collaborators */}
        <aside className="lg:col-span-3 flex flex-col gap-6 lg:overflow-y-auto lg:pr-2 order-2 lg:order-1">
          
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
                  <option value="Montserrat">Montserrat (Modern Sans)</option>
                  <option value="Outfit">Outfit (Geometric Sans)</option>
                  <option value="Lora">Lora (Worship Serif)</option>
                  <option value="Playfair Display">Playfair Display (Serif)</option>
                  <option value="Georgia">Georgia (Serif)</option>
                  <option value="system-ui">System Default</option>
                  <option value="Courier New">Monospace</option>
                </select>
              </div>

              <div>
                <label className="block text-xs text-slate-400 mb-1.5">Translation Language</label>
                <select
                  value={translationLang}
                  onChange={(e) => {
                    const lang = e.target.value;
                    updateSettings({ translationLang: lang });
                    // Re-translate the selected slide into the newly chosen language
                    if (selectedSlide && selectedSlide.content.trim()) {
                      handleTranslateSlide(lang);
                    }
                  }}
                  disabled={isTranslating}
                  className="w-full rounded-xl border border-slate-800 bg-slate-950 px-3 py-2 text-xs font-medium text-slate-300 focus:border-violet-500 focus:outline-none disabled:opacity-50"
                >
                  {LANGUAGES.map((lang) => (
                    <option key={lang.name} value={lang.name}>
                      {lang.name}{lang.rtl ? ' (RTL)' : ''}
                    </option>
                  ))}
                </select>
                <p className="mt-1 text-[10px] text-slate-600">
                  {isTranslating ? 'Translating the current slide…' : 'Changing this re-translates the selected slide and updates the projector / follower screens.'}
                </p>
              </div>

              <div>
                <label className="block text-xs text-slate-400 mb-1.5">Text Alignment</label>
                <div className="grid grid-cols-3 gap-1 bg-slate-950/65 p-1 rounded-xl border border-slate-850">
                  {(['left', 'center', 'right'] as const).map((align) => (
                    <button
                      key={align}
                      type="button"
                      onClick={() => updateSettings({ textAlign: align })}
                      className={`rounded-lg py-1 px-1.5 text-[10px] font-bold capitalize transition-all ${
                        (presentation.settings.textAlign || 'center') === align
                          ? 'bg-violet-600 text-white shadow-sm'
                          : 'text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      {align}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs text-slate-400 mb-1.5">Vertical Alignment</label>
                <div className="grid grid-cols-3 gap-1 bg-slate-950/65 p-1 rounded-xl border border-slate-850">
                  {(['top', 'center', 'bottom'] as const).map((valign) => (
                    <button
                      key={valign}
                      type="button"
                      onClick={() => updateSettings({ verticalAlign: valign })}
                      className={`rounded-lg py-1 px-1.5 text-[10px] font-bold capitalize transition-all ${
                        (presentation.settings.verticalAlign || 'center') === valign
                          ? 'bg-violet-600 text-white shadow-sm'
                          : 'text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      {valign}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs text-slate-400 mb-1.5">Text Capitalization</label>
                <div className="grid grid-cols-2 gap-1 bg-slate-950/65 p-1 rounded-xl border border-slate-855">
                  {(['none', 'uppercase'] as const).map((transform) => (
                    <button
                      key={transform}
                      type="button"
                      onClick={() => updateSettings({ textTransform: transform })}
                      className={`rounded-lg py-1 px-1.5 text-[10px] font-bold transition-all ${
                        (presentation.settings.textTransform || 'none') === transform
                          ? 'bg-violet-600 text-white shadow-sm'
                          : 'text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      {transform === 'none' ? 'Normal' : 'ALL CAPS'}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs text-slate-400 mb-1.5">Text Shadow</label>
                <div className="grid grid-cols-3 gap-1 bg-slate-950/65 p-1 rounded-xl border border-slate-850">
                  {(['none', 'subtle', 'strong'] as const).map((shadow) => (
                    <button
                      key={shadow}
                      type="button"
                      onClick={() => updateSettings({ textShadow: shadow })}
                      className={`rounded-lg py-1 px-1.5 text-[10px] font-bold capitalize transition-all ${
                        (presentation.settings.textShadow || 'none') === shadow
                          ? 'bg-violet-600 text-white shadow-sm'
                          : 'text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      {shadow}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs text-slate-400 mb-1.5">Text Outline</label>
                <div className="grid grid-cols-3 gap-1 bg-slate-950/65 p-1 rounded-xl border border-slate-850">
                  {(['none', 'subtle', 'strong'] as const).map((outline) => (
                    <button
                      key={outline}
                      type="button"
                      onClick={() => updateSettings({ textOutline: outline })}
                      className={`rounded-lg py-1 px-1.5 text-[10px] font-bold capitalize transition-all ${
                        (presentation.settings.textOutline || 'none') === outline
                          ? 'bg-violet-600 text-white shadow-sm'
                          : 'text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      {outline}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs text-slate-400 mb-1.5">Slide Transition</label>
                <select
                  value={presentation.settings.slideTransition || 'none'}
                  onChange={(e) => updateSettings({ slideTransition: e.target.value as any })}
                  className="w-full rounded-xl border border-slate-800 bg-slate-950 px-3 py-2 text-xs font-medium text-slate-300 focus:border-violet-500 focus:outline-none"
                >
                  <option value="none">None (Instant)</option>
                  <option value="fade">Fade (Crossfade)</option>
                  <option value="slide">Slide (Push Left)</option>
                  <option value="zoom">Scale Zoom</option>
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

              {/* Quick Screen Overlays */}
              <div className="border-t border-slate-900 pt-4 mt-4 space-y-2.5">
                <span className="block text-xs text-slate-400 font-medium">Quick Screen Overlays</span>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => setBlankMode(presentation.settings.blankMode === 'black' ? 'none' : 'black')}
                    className={`rounded-xl py-2 px-2 text-[10px] font-bold border transition-all ${
                      presentation.settings.blankMode === 'black'
                        ? 'bg-red-950/40 border-red-500/50 text-red-400'
                        : 'bg-slate-950/60 border-slate-900 text-slate-400 hover:border-slate-800'
                    }`}
                  >
                    ⚫ Blackout
                  </button>
                  <button
                    onClick={() => setBlankMode(presentation.settings.blankMode === 'clear' ? 'none' : 'clear')}
                    className={`rounded-xl py-2 px-2 text-[10px] font-bold border transition-all ${
                      presentation.settings.blankMode === 'clear'
                        ? 'bg-indigo-950/40 border-indigo-500/50 text-indigo-400'
                        : 'bg-slate-950/60 border-slate-900 text-slate-400 hover:border-slate-800'
                    }`}
                  >
                    🔍 Clear Text
                  </button>
                  <button
                    onClick={() => setBlankMode(presentation.settings.blankMode === 'logo' ? 'none' : 'logo')}
                    className={`rounded-xl py-2 px-2 text-[10px] font-bold border col-span-2 transition-all ${
                      presentation.settings.blankMode === 'logo'
                        ? 'bg-emerald-950/40 border-emerald-500/50 text-emerald-400'
                        : 'bg-slate-950/60 border-slate-900 text-slate-400 hover:border-slate-800'
                    }`}
                  >
                    ✨ Show Logo Placeholder
                  </button>
                </div>
              </div>
            </div>
          </section>

          {/* Live Alerts Section */}
          <section className="rounded-2xl border border-slate-900 bg-slate-900/20 p-5 backdrop-blur-md">
            <div className="flex items-center gap-2 mb-4 justify-between">
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-amber-400" />
                <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-300">Live View Alerts</h2>
              </div>
              {activeAlert && (
                <span className="flex h-2 w-2 rounded-full bg-red-500 animate-pulse" />
              )}
            </div>

            <div className="space-y-4">
              {/* Nursery quick preset call */}
              <div>
                <label className="block text-xs text-slate-400 mb-1.5 font-medium">Quick Nursery Call</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="e.g. #304"
                    value={nurseryNumber}
                    onChange={(e) => setNurseryNumber(e.target.value)}
                    className="flex-1 rounded-xl border border-slate-800 bg-slate-950/60 py-2 px-3 text-xs text-slate-200 placeholder:text-slate-700 focus:border-violet-500 focus:outline-none"
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
                <label className="block text-xs text-slate-400 mb-1.5 font-medium">Custom Alert Message</label>
                <textarea
                  placeholder="e.g. Please move vehicle with plate XYZ-123..."
                  value={alertText}
                  onChange={(e) => setAlertText(e.target.value)}
                  className="w-full h-16 rounded-xl border border-slate-800 bg-slate-950/60 p-2.5 text-xs text-slate-200 placeholder:text-slate-700 focus:border-violet-500 focus:outline-none resize-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] uppercase font-bold text-slate-500 mb-1">Alert Type</label>
                  <select
                    value={alertType}
                    onChange={(e) => setAlertType(e.target.value as any)}
                    className="w-full rounded-xl border border-slate-800 bg-slate-950 px-2.5 py-1.5 text-[10px] font-bold text-slate-350 focus:outline-none"
                  >
                    <option value="general">General (Slate)</option>
                    <option value="nursery">Nursery (Amber)</option>
                    <option value="warning">Warning (Red)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] uppercase font-bold text-slate-500 mb-1">Position</label>
                  <select
                    value={alertPosition}
                    onChange={(e) => setAlertPosition(e.target.value as any)}
                    className="w-full rounded-xl border border-slate-800 bg-slate-950 px-2.5 py-1.5 text-[10px] font-bold text-slate-350 focus:outline-none"
                  >
                    <option value="top">Top Screen</option>
                    <option value="bottom">Bottom Screen</option>
                  </select>
                </div>
              </div>

              <div className="flex gap-2 border-t border-slate-900/80 pt-3 mt-1">
                {activeAlert && (
                  <button
                    type="button"
                    onClick={() => {
                      clearAlert();
                      setAlertText('');
                    }}
                    className="flex-1 rounded-xl border border-red-500/20 hover:border-red-500/30 bg-red-950/20 text-red-400 py-2 text-xs font-bold transition-all active:scale-[0.98]"
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
                  className="flex-[2] rounded-xl bg-violet-600 hover:bg-violet-500 text-white py-2 text-xs font-bold transition-all active:scale-[0.98] disabled:opacity-30 disabled:pointer-events-none shadow-md shadow-violet-600/10"
                >
                  Broadcast Alert
                </button>
              </div>

              {activeAlert && (
                <div className={`mt-2 rounded-xl p-3 text-[10px] flex flex-col gap-1 border border-dashed ${
                  activeAlert.type === 'nursery' 
                    ? 'bg-amber-500/5 border-amber-500/30 text-amber-400' 
                    : activeAlert.type === 'warning'
                      ? 'bg-red-500/5 border-red-500/30 text-red-400'
                      : 'bg-slate-950/40 border-slate-800 text-slate-400'
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

          {/* Live Congregation Requests card */}
          <section className="rounded-2xl border border-slate-900 bg-slate-900/20 p-5 backdrop-blur-md flex-1 flex flex-col overflow-hidden min-h-[220px]">
            <div className="flex items-center gap-2 mb-4 justify-between">
              <div className="flex items-center gap-2">
                <MessageSquare className="h-4 w-4 text-pink-400" />
                <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-300">Congregation Feed</h2>
              </div>
              {prayerRequests.length > 0 && (
                <button
                  onClick={clearPrayerRequests}
                  className="text-[9px] font-bold text-slate-500 hover:text-red-400 transition-colors"
                >
                  Clear Feed
                </button>
              )}
            </div>

            <div className="flex-1 overflow-y-auto space-y-2.5 pr-1">
              {prayerRequests.map((req) => (
                <div 
                  key={req.id} 
                  className="p-3 rounded-xl bg-slate-950/50 border border-pink-950/20 hover:border-pink-900/30 transition-all text-xs"
                >
                  <div className="flex justify-between items-center mb-1">
                    <span className="font-extrabold text-pink-400 truncate">{req.name}</span>
                    <span className="text-[9px] text-slate-550">
                      {new Date(req.timestamp).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                  <p className="text-slate-350 leading-normal font-medium whitespace-pre-line">{req.text}</p>
                </div>
              ))}
              {prayerRequests.length === 0 && (
                <p className="text-[10px] text-slate-600 text-center py-8">No live messages or prayer requests yet.</p>
              )}
            </div>
          </section>
        </aside>

        {/* Center Panel: Slide Queue flow */}
        <section className="lg:col-span-6 flex flex-col gap-4 lg:overflow-y-auto lg:pr-2 order-1 lg:order-2">
          {presLoading ? (
            <div className="flex-1 flex items-center justify-center py-20">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-violet-500 border-t-transparent" />
            </div>
          ) : (
            <>
              <div className="flex items-center justify-between">
                <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-400">Presentation Slides Flow</h2>
                <div className="flex items-center gap-3">
                  <span className="text-xs text-slate-500">{presentation.slides.length} {presentation.slides.length === 1 ? 'slide' : 'slides'}</span>
                  <button
                    onClick={async () => { const id = await addSlide(); if (id) setSelectedSlideId(id); }}
                    className="flex items-center gap-1.5 rounded-lg bg-violet-600/15 border border-violet-500/30 hover:bg-violet-600/25 px-3 py-1.5 text-xs font-bold text-violet-300 transition-all active:scale-[0.98]"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    <span>Add Slide</span>
                  </button>
                </div>
              </div>

              <p className="text-[11px] text-slate-500 -mt-1">Drag thumbnails to reorder. Click a slide to edit it; double-click to open the designer.</p>
              <div className="grid grid-cols-2 xl:grid-cols-3 gap-3">
                {presentation.slides.map((slide, idx) => {
                  const isLive = activeSlideId === slide.id;
                  const isSelected = selectedSlideId === slide.id;
                  return (
                    <div
                      key={slide.id}
                      draggable
                      onDragStart={() => { dragIndexRef.current = idx; }}
                      onDragOver={(e) => e.preventDefault()}
                      onDrop={() => handleReorderDrop(idx)}
                      onClick={() => setSelectedSlideId(slide.id)}
                      onDoubleClick={() => { setSelectedSlideId(slide.id); setDesigningSlideId(slide.id); }}
                      className={`group relative rounded-xl border overflow-hidden cursor-pointer transition-all ${
                        isLive
                          ? 'border-red-500/60 ring-2 ring-red-500/30'
                          : isSelected
                            ? 'border-violet-500/60 ring-1 ring-violet-500/30'
                            : 'border-slate-800 hover:border-slate-700'
                      }`}
                    >
                      <div className="relative aspect-video bg-slate-950">
                        <SlidePreview slide={slide} settings={presentation.settings} />
                        <span className="absolute bottom-1 left-1 rounded bg-black/60 px-1.5 py-0.5 text-[9px] font-bold text-white">{idx + 1}</span>
                        {isLive && (
                          <span className="absolute top-1 left-1 rounded bg-red-500 px-1.5 py-0.5 text-[8px] font-bold text-white uppercase tracking-widest animate-pulse">Live</span>
                        )}
                        <div className="absolute inset-x-0 bottom-0 flex items-center justify-center gap-1 bg-gradient-to-t from-black/85 to-transparent pt-6 pb-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button onClick={(e) => { e.stopPropagation(); setLiveSlide(slide.id); }} title="Go Live" className={`rounded-md p-1.5 text-white ${isLive ? 'bg-red-500 pointer-events-none' : 'bg-indigo-600 hover:bg-indigo-500'}`}><Play className="h-3 w-3 fill-current" /></button>
                          <button onClick={(e) => { e.stopPropagation(); setSelectedSlideId(slide.id); setDesigningSlideId(slide.id); }} title="Design" className="rounded-md p-1.5 bg-slate-800 hover:bg-slate-700 text-violet-300"><Layers className="h-3 w-3" /></button>
                          <button onClick={async (e) => { e.stopPropagation(); const id = await duplicateSlide(slide.id); if (id) setSelectedSlideId(id); }} title="Duplicate" className="rounded-md p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200"><Copy className="h-3 w-3" /></button>
                          <button onClick={(e) => { e.stopPropagation(); if (presentation.slides.length <= 1) { alert('A presentation needs at least one slide.'); return; } if (confirm(`Delete slide ${idx + 1}?`)) deleteSlide(slide.id); }} title="Delete" className="rounded-md p-1.5 bg-slate-800 hover:bg-red-950/60 text-slate-300 hover:text-red-400"><Trash2 className="h-3 w-3" /></button>
                        </div>
                      </div>
                    </div>
                  );
                })}
                <button
                  onClick={async () => { const id = await addSlide(); if (id) setSelectedSlideId(id); }}
                  className="aspect-video rounded-xl border-2 border-dashed border-slate-800 hover:border-violet-500/50 hover:bg-slate-900/30 flex flex-col items-center justify-center gap-1 text-slate-500 hover:text-violet-300 transition-all"
                >
                  <Plus className="h-5 w-5" />
                  <span className="text-[10px] font-bold">Add slide</span>
                </button>
              </div>
            </>
          )}
        </section>

        {/* Right Panel: Live Text Editor */}
        <aside className="lg:col-span-3 flex flex-col gap-6 lg:overflow-y-auto order-3">
          {selectedSlide ? (
            <div className="rounded-2xl border border-slate-900 bg-slate-900/20 p-5 backdrop-blur-md flex flex-col h-full">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Edit3 className="h-4 w-4 text-indigo-400" />
                  <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-300">Live Editor</h2>
                </div>
                <button
                  onClick={() => setDesigningSlideId(selectedSlide.id)}
                  className="flex items-center gap-1.5 rounded-lg bg-violet-600/15 border border-violet-500/30 hover:bg-violet-600/25 px-2.5 py-1.5 text-[11px] font-bold text-violet-300 transition-all"
                  title="Open the free-placement slide designer"
                >
                  <Layers className="h-3.5 w-3.5" />
                  Design
                  {selectedSlide.elements && selectedSlide.elements.length > 0 && (
                    <span className="rounded-full bg-violet-500/30 px-1.5 text-[9px]">{selectedSlide.elements.length}</span>
                  )}
                </button>
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

                <div className="flex justify-center">
                  <button
                    type="button"
                    disabled={isTranslating || !selectedSlide.content.trim()}
                    onClick={() => handleTranslateSlide()}
                    className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-violet-600/20 to-indigo-600/20 hover:from-violet-600/40 hover:to-indigo-600/40 border border-violet-500/30 hover:border-violet-500/50 py-2.5 px-4 text-xs font-bold text-violet-300 hover:text-white shadow-lg active:scale-[0.98] transition-all disabled:opacity-50 disabled:pointer-events-none"
                  >
                    {isTranslating ? (
                      <>
                        <div className="h-4 w-4 animate-spin rounded-full border-2 border-violet-400 border-t-transparent" />
                        <span>Translating with AI...</span>
                      </>
                    ) : (
                      <>
                        <Sparkles className="h-4 w-4 text-violet-400 animate-pulse" />
                        <span>AI Translate to {translationLang}</span>
                      </>
                    )}
                  </button>
                </div>

                <div className="flex-1 flex flex-col">
                  <div className="flex items-center gap-1.5 mb-1.5">
                    <Languages className="h-3.5 w-3.5 text-indigo-400" />
                    <label className="block text-xs text-slate-400 font-medium">{translationLang} Translation (Linked)</label>
                  </div>
                  <textarea
                    dir={dirFor(translationLang)}
                    value={selectedSlide.translation || ''}
                    onChange={(e) => updateSlideContent(
                      selectedSlide.id,
                      selectedSlide.content,
                      e.target.value,
                      selectedSlide.media_type,
                      selectedSlide.media_url
                    )}
                    placeholder="Enter translation here..."
                    className="w-full flex-1 rounded-xl border border-slate-800 bg-slate-950/60 p-3 text-xs leading-relaxed text-slate-200 placeholder:text-slate-600 focus:border-violet-500 focus:outline-none resize-none font-serif"
                  />
                </div>

                {/* Background Media Settings */}
                <div className="border-t border-slate-900 pt-4 space-y-3">
                  <label className="block text-xs text-slate-400 font-medium">Slide Media</label>
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
                    <option value="image">Image (upload)</option>
                    <option value="video">Video (upload)</option>
                    <option value="camera">Live Camera (WebRTC)</option>
                  </select>

                  {(selectedSlide.media_type === 'image' || selectedSlide.media_type === 'video') && (
                    <div className="animate-fade-in pt-1 space-y-3">
                      <MediaLibrary
                        currentUrl={selectedSlide.media_url}
                        onSelectMedia={(url, kind) => updateSlideContent(
                          selectedSlide.id,
                          selectedSlide.content,
                          selectedSlide.translation,
                          url ? kind : 'none',
                          url
                        )}
                      />

                      {selectedSlide.media_type === 'video' && (
                        <div>
                          <label className="block text-[10px] uppercase font-bold text-slate-500 mb-1.5">…or paste a video link (no upload)</label>
                          <input
                            type="url"
                            placeholder="https://example.com/clip.mp4"
                            defaultValue={selectedSlide.media_url || ''}
                            onBlur={(e) => updateSlideContent(
                              selectedSlide.id,
                              selectedSlide.content,
                              selectedSlide.translation,
                              e.target.value.trim() ? 'video' : 'none',
                              e.target.value.trim() || undefined
                            )}
                            className="w-full rounded-xl border border-slate-800 bg-slate-950/60 py-2 px-3 text-xs text-slate-200 placeholder:text-slate-650 focus:border-violet-500 focus:outline-none"
                          />
                          <p className="mt-1 text-[10px] text-slate-600">Use a direct link to an .mp4/.webm file (saves storage space). Must be publicly accessible.</p>
                        </div>
                      )}

                      {selectedSlide.media_url && (
                        <label className="flex items-start gap-2.5 rounded-xl border border-slate-800 bg-slate-950/40 p-3 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={!!selectedSlide.media_fill}
                            onChange={(e) => setSlideFill(selectedSlide.id, e.target.checked)}
                            className="mt-0.5 h-4 w-4 accent-violet-600"
                          />
                          <span className="text-[11px] text-slate-300 leading-relaxed">
                            <strong className="text-slate-200">Fill the screen</strong> — show the {selectedSlide.media_type} full-brightness with no text on top (for announcement / picture slides). Leave off to use it as a darkened background behind lyrics.
                          </span>
                        </label>
                      )}
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

      {/* Connect a Screen Modal */}
      {isShareModalOpen && (() => {
        const origin = typeof window !== 'undefined' ? window.location.origin : '';
        const screens = {
          projector: { label: 'Projector', icon: Tv, desc: 'Full-screen output for the main projector or TV.', url: `${origin}/projector?pres=${presId}` },
          stage: { label: 'Stage', icon: LayoutGrid, desc: 'Confidence monitor: current slide, next slide and clock.', url: `${origin}/projector/stage?pres=${presId}` },
          follow: { label: 'Follower', icon: Users, desc: 'Congregation members follow the lyrics on their phones.', url: `${origin}/follow?pres=${presId}` },
        } as const;
        const active = screens[screenTab];
        const ActiveIcon = active.icon;
        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-md animate-fade-in p-4">
            <div className="w-full max-w-md rounded-3xl border border-slate-800 bg-slate-950 p-6 shadow-2xl relative ring-1 ring-white/10 max-h-[92vh] overflow-y-auto">
              <button
                onClick={() => setIsShareModalOpen(false)}
                className="absolute top-4 right-4 rounded-full p-1.5 bg-slate-900 border border-slate-800 text-slate-400 hover:text-white transition-colors"
              >
                <X className="h-4 w-4" />
              </button>

              <div className="text-center mb-5">
                <h3 className="font-extrabold text-base text-white">Connect a Screen</h3>
                <p className="text-slate-400 text-xs mt-1 max-w-xs mx-auto">
                  Open the link (or scan the code) on any device on your network — an iPad, a smart TV browser, or a laptop plugged into the projector. It stays in sync live.
                </p>
              </div>

              {/* Screen type tabs */}
              <div className="grid grid-cols-3 gap-1.5 bg-slate-900/60 p-1.5 rounded-xl border border-slate-800 mb-4">
                {(['projector', 'stage', 'follow'] as const).map((k) => {
                  const Icon = screens[k].icon;
                  return (
                    <button
                      key={k}
                      onClick={() => { setScreenTab(k); setCopied(false); }}
                      className={`flex items-center justify-center gap-1.5 rounded-lg py-2 text-[11px] font-bold transition-all ${
                        screenTab === k ? 'bg-violet-600 text-white shadow-md' : 'text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      <Icon className="h-3.5 w-3.5" />
                      {screens[k].label}
                    </button>
                  );
                })}
              </div>

              <p className="text-center text-xs text-slate-400 mb-4 flex items-center justify-center gap-1.5">
                <ActiveIcon className="h-3.5 w-3.5 text-violet-400" />
                {active.desc}
              </p>

              {/* QR Code */}
              <div className="flex justify-center mb-4">
                <div className="bg-white p-3 rounded-2xl border border-slate-200 shadow-inner">
                  <img
                    src={`https://api.qrserver.com/v1/create-qr-code/?size=250x250&color=7c3aed&data=${encodeURIComponent(active.url)}`}
                    alt={`Scan to open ${active.label}`}
                    className="h-44 w-44 object-contain"
                  />
                </div>
              </div>

              {/* Link + copy */}
              <div className="flex gap-2 mb-3">
                <input
                  type="text"
                  readOnly
                  value={active.url}
                  onFocus={(e) => e.target.select()}
                  className="flex-1 rounded-xl border border-slate-850 bg-slate-900/60 py-2.5 px-3.5 text-xs text-indigo-300 font-medium focus:outline-none"
                />
                <button
                  onClick={() => {
                    navigator.clipboard?.writeText(active.url);
                    setCopied(true);
                    setTimeout(() => setCopied(false), 1500);
                  }}
                  className="flex items-center gap-1.5 rounded-xl bg-violet-600 hover:bg-violet-500 px-4 text-xs font-bold text-white transition-colors"
                >
                  {copied ? <Check className="h-3.5 w-3.5" /> : null}
                  {copied ? 'Copied' : 'Copy'}
                </button>
              </div>

              {/* Open on this device */}
              <button
                onClick={() => window.open(active.url, '_blank')}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-slate-900 border border-slate-800 hover:bg-slate-800 py-2.5 text-xs font-bold text-indigo-300 transition-all"
              >
                <ExternalLink className="h-3.5 w-3.5" />
                Open on this device
              </button>
            </div>
          </div>
        );
      })()}

      {/* Free-placement Slide Designer (Phase 2) */}
      {designingSlideId && selectedSlide && selectedSlide.id === designingSlideId && (
        <SlideDesigner
          slide={selectedSlide}
          settings={presentation.settings}
          onChange={(els) => updateSlideElements(designingSlideId, els)}
          onBgChange={(color) => updateSlideSettings(designingSlideId, { bgColor: color })}
          onClose={() => setDesigningSlideId(null)}
        />
      )}
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
