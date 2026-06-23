'use client';

import { useState, useEffect, useRef, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useRealtimePresentation, usePresentationsPortal, useSetlistsPortal, getBrandPreset } from '@/utils/sync';
import { resolveAuth, signOut, AuthIdentity } from '@/utils/auth';
import SlideDesigner from '@/components/SlideDesigner';
import SlideEditor from '@/components/SlideEditor';
import SlidePreview from '@/components/SlidePreview';
import RecorderButton from '@/components/RecorderButton';
import PollControl from '@/components/PollControl';
import { getScreens, openOnScreen, type ScreenInfo } from '@/utils/screens';
import { LANGUAGES, DEFAULT_TRANSLATION_LANG } from '@/utils/languages';
import Logo from '@/components/Logo';
import { 
  Sparkles,
  Tv,
  Users,
  ExternalLink,
  Play,
  Check,
  AlertTriangle,
  LogOut,
  Plus,
  ArrowLeft,
  ChevronRight,
  LayoutGrid,
  BookOpen,
  FileText,
  Upload,
  Smartphone,
  MessageSquare,
  X,
  Trash2,
  Layers,
  Copy,
  ChevronLeft,
  MonitorPlay,
  Stamp,
  Printer,
  Search,
  Tag,
  Pencil
} from 'lucide-react';
import QuickFind, { type QuickItem } from '@/components/QuickFind';

type ImportedSlideInput = {
  content?: unknown;
  text?: unknown;
  translation?: unknown;
  arabic?: unknown;
};

type JsonWithSlides = {
  slides?: unknown;
};

type AlertType = 'general' | 'nursery' | 'warning';
type AlertPosition = 'top' | 'bottom';

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function normalizeImportedSlide(value: unknown): { content: string; translation?: string } {
  const slide = (isRecord(value) ? value : {}) as ImportedSlideInput;
  return {
    content: String(slide.content || slide.text || ''),
    translation: String(slide.translation || slide.arabic || ''),
  };
}

function DashboardContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const presId = searchParams.get('pres');
  const goSlideParam = searchParams.get('go');
  const editSlideParam = searchParams.get('edit');

  // Hook for Listing & Creating Presentations
  const {
    presentations,
    loading: portalLoading,
    isDemoMode: portalDemoMode,
    createNewPresentation,
    appendSlidesToPresentation,
    deletePresentation,
    duplicatePresentation,
    updatePresentationSettings,
    renamePresentation,
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
    setSlideAudio,
    setSlideAutoAdvance,
    setLiveSlide,
    updateSettings,
    setBlankMode,
    prayerRequests,
    clearPrayerRequests,
    sendAlert,
    clearAlert,
    activeAlert,
    activePoll,
    pollCounts,
    sendPoll,
  } = useRealtimePresentation(presId || '');

  // Refs that always hold the freshest slides + active slide, so timer/listener
  // effects can read current values without re-subscribing whenever the slides
  // array gets a new reference (e.g. during collaborative edits) — which would
  // otherwise reset a running countdown before it fires.
  const slidesRef = useRef<typeof presentation.slides>(presentation.slides);
  const activeSlideIdRef = useRef<string | null>(activeSlideId);
  const blankModeRef = useRef(presentation.settings.blankMode);
  useEffect(() => {
    slidesRef.current = presentation.slides;
    activeSlideIdRef.current = activeSlideId;
    blankModeRef.current = presentation.settings.blankMode;
  });
  const advanceLive = (dir: 1 | -1 = 1, wrap = true) => {
    const slides = slidesRef.current;
    const idx = slides.findIndex((s) => s.id === activeSlideIdRef.current);
    const target = dir === 1 ? (slides[idx + 1] || (wrap ? slides[0] : undefined)) : slides[idx - 1];
    if (target) setLiveSlide(target.id);
  };

  const [selectedSlideId, setSelectedSlideId] = useState<string | null>(null);
  const [newPresTitle, setNewPresTitle] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [authUser, setAuthUser] = useState<AuthIdentity | null>(null);
  const [designingSlideId, setDesigningSlideId] = useState<string | null>(null);
  const [editingSlideId, setEditingSlideId] = useState<string | null>(null);
  const [looping, setLooping] = useState(false);
  const [loopSecs, setLoopSecs] = useState(8);
  const [midiOn, setMidiOn] = useState(false);
  const [countdownMins, setCountdownMins] = useState(5);
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
  const [activeTab, setActiveTab] = useState<'presentations' | 'setlists'>('setlists');
  const [scriptureRef, setScriptureRef] = useState('');
  const [scriptureBusy, setScriptureBusy] = useState(false);
  const [quickFindOpen, setQuickFindOpen] = useState(false);
  const [recents, setRecents] = useState<{ id: string; title: string }[]>([]);
  const [tagFilter, setTagFilter] = useState<string | null>(null);
  const [duplicatingId, setDuplicatingId] = useState<string | null>(null);
  const [librarySearch, setLibrarySearch] = useState('');
  const [librarySort, setLibrarySort] = useState<'recent' | 'az'>('recent');
  const [serviceSearch, setServiceSearch] = useState('');
  const [serviceSort, setServiceSort] = useState<'recent' | 'az'>('recent');

  // Library tags: edit (prompt-based) and the set of all tags in use.
  const editTags = async (e: React.MouseEvent, presId: string, current: string[]) => {
    e.stopPropagation();
    const input = prompt('Tags for this presentation (comma-separated):', current.join(', '));
    if (input === null) return;
    const tags = Array.from(new Set(input.split(',').map((t) => t.trim()).filter(Boolean)));
    await updatePresentationSettings(presId, { tags });
  };
  const renameSong = async (e: React.MouseEvent, id: string, current: string) => {
    e.stopPropagation();
    const name = prompt('Song title:', current);
    if (name && name.trim() && name.trim() !== current) await renamePresentation(id, name.trim());
  };
  const handleDuplicate = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    setDuplicatingId(id);
    const newId = await duplicatePresentation(id);
    setDuplicatingId(null);
    if (newId) router.push(`/dashboard?pres=${newId}`);
  };
  const allTags = Array.from(new Set(presentations.flatMap((p) => p.settings?.tags || []))).sort();
  const visiblePresentations = (() => {
    const q = librarySearch.trim().toLowerCase();
    let list = presentations;
    if (tagFilter) list = list.filter((p) => (p.settings?.tags || []).includes(tagFilter));
    if (q) list = list.filter((p) => {
      if (p.title.toLowerCase().includes(q)) return true;
      return p.slides.some((s) => (s.content || '').toLowerCase().includes(q));
    });
    if (librarySort === 'az') list = [...list].sort((a, b) => a.title.localeCompare(b.title));
    return list;
  })();
  const [bulkLang, setBulkLang] = useState<string>('');
  const [bulkProgress, setBulkProgress] = useState<{ done: number; total: number } | null>(null);
  const [brandNudgeDismissed, setBrandNudgeDismissed] = useState<boolean>(() => {
    // Hidden unless this browser has no brand preset and hasn't dismissed it before.
    // The banner also gates on presentations.length (client-only) so there's no SSR mismatch.
    if (typeof window === 'undefined') return true;
    return !!getBrandPreset() || localStorage.getItem('hp_brand_nudge_dismissed') === '1';
  });
  const [newSetlistTitle, setNewSetlistTitle] = useState('');
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [screenTab, setScreenTab] = useState<'projector' | 'stage' | 'follow'>('follow');
  const [screensList, setScreensList] = useState<ScreenInfo[] | null>(null);
  const [screensChecked, setScreensChecked] = useState(false);
  const [copied, setCopied] = useState(false);
  // Live Alert States
  const [alertText, setAlertText] = useState('');
  const [alertType, setAlertType] = useState<AlertType>('general');
  const [alertPosition, setAlertPosition] = useState<AlertPosition>('bottom');
  const [nurseryNumber, setNurseryNumber] = useState('');

  // Quick scripture lookup: type a reference, fetch from bible-api, append as slides
  // (3 verses/slide) to the current presentation without leaving the running order.
  const handleQuickScripture = async () => {
    const ref = scriptureRef.trim();
    if (!ref || !presId) return;
    setScriptureBusy(true);
    try {
      const res = await fetch(`https://bible-api.com/${encodeURIComponent(ref)}`);
      const data = await res.json();
      const verses = (data?.verses || []) as { verse: number; text: string }[];
      if (!res.ok || verses.length === 0) {
        alert(data?.error || `Couldn't find “${ref}”. Try e.g. “John 3:16” or “Psalm 23:1-6”.`);
        return;
      }
      const refLine = data.reference || ref;
      const perSlide = 3;
      const slides: { content: string }[] = [];
      for (let i = 0; i < verses.length; i += perSlide) {
        const text = verses.slice(i, i + perSlide).map((v) => v.text.trim().replace(/\s+/g, ' ')).join(' ');
        slides.push({ content: `${text}\n\n— ${refLine}` });
      }
      await appendSlidesToPresentation(presId, slides);
      setScriptureRef('');
    } catch {
      alert('Scripture lookup failed. Check your connection and try again.');
    } finally {
      setScriptureBusy(false);
    }
  };

  // Print a clean running-order handout for the team / sound desk. Opens a
  // self-contained print window so it never touches the app's own styles.
  const printRunningOrder = () => {
    const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c] as string));
    const today = new Date().toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
    const rows = presentation.slides.map((s, i) => {
      const firstLine = (s.content || '').split('\n').find((l) => l.trim()) || '';
      const media = s.media_type && s.media_type !== 'none' ? s.media_type : '';
      const tags = [
        media ? `<span class="tag">${esc(media)}</span>` : '',
        s.audio_url ? '<span class="tag">audio</span>' : '',
        s.auto_advance_secs ? `<span class="tag">auto ${s.auto_advance_secs}s</span>` : '',
      ].join('');
      const note = s.settings?.notes?.trim() ? `<div class="note">${esc(s.settings.notes)}</div>` : '';
      const line = firstLine ? esc(firstLine) : (media ? `[${esc(media)} slide]` : '[blank]');
      return `<tr><td class="num">${i + 1}</td><td><div class="line">${line}</div>${note}</td><td class="tags">${tags}</td></tr>`;
    }).join('');
    const html = `<!doctype html><html><head><meta charset="utf-8"><title>${esc(presentation.title)} — Running Order</title>
<style>
  *{box-sizing:border-box} body{font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;color:#111;margin:0;padding:32px;}
  h1{font-size:22px;margin:0 0 2px} .sub{color:#666;font-size:13px;margin-bottom:20px}
  table{width:100%;border-collapse:collapse} td{vertical-align:top;border-bottom:1px solid #e5e5e5;padding:9px 8px}
  .num{width:34px;color:#999;font-variant-numeric:tabular-nums;font-weight:700}
  .line{font-size:15px;font-weight:600;line-height:1.3}
  .note{margin-top:3px;font-size:12px;color:#b45309;background:#fff7ed;border-left:3px solid #f59e0b;padding:3px 8px;border-radius:3px;white-space:pre-line}
  .tags{width:1%;white-space:nowrap;text-align:right}
  .tag{display:inline-block;font-size:10px;text-transform:uppercase;letter-spacing:.05em;color:#444;background:#f1f1f1;border:1px solid #e0e0e0;border-radius:99px;padding:2px 7px;margin-left:4px}
  .foot{margin-top:24px;color:#999;font-size:11px}
  @media print{body{padding:0}}
</style></head><body>
  <h1>${esc(presentation.title)}</h1>
  <div class="sub">Running order · ${presentation.slides.length} slide${presentation.slides.length === 1 ? '' : 's'} · ${esc(today)}</div>
  <table><tbody>${rows || '<tr><td colspan="3" style="color:#999">No slides yet.</td></tr>'}</tbody></table>
  <div class="foot">HolyProjection · presenter notes shown in amber are not displayed to the congregation.</div>
  <script>window.onload=function(){window.print()}</script>
</body></html>`;
    const w = window.open('', '_blank', 'width=800,height=900');
    if (!w) { alert('Please allow pop-ups to print the running order.'); return; }
    w.document.write(html);
    w.document.close();
  };

  // Translate every slide in the presentation to one language in a single action.
  // Runs sequentially (gentle on the API) with visible progress, and stores the
  // chosen language as the presentation default.
  const translateAllSlides = async () => {
    const lang = bulkLang || presentation.settings.translationLang || DEFAULT_TRANSLATION_LANG;
    const targets = presentation.slides.filter((s) => s.content.trim());
    if (!targets.length || bulkProgress) return;
    updateSettings({ translationLang: lang });
    setBulkProgress({ done: 0, total: targets.length });
    for (let i = 0; i < targets.length; i++) {
      const s = targets[i];
      try {
        const res = await fetch('/api/translate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text: s.content, targetLang: lang }),
        });
        const data = await res.json();
        if (data.success && data.translation) {
          updateSlideContent(s.id, s.content, data.translation, s.media_type, s.media_url);
        }
      } catch { /* skip a failed slide, keep going */ }
      setBulkProgress({ done: i + 1, total: targets.length });
    }
    setBulkProgress(null);
  };

  // Hook for Listing & Creating Setlists
  const {
    setlists,
    loading: setlistsLoading,
    createNewSetlist,
    deleteSetlist,
    renameSetlist,
    duplicateSetlist,
  } = useSetlistsPortal();

  const visibleSetlists = (() => {
    const q = serviceSearch.trim().toLowerCase();
    let list = q ? setlists.filter((s) => s.title.toLowerCase().includes(q)) : setlists;
    if (serviceSort === 'az') list = [...list].sort((a, b) => a.title.localeCompare(b.title));
    return list; // 'recent' keeps the default created-at-desc order
  })();

  useEffect(() => {
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

  // Quick Find: ⌘K / Ctrl-K opens the command palette anywhere in the dashboard.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setQuickFindOpen((v) => !v);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  // Load recently-opened presentations for the Quick Find empty state.
  useEffect(() => {
    queueMicrotask(() => {
      try { setRecents(JSON.parse(localStorage.getItem('hp_recent_pres') || '[]')); } catch { /* ignore */ }
    });
  }, []);

  // Remember this presentation as recently opened (most-recent first, max 8).
  useEffect(() => {
    if (!presId || !presentation.title) return;
    queueMicrotask(() => setRecents((prev) => {
      const next = [{ id: presId, title: presentation.title }, ...prev.filter((r) => r.id !== presId)].slice(0, 8);
      try { localStorage.setItem('hp_recent_pres', JSON.stringify(next)); } catch { /* ignore */ }
      return next;
    }));
  }, [presId, presentation.title]);

  // Honour a ?go=<slideId> deep-link (used by Quick Find to jump into a song):
  // take that slide live, select it, then strip the param so it doesn't re-fire.
  useEffect(() => {
    if (!presId || !goSlideParam) return;
    if (!presentation.slides.some((s) => s.id === goSlideParam)) return;
    queueMicrotask(() => {
      setLiveSlide(goSlideParam);
      setSelectedSlideId(goSlideParam);
      router.replace(`/dashboard?pres=${presId}`);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [presId, goSlideParam, presentation.slides]);

  // Honour a ?edit=<slideId> deep-link (from the planner's per-slide edit button):
  // open that slide straight in the editor, then strip the param.
  useEffect(() => {
    if (!presId || !editSlideParam) return;
    if (!presentation.slides.some((s) => s.id === editSlideParam)) return;
    queueMicrotask(() => {
      setSelectedSlideId(editSlideParam);
      setEditingSlideId(editSlideParam);
      router.replace(`/dashboard?pres=${presId}`);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [presId, editSlideParam, presentation.slides]);

  // Pre-service auto-loop: advance the live slide every loopSecs while on.
  // Reads slides/active from refs so the interval keeps a steady cadence and isn't
  // torn down when the slides array reference changes during edits.
  useEffect(() => {
    if (!looping || slidesRef.current.length < 2) return;
    const id = setInterval(() => advanceLive(1, true), Math.max(2, loopSecs) * 1000);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [looping, loopSecs]);

  // Keyboard live control on the present screen (not while editing/in a field).
  useEffect(() => {
    if (!presId || editingSlideId || designingSlideId) return;
    const onKey = (e: KeyboardEvent) => {
      const tag = (document.activeElement?.tagName || '').toLowerCase();
      if (tag === 'input' || tag === 'textarea' || tag === 'select') return;
      if (e.key === 'ArrowRight' || e.key === ' ' || e.key === 'PageDown') { e.preventDefault(); advanceLive(1, true); }
      else if (e.key === 'ArrowLeft' || e.key === 'PageUp') { e.preventDefault(); advanceLive(-1, false); }
      else if (e.key.toLowerCase() === 'b') { e.preventDefault(); setBlankMode(blankModeRef.current === 'black' ? 'none' : 'black'); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [presId, editingSlideId, designingSlideId]);

  // Web MIDI: advance on any note-on (foot pedals / controllers).
  useEffect(() => {
    if (!midiOn) return;
    type MidiInput = { onmidimessage: ((e: { data: Uint8Array }) => void) | null };
    type MidiAccess = { inputs: { forEach: (cb: (i: MidiInput) => void) => void } };
    const req = (navigator as unknown as { requestMIDIAccess?: () => Promise<MidiAccess> }).requestMIDIAccess;
    if (!req) { alert('Web MIDI is not supported in this browser (try Chrome).'); setTimeout(() => setMidiOn(false), 0); return; }
    let access: MidiAccess | null = null;
    const onMsg = (e: { data: Uint8Array }) => {
      const status = e.data[0]; const velocity = e.data[2];
      if ((status & 0xf0) === 0x90 && velocity > 0) advanceLive(1, true);
    };
    req().then((a) => { access = a; a.inputs.forEach((i) => { i.onmidimessage = onMsg; }); }).catch(() => { setMidiOn(false); });
    return () => { access?.inputs.forEach((i) => { i.onmidimessage = null; }); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [midiOn]);

  // Per-slide auto-advance (slide-triggered action). Skipped while the global loop runs.
  // Keyed on the active slide id + its configured seconds only, so an unrelated edit
  // elsewhere in the deck can't reset a countdown that's already ticking.
  const liveAutoAdvanceSecs = presentation.slides.find((s) => s.id === activeSlideId)?.auto_advance_secs || 0;
  useEffect(() => {
    if (looping || liveAutoAdvanceSecs <= 0) return;
    const id = setTimeout(() => advanceLive(1, false), liveAutoAdvanceSecs * 1000);
    return () => clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeSlideId, liveAutoAdvanceSecs, looping]);

  if (!authUser) {
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
    if (!confirm(`Delete presentation "${title}"?`)) return;
    const ok = await deleteSetlist(id);
    if (!ok) alert('Could not delete. Make sure you are signed in and that delete is enabled in the database.');
  };
  const handleRenameSetlist = async (e: React.MouseEvent, id: string, current: string) => {
    e.stopPropagation();
    const name = prompt('Presentation name:', current);
    if (name && name.trim() && name.trim() !== current) await renameSetlist(id, name.trim());
  };
  const handleDuplicateSetlist = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    setDuplicatingId(id);
    const newId = await duplicateSetlist(id);
    setDuplicatingId(null);
    if (newId) router.push(`/dashboard/setlist?id=${newId}`);
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
          const parsed: unknown = JSON.parse(text);
          if (Array.isArray(parsed)) {
            slides = parsed.map(normalizeImportedSlide);
          } else if (isRecord(parsed) && Array.isArray((parsed as JsonWithSlides).slides)) {
            slides = (parsed as { slides: unknown[] }).slides.map(normalizeImportedSlide);
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

  const selectedSlide = presentation.slides.find((s) => s.id === selectedSlideId) || presentation.slides[0];
  const effectiveSelectedSlideId = selectedSlide?.id ?? null;

  // Quick Find data — slides when inside a presentation, otherwise the library.
  const firstLineOf = (s: typeof presentation.slides[number]) => {
    const text = s.content || s.elements?.find((e) => e.role === 'lyrics')?.text || '';
    const line = text.split('\n').find((l) => l.trim());
    return line || (s.media_type && s.media_type !== 'none' ? `[${s.media_type} slide]` : '[blank slide]');
  };
  const quickItems: QuickItem[] = presId
    ? presentation.slides.map((s, i) => ({
        id: s.id,
        title: `${i + 1}. ${firstLineOf(s)}`,
        subtitle: s.translation || undefined,
        badge: s.id === activeSlideId ? 'LIVE' : undefined,
      }))
    : [
        ...presentations.map((p) => ({ id: `pres:${p.id}`, title: p.title, subtitle: `${p.slides.length} slide${p.slides.length === 1 ? '' : 's'}`, group: 'Presentations' })),
        ...setlists.map((sl) => ({ id: `setlist:${sl.id}`, title: sl.title, badge: 'Setlist', group: 'Setlists' })),
        // Every slide across the whole library, so you can search by any lyric and
        // jump straight into the right song at the right slide.
        ...presentations.flatMap((p) =>
          p.slides
            .map((s, i) => {
              const line = firstLineOf(s);
              if (line.startsWith('[')) return null; // skip blank/media-only slides
              return { id: `slide:${p.id}:${s.id}`, title: line, subtitle: `${p.title} · slide ${i + 1}`, group: 'Slides' } as QuickItem;
            })
            .filter(Boolean) as QuickItem[]
        ),
      ];
  const recentItems: QuickItem[] = recents
    .filter((r) => presentations.some((p) => p.id === r.id))
    .map((r) => ({ id: `pres:${r.id}`, title: r.title, badge: 'Recent' }));
  const onQuickSelect = (id: string) => {
    if (presId) { setLiveSlide(id); setSelectedSlideId(id); }
    else if (id.startsWith('pres:')) router.push(`/dashboard?pres=${id.slice(5)}`);
    else if (id.startsWith('setlist:')) router.push(`/dashboard/setlist?id=${id.slice(8)}`);
    else if (id.startsWith('slide:')) {
      const rest = id.slice(6);
      const sep = rest.indexOf(':');
      router.push(`/dashboard?pres=${rest.slice(0, sep)}&go=${rest.slice(sep + 1)}`);
    }
  };
  const quickFindEl = (
    <QuickFind
      open={quickFindOpen}
      onClose={() => setQuickFindOpen(false)}
      onSelect={onQuickSelect}
      items={quickItems}
      emptyStateItems={presId ? undefined : recentItems}
      emptyStateLabel="Recent"
      placeholder={presId ? 'Jump to a slide by its words…' : 'Search songs, slides & setlists…'}
      hint={presId ? 'go live' : 'open'}
    />
  );

  // ----------------------------------------------------
  // Portal View (No presentation selected)
  // ----------------------------------------------------
  if (!presId) {
    return (
      <div className="min-h-screen bg-stone-50 font-sans text-stone-900 flex flex-col relative overflow-hidden">
        {quickFindEl}
        {/* Glow effects */}
        <div className="absolute top-0 right-0 h-[600px] w-[600px] rounded-full bg-sky-200/40 blur-[130px] pointer-events-none" />
        <div className="absolute bottom-0 left-0 h-[500px] w-[500px] rounded-full bg-teal-200/40 blur-[120px] pointer-events-none" />

        <header className="sticky top-0 z-30 border-b border-stone-200 bg-white/80 backdrop-blur-md px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Logo size={36} />
            <span className="hidden sm:inline text-xs text-stone-400 font-medium border-l border-stone-200 pl-3">Presenter Portal</span>
          </div>

          <div className="flex items-center gap-4">
            {portalDemoMode && (
              <div className="flex items-center gap-1.5 rounded-full bg-amber-500/10 border border-amber-500/20 px-3 py-1 text-xs font-semibold text-amber-600">
                <AlertTriangle className="h-3.5 w-3.5" />
                <span>Demo Mode</span>
              </div>
            )}

            <button
              onClick={() => setQuickFindOpen(true)}
              className="flex items-center gap-2 rounded-xl bg-stone-100 border border-stone-200 hover:bg-stone-200 px-3 py-2 text-xs font-semibold text-stone-500 transition-all"
            >
              <Search className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Search</span>
              <kbd className="hidden sm:inline text-[10px] font-bold text-stone-400 border border-stone-300 rounded px-1">⌘K</kbd>
            </button>

            <div className="flex items-center gap-3 border-l border-stone-200 pl-4">
              <div className="text-right">
                <p className="text-xs font-bold text-stone-800">{authUser.displayName}</p>
                <p className="text-[10px] text-stone-500">{authUser.email}</p>
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

        <main className="flex-1 max-w-5xl w-full mx-auto p-6 md:py-12 flex flex-col gap-8 z-10">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-stone-200 pb-6">
            <div>
              <h2 className="text-2xl md:text-3xl font-extrabold tracking-tight bg-gradient-to-r from-stone-900 to-stone-600 bg-clip-text text-transparent">
                Worship Portal
              </h2>
              <p className="text-stone-500 text-sm mt-1">Build service presentations from your reusable song library.</p>
            </div>

            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
              {/* Tab Toggles */}
              <div className="flex items-center gap-1.5 bg-white p-1.5 rounded-xl border border-stone-200">
                <button
                  onClick={() => setActiveTab('setlists')}
                  className={`rounded-lg px-4 py-2 text-xs font-bold transition-all ${
                    activeTab === 'setlists'
                      ? 'bg-teal-600 text-white shadow-md'
                      : 'text-stone-500 hover:text-stone-800'
                  }`}
                >
                  Presentations
                </button>
                <button
                  onClick={() => setActiveTab('presentations')}
                  className={`rounded-lg px-4 py-2 text-xs font-bold transition-all ${
                    activeTab === 'presentations'
                      ? 'bg-teal-600 text-white shadow-md'
                      : 'text-stone-500 hover:text-stone-800'
                  }`}
                >
                  Song Library
                </button>
              </div>

              {activeTab === 'presentations' && (
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => router.push('/dashboard/liturgy')}
                    className="flex items-center justify-center gap-1.5 rounded-xl bg-teal-600/10 border border-teal-200 hover:bg-teal-600/20 px-4 py-2.5 text-xs font-bold text-sky-600 transition-all active:scale-[0.98]"
                  >
                    <BookOpen className="h-4 w-4 text-sky-600" />
                    <span>Liturgy Importer</span>
                  </button>

                  <button
                    onClick={() => router.push('/dashboard/import')}
                    className="flex items-center justify-center gap-1.5 rounded-xl bg-teal-600/10 border border-teal-200 hover:bg-teal-50 px-4 py-2.5 text-xs font-bold text-teal-700 transition-all active:scale-[0.98]"
                  >
                    <Sparkles className="h-4 w-4 text-teal-600" />
                    <span>AI Bulk Importer</span>
                  </button>
                </div>
              )}
            </div>
          </div>

          {activeTab === 'presentations' && !brandNudgeDismissed && presentations.length > 0 && (
            <div className="mb-6 flex items-start gap-3 rounded-2xl border border-teal-400/25 bg-teal-50 px-5 py-4 backdrop-blur-sm">
              <Stamp className="h-5 w-5 shrink-0 text-teal-600 mt-0.5" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-teal-50">Set your church branding once</p>
                <p className="text-xs text-teal-700/80 mt-0.5">
                  Add your logo, colours &amp; text style in a presentation&apos;s <span className="font-semibold">Branding</span> section, then tap <span className="font-semibold">&ldquo;Save as my default look&rdquo;</span> — every new presentation will start on-brand.
                </p>
              </div>
              <button
                onClick={() => { localStorage.setItem('hp_brand_nudge_dismissed', '1'); setBrandNudgeDismissed(true); }}
                title="Dismiss"
                className="shrink-0 rounded-lg p-1.5 text-teal-600/70 hover:text-teal-700 hover:bg-teal-100 transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-start">

            {activeTab === 'presentations' ? (
              <>
                {/* Left Column: Create & Import */}
                <div className="md:col-span-1 flex flex-col gap-6">
                  {/* Create Song Form Card */}
                  <section className="rounded-2xl border border-stone-200 bg-white p-6 backdrop-blur-xl ring-1 ring-black/5 shadow-xl">
                    <div className="flex items-center gap-2 mb-4">
                      <Plus className="h-5 w-5 text-teal-600" />
                      <h3 className="font-bold text-stone-900 text-base">New Song</h3>
                    </div>

                    <form onSubmit={handleCreatePres} className="space-y-4">
                      <div>
                        <label className="block text-xs font-semibold uppercase tracking-wider text-stone-500 mb-2">
                          Song name
                        </label>
                        <input
                          type="text"
                          required
                          placeholder="e.g. Amazing Grace"
                          value={newPresTitle}
                          onChange={(e) => setNewPresTitle(e.target.value)}
                          className="w-full rounded-xl border border-stone-200 bg-white py-3 px-4 text-sm text-stone-900 placeholder:text-stone-400 focus:border-teal-400 focus:outline-none focus:ring-1 focus:ring-teal-300 transition-all"
                        />
                      </div>

                      <button
                        type="submit"
                        disabled={isCreating}
                        className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-sky-500 to-teal-600 hover:from-sky-400 hover:to-teal-500 py-3 font-semibold text-white shadow-lg shadow-teal-500/15 active:scale-[0.98] transition-all disabled:opacity-50"
                      >
                        {isCreating ? (
                          <div className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                        ) : (
                          <span>Create Song</span>
                        )}
                      </button>
                    </form>
                  </section>

                  {/* Legacy Presentation Importer Card */}
                  <section className="rounded-2xl border border-stone-200 bg-white p-6 backdrop-blur-xl ring-1 ring-black/5 shadow-xl">
                    <div className="flex items-center gap-2 mb-4">
                      <Upload className="h-5 w-5 text-sky-600" />
                      <h3 className="font-bold text-stone-900 text-base">Legacy Importer</h3>
                    </div>

                    <div
                      onDragOver={handleDragOver}
                      onDragLeave={handleDragLeave}
                      onDrop={handleDrop}
                      onClick={() => document.getElementById('legacy-file-input')?.click()}
                      className={`border-2 border-dashed rounded-2xl p-6 text-center cursor-pointer transition-all duration-200 ${
                        isLegacyDragging
                          ? 'border-teal-400 bg-teal-50 shadow-md shadow-teal-500/10'
                          : 'border-stone-200 hover:border-teal-300 bg-white hover:bg-white'
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
                          <div className="h-6 w-6 animate-spin rounded-full border-2 border-teal-400 border-t-transparent" />
                          <span className="text-[10px] text-stone-500">Importing presentation...</span>
                        </div>
                      ) : (
                        <div className="flex flex-col items-center justify-center gap-2">
                          <FileText className={`h-8 w-8 transition-colors ${isLegacyDragging ? 'text-teal-600' : 'text-stone-500'}`} />
                          <span className="text-xs font-bold text-stone-700">
                            {isLegacyDragging ? 'Drop it here!' : 'Import .TXT or .JSON file'}
                          </span>
                          <span className="text-[9px] text-stone-500 max-w-[180px] mx-auto">
                            Drag and drop or click to browse. TXT songs are split by double-newlines.
                          </span>
                        </div>
                      )}
                    </div>
                  </section>
                </div>

                {/* Song library */}
                <div className="md:col-span-2 space-y-4">
                  {presentations.length > 0 && (
                    <div className="space-y-3">
                      <div className="flex flex-wrap items-center gap-2">
                        <div className="relative flex-1 min-w-[180px]">
                          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-stone-400" />
                          <input
                            value={librarySearch}
                            onChange={(e) => setLibrarySearch(e.target.value)}
                            placeholder="Search your songs by title or lyrics…"
                            className="w-full rounded-xl border border-stone-200 bg-white py-2 pl-9 pr-3 text-xs text-stone-800 placeholder:text-stone-400 focus:border-teal-400 focus:outline-none"
                          />
                        </div>
                        <button
                          onClick={() => setLibrarySort((s) => (s === 'az' ? 'recent' : 'az'))}
                          className="rounded-xl border border-stone-200 bg-white hover:bg-stone-100 px-3 py-2 text-[11px] font-bold text-stone-600 transition-all"
                          title="Toggle sort order"
                        >
                          {librarySort === 'az' ? 'A–Z' : 'Recent'}
                        </button>
                        <button
                          onClick={() => router.push('/dashboard/import')}
                          className="flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-sky-500 to-teal-600 hover:from-sky-400 hover:to-teal-500 px-3 py-2 text-[11px] font-bold text-white shadow-sm transition-all active:scale-[0.98]"
                        >
                          <Plus className="h-3.5 w-3.5" />Add songs
                        </button>
                      </div>
                      {allTags.length > 0 && (
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-[10px] uppercase font-bold tracking-wider text-stone-400">Tags</span>
                          <button
                            onClick={() => setTagFilter(null)}
                            className={`rounded-full px-3 py-1 text-[11px] font-bold border transition-all ${!tagFilter ? 'bg-teal-600 border-teal-600 text-white' : 'bg-white border-stone-200 text-stone-600 hover:border-stone-300'}`}
                          >All</button>
                          {allTags.map((t) => (
                            <button
                              key={t}
                              onClick={() => setTagFilter(t === tagFilter ? null : t)}
                              className={`rounded-full px-3 py-1 text-[11px] font-bold border transition-all ${t === tagFilter ? 'bg-teal-600 border-teal-600 text-white' : 'bg-white border-stone-200 text-stone-600 hover:border-stone-300'}`}
                            >{t}</button>
                          ))}
                        </div>
                      )}
                      <p className="text-[11px] text-stone-400 font-medium">{visiblePresentations.length} of {presentations.length} song{presentations.length === 1 ? '' : 's'}</p>
                    </div>
                  )}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {portalLoading ? (
                    <div className="col-span-2 py-20 flex justify-center">
                      <div className="h-8 w-8 animate-spin rounded-full border-4 border-teal-400 border-t-transparent" />
                    </div>
                  ) : presentations.length === 0 ? (
                    <div className="col-span-2 border border-dashed border-stone-200 rounded-2xl py-16 text-center text-stone-500 text-sm">
                      No presentations created yet. Use the sidebar to create one!
                    </div>
                  ) : visiblePresentations.length === 0 ? (
                    <div className="col-span-2 border border-dashed border-stone-200 rounded-2xl py-12 text-center text-stone-500 text-sm">
                      No songs match {librarySearch.trim() ? `“${librarySearch.trim()}”` : `the tag “${tagFilter}”`}.
                    </div>
                  ) : (
                    visiblePresentations.map((pres) => (
                      <div
                        key={pres.id}
                        onClick={() => router.push(`/dashboard?pres=${pres.id}`)}
                        className="group rounded-2xl border border-stone-200 bg-white p-5 hover:border-teal-300 hover:bg-stone-50 cursor-pointer shadow-lg transition-all duration-200"
                      >
                        <div className="flex justify-between items-start gap-4 mb-3">
                          <div className="flex items-center gap-2.5 min-w-0">
                            {pres.settings?.brandShow && pres.settings?.brandLogoUrl && (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img src={pres.settings.brandLogoUrl} alt="" className="h-7 w-7 shrink-0 rounded object-contain bg-stone-50 border border-stone-200" />
                            )}
                            <h4 className="font-bold text-stone-900 group-hover:text-stone-900 transition-colors truncate">
                              {pres.title}
                            </h4>
                          </div>
                          <div className="flex items-center gap-1 shrink-0">
                            <button
                              onClick={(e) => renameSong(e, pres.id, pres.title)}
                              title="Rename song"
                              className="rounded-lg p-1.5 text-stone-400 hover:text-teal-600 hover:bg-teal-50 transition-colors opacity-0 group-hover:opacity-100"
                            >
                              <Pencil className="h-4 w-4" />
                            </button>
                            <button
                              onClick={(e) => editTags(e, pres.id, pres.settings?.tags || [])}
                              title="Edit tags"
                              className="rounded-lg p-1.5 text-stone-400 hover:text-teal-600 hover:bg-teal-50 transition-colors opacity-0 group-hover:opacity-100"
                            >
                              <Tag className="h-4 w-4" />
                            </button>
                            <button
                              onClick={(e) => handleDuplicate(e, pres.id)}
                              disabled={duplicatingId === pres.id}
                              title="Duplicate presentation"
                              className="rounded-lg p-1.5 text-stone-400 hover:text-teal-600 hover:bg-teal-50 transition-colors opacity-0 group-hover:opacity-100 disabled:opacity-100"
                            >
                              {duplicatingId === pres.id ? <span className="block h-4 w-4 animate-spin rounded-full border-2 border-teal-400 border-t-transparent" /> : <Copy className="h-4 w-4" />}
                            </button>
                            <button
                              onClick={(e) => handleDeletePresentation(e, pres.id, pres.title)}
                              title="Delete presentation"
                              className="rounded-lg p-1.5 text-stone-400 hover:text-red-600 hover:bg-red-100 transition-colors opacity-0 group-hover:opacity-100"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                            <ChevronRight className="h-4 w-4 text-stone-400 group-hover:text-teal-600 group-hover:translate-x-0.5 transition-all" />
                          </div>
                        </div>

                        <div className="flex flex-wrap items-center gap-2 text-xs text-stone-500">
                          <span className="bg-stone-100 px-2.5 py-1 rounded-full border border-stone-200">
                            {pres.slides.length} {pres.slides.length === 1 ? 'slide' : 'slides'}
                          </span>
                          {pres.settings?.brandShow && (
                            <span className="flex items-center gap-1 rounded-full bg-teal-50 text-teal-700 border border-teal-200 px-2 py-0.5 font-semibold">
                              <Stamp className="h-3 w-3" />
                              Branded
                            </span>
                          )}
                          {(pres.settings?.tags || []).map((t) => (
                            <button
                              key={t}
                              onClick={(e) => { e.stopPropagation(); setTagFilter(t); }}
                              className="flex items-center gap-1 rounded-full bg-stone-100 text-stone-600 border border-stone-200 px-2 py-0.5 font-semibold hover:border-teal-300 hover:text-teal-700 transition-colors"
                            >
                              <Tag className="h-2.5 w-2.5" />{t}
                            </button>
                          ))}
                        </div>
                      </div>
                    ))
                  )}
                  </div>
                </div>
              </>
            ) : (
              <>
                {/* Left Column: Create Setlist */}
                <div className="md:col-span-1 flex flex-col gap-6">
                  <section className="rounded-2xl border border-stone-200 bg-white p-6 backdrop-blur-xl ring-1 ring-black/5 shadow-xl">
                    <div className="flex items-center gap-2 mb-4">
                      <Plus className="h-5 w-5 text-sky-600" />
                      <h3 className="font-bold text-stone-900 text-base">New Presentation</h3>
                    </div>

                    <form onSubmit={handleCreateSetlist} className="space-y-4">
                      <div>
                        <label className="block text-xs font-semibold uppercase tracking-wider text-stone-500 mb-2">
                          Presentation / service name
                        </label>
                        <input
                          type="text"
                          required
                          placeholder="e.g. Sunday Morning — 14 June"
                          value={newSetlistTitle}
                          onChange={(e) => setNewSetlistTitle(e.target.value)}
                          className="w-full rounded-xl border border-stone-200 bg-white py-3 px-4 text-sm text-stone-900 placeholder:text-stone-400 focus:border-teal-400 focus:outline-none focus:ring-1 focus:ring-teal-300 transition-all"
                        />
                      </div>
                      <p className="text-[11px] text-stone-500 -mt-1">Create it, then add songs from your library.</p>

                      <button
                        type="submit"
                        disabled={isCreating}
                        className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-sky-500 to-teal-600 hover:from-sky-400 hover:to-teal-500 py-3 font-semibold text-white shadow-lg shadow-teal-500/15 active:scale-[0.98] transition-all disabled:opacity-50"
                      >
                        {isCreating ? (
                          <div className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                        ) : (
                          <span>Create Presentation</span>
                        )}
                      </button>
                    </form>
                  </section>
                </div>

                {/* Setlists list */}
                <div className="md:col-span-2 space-y-4">
                  {setlists.length > 0 && (
                    <div className="flex flex-wrap items-center gap-2">
                      <div className="relative flex-1 min-w-[180px]">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-stone-400" />
                        <input
                          value={serviceSearch}
                          onChange={(e) => setServiceSearch(e.target.value)}
                          placeholder="Search your presentations…"
                          className="w-full rounded-xl border border-stone-200 bg-white py-2 pl-9 pr-3 text-xs text-stone-800 placeholder:text-stone-400 focus:border-teal-400 focus:outline-none"
                        />
                      </div>
                      <button
                        onClick={() => setServiceSort((s) => (s === 'az' ? 'recent' : 'az'))}
                        className="rounded-xl border border-stone-200 bg-white hover:bg-stone-100 px-3 py-2 text-[11px] font-bold text-stone-600 transition-all"
                        title="Toggle sort order"
                      >
                        {serviceSort === 'az' ? 'A–Z' : 'Recent'}
                      </button>
                      <span className="text-[11px] text-stone-400 font-medium">{visibleSetlists.length} of {setlists.length}</span>
                    </div>
                  )}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {setlistsLoading ? (
                    <div className="col-span-2 py-20 flex justify-center">
                      <div className="h-8 w-8 animate-spin rounded-full border-4 border-teal-400 border-t-transparent" />
                    </div>
                  ) : setlists.length === 0 ? (
                    <div className="col-span-2 border border-dashed border-stone-200 rounded-2xl py-16 text-center text-stone-500 text-sm">
                      No presentations yet. Create one on the left, then add songs from your Song Library.
                    </div>
                  ) : visibleSetlists.length === 0 ? (
                    <div className="col-span-2 border border-dashed border-stone-200 rounded-2xl py-12 text-center text-stone-500 text-sm">
                      No presentations match “{serviceSearch.trim()}”.
                    </div>
                  ) : (
                    visibleSetlists.map((slist) => (
                      <div
                        key={slist.id}
                        onClick={() => router.push(`/dashboard/setlist?id=${slist.id}`)}
                        className="group rounded-2xl border border-stone-200 bg-white p-5 hover:border-teal-300 hover:bg-stone-50 cursor-pointer shadow-lg transition-all duration-200"
                      >
                        <div className="flex justify-between items-start gap-4 mb-3">
                          <h4 className="font-bold text-stone-900 group-hover:text-stone-900 transition-colors truncate">
                            {slist.title}
                          </h4>
                          <div className="flex items-center gap-1 shrink-0">
                            <button
                              onClick={(e) => handleRenameSetlist(e, slist.id, slist.title)}
                              title="Rename presentation"
                              className="rounded-lg p-1.5 text-stone-400 hover:text-teal-600 hover:bg-teal-50 transition-colors opacity-0 group-hover:opacity-100"
                            >
                              <Pencil className="h-4 w-4" />
                            </button>
                            <button
                              onClick={(e) => handleDuplicateSetlist(e, slist.id)}
                              disabled={duplicatingId === slist.id}
                              title="Duplicate presentation"
                              className="rounded-lg p-1.5 text-stone-400 hover:text-teal-600 hover:bg-teal-50 transition-colors opacity-0 group-hover:opacity-100 disabled:opacity-100"
                            >
                              {duplicatingId === slist.id ? <span className="block h-4 w-4 animate-spin rounded-full border-2 border-teal-400 border-t-transparent" /> : <Copy className="h-4 w-4" />}
                            </button>
                            <button
                              onClick={(e) => handleDeleteSetlist(e, slist.id, slist.title)}
                              title="Delete presentation"
                              className="rounded-lg p-1.5 text-stone-400 hover:text-red-600 hover:bg-red-100 transition-colors opacity-0 group-hover:opacity-100"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                            <ChevronRight className="h-4 w-4 text-stone-400 group-hover:text-teal-600 group-hover:translate-x-0.5 transition-all" />
                          </div>
                        </div>

                        <div className="flex items-center gap-3 text-xs text-stone-500">
                          <span className="bg-teal-50 text-teal-700 border border-teal-200 px-2.5 py-1 rounded-full font-semibold">
                            Presentation
                          </span>
                          <span className="font-medium text-stone-500">
                            {new Date(slist.created_at || '').toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                          </span>
                        </div>
                      </div>
                    ))
                  )}
                  </div>
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
    <div className="min-h-screen bg-stone-50 font-sans text-stone-900 flex flex-col">
      {quickFindEl}
      <div className="absolute top-0 right-0 h-[500px] w-[500px] rounded-full bg-sky-200/40 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-0 left-0 h-[500px] w-[500px] rounded-full bg-teal-200/40 blur-[120px] pointer-events-none" />

      {/* Header */}
      <header className="sticky top-0 z-30 border-b border-stone-200 bg-white/80 backdrop-blur-md px-4 md:px-6 py-4 flex flex-wrap items-center justify-between gap-y-3 gap-x-4">
        <div className="flex items-center gap-4">
          <button
            onClick={() => router.push('/dashboard')}
            className="flex items-center gap-1.5 rounded-xl bg-stone-100 border border-stone-200 hover:bg-stone-200 px-3 py-2 text-xs font-bold text-stone-500 hover:text-stone-800 transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Portal</span>
          </button>
          
          <div className="h-4 w-px bg-stone-100" />

          <Logo size={30} />
          <span className="hidden sm:inline text-[10px] text-stone-400 font-medium">Presenter Dashboard</span>
        </div>

        {/* Action controls */}
        <div className="flex flex-wrap items-center gap-2 md:gap-4">
          {isDemoMode && (
            <div className="flex items-center gap-1.5 rounded-full bg-amber-500/10 border border-amber-500/20 px-3 py-1 text-xs font-semibold text-amber-600">
              <AlertTriangle className="h-3.5 w-3.5" />
              <span>Demo Mode</span>
            </div>
          )}

          <button
            onClick={() => setQuickFindOpen(true)}
            title="Jump to a slide (⌘K)"
            className="flex items-center gap-1.5 rounded-xl bg-stone-100 border border-stone-200 hover:bg-stone-200 px-4 py-2 text-xs font-bold text-stone-600 transition-all active:scale-[0.98]"
          >
            <Search className="h-4 w-4" />
            <span className="hidden md:inline">Find slide</span>
            <kbd className="hidden md:inline text-[10px] font-bold text-stone-400 border border-stone-300 rounded px-1">⌘K</kbd>
          </button>

          <button
            onClick={openProjectorWindow}
            className="flex items-center gap-1.5 rounded-xl bg-stone-100 border border-stone-200 hover:bg-stone-200 px-4 py-2 text-xs font-bold text-sky-600 transition-all active:scale-[0.98]"
          >
            <Tv className="h-4 w-4" />
            <span>Projector</span>
            <ExternalLink className="h-3 w-3" />
          </button>

          <button
            onClick={() => window.open(`/projector/stage?pres=${presId}`, '_blank')}
            className="flex items-center gap-1.5 rounded-xl bg-stone-100 border border-stone-200 hover:bg-stone-200 px-4 py-2 text-xs font-bold text-yellow-400 transition-all active:scale-[0.98]"
          >
            <LayoutGrid className="h-4 w-4" />
            <span>Stage Monitor</span>
            <ExternalLink className="h-3 w-3" />
          </button>

          <button
            onClick={() => window.open(`/dashboard/remote?pres=${presId}`, '_blank')}
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
            <span>Connect a Screen</span>
          </button>

          <div className="flex items-center gap-3 border-l border-stone-200 pl-4">
            <div className="text-right">
              <p className="text-xs font-bold text-stone-800">{authUser.displayName}</p>
              <p className="text-[10px] text-stone-500">{authUser.email}</p>
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

      {/* Main presentation dashboard workspace */}
      <div className="flex-1 p-4 md:p-6 grid grid-cols-1 lg:grid-cols-12 gap-6 lg:overflow-hidden lg:max-h-[calc(100vh-73px)]">

        {/* Left Panel: Settings & Collaborators */}
        <aside className="lg:col-span-3 flex flex-col gap-6 lg:overflow-y-auto lg:pr-2 order-2 lg:order-1">
          
          {/* Active Presentation Title */}
          <section className="rounded-2xl border border-stone-200 bg-white p-5 backdrop-blur-md">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-stone-500 mb-3">Active Presentation</h2>
            <h3 className="text-xl font-bold text-stone-900 mb-2">{presentation.title}</h3>
            <p className="text-xs text-stone-500">ID: <code className="bg-stone-50 px-1 py-0.5 rounded text-sky-600">{presentation.id}</code></p>
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

          {/* Collaborator Presence indicator */}
          <section className="rounded-2xl border border-stone-200 bg-white p-5 backdrop-blur-md flex-1">
            <div className="flex items-center gap-2 mb-4 justify-between">
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4 text-emerald-600" />
                <h2 className="text-xs font-semibold uppercase tracking-wider text-stone-700">Collaborators</h2>
              </div>
              <span className="flex h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
            </div>

            <div className="space-y-3">
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

        {/* Center Panel: Slide Queue flow */}
        <section className="lg:col-span-6 flex flex-col gap-4 lg:overflow-y-auto lg:pr-2 order-1 lg:order-2">
          {presLoading ? (
            <div className="flex-1 flex items-center justify-center py-20">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-teal-400 border-t-transparent" />
            </div>
          ) : (
            <>
              <div className="flex items-center justify-between flex-wrap gap-2">
                <h2 className="text-xs font-semibold uppercase tracking-wider text-stone-500">Running order · {presentation.slides.length} {presentation.slides.length === 1 ? 'slide' : 'slides'}</h2>
                <div className="flex items-center gap-2 flex-wrap">
                  <button
                    onClick={() => router.push(`/dashboard/import?append=${presId}`)}
                    className="flex items-center gap-1.5 rounded-lg bg-stone-100 border border-stone-200 hover:bg-stone-200 px-3 py-1.5 text-xs font-bold text-stone-700 transition-all"
                  >
                    <Sparkles className="h-3.5 w-3.5 text-teal-600" />
                    <span>Import songs</span>
                  </button>
                  <button
                    onClick={() => router.push(`/dashboard/liturgy?append=${presId}`)}
                    className="flex items-center gap-1.5 rounded-lg bg-stone-100 border border-stone-200 hover:bg-stone-200 px-3 py-1.5 text-xs font-bold text-stone-700 transition-all"
                  >
                    <BookOpen className="h-3.5 w-3.5 text-sky-600" />
                    <span>Import scripture</span>
                  </button>
                  <button
                    onClick={printRunningOrder}
                    disabled={presentation.slides.length === 0}
                    title="Print a running-order handout for the team"
                    className="flex items-center gap-1.5 rounded-lg bg-stone-100 border border-stone-200 hover:bg-stone-200 disabled:opacity-40 px-3 py-1.5 text-xs font-bold text-stone-700 transition-all"
                  >
                    <Printer className="h-3.5 w-3.5 text-emerald-600" />
                    <span>Print order</span>
                  </button>
                  <button
                    onClick={async () => { const id = await addSlide(); if (id) setSelectedSlideId(id); }}
                    className="flex items-center gap-1.5 rounded-lg bg-teal-50 border border-teal-200 hover:bg-teal-100 px-3 py-1.5 text-xs font-bold text-teal-700 transition-all active:scale-[0.98]"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    <span>Add Slide</span>
                  </button>
                </div>
              </div>

              <form
                onSubmit={(e) => { e.preventDefault(); handleQuickScripture(); }}
                className="flex items-center gap-2 rounded-xl border border-stone-200 bg-white px-3 py-2"
              >
                <BookOpen className="h-4 w-4 shrink-0 text-sky-600" />
                <input
                  type="text"
                  value={scriptureRef}
                  onChange={(e) => setScriptureRef(e.target.value)}
                  placeholder="Quick scripture — type a reference like “John 3:16” and press Add"
                  className="flex-1 bg-transparent text-xs text-stone-800 placeholder:text-stone-400 focus:outline-none"
                />
                <button
                  type="submit"
                  disabled={scriptureBusy || !scriptureRef.trim()}
                  className="rounded-lg bg-teal-600 hover:bg-teal-500 disabled:opacity-40 px-3 py-1 text-[11px] font-bold text-white transition-all"
                >
                  {scriptureBusy ? 'Adding…' : 'Add'}
                </button>
              </form>

              <p className="text-[11px] text-stone-500 -mt-1">Drag thumbnails to reorder. Click a slide to edit it; double-click to open the designer.</p>
              <div className="grid grid-cols-2 xl:grid-cols-3 gap-3">
                {presentation.slides.map((slide, idx) => {
                  const isLive = activeSlideId === slide.id;
                  const isSelected = effectiveSelectedSlideId === slide.id;
                  return (
                    <div
                      key={slide.id}
                      draggable
                      onDragStart={() => { dragIndexRef.current = idx; }}
                      onDragOver={(e) => e.preventDefault()}
                      onDrop={() => handleReorderDrop(idx)}
                      onClick={() => { setSelectedSlideId(slide.id); setEditingSlideId(slide.id); }}
                      className={`group relative rounded-xl border overflow-hidden cursor-pointer transition-all ${
                        isLive
                          ? 'border-red-500/60 ring-2 ring-red-500/30'
                          : isSelected
                            ? 'border-teal-400/60 ring-1 ring-teal-400/30'
                            : 'border-stone-200 hover:border-stone-300'
                      }`}
                    >
                      <div className="relative aspect-video bg-stone-50">
                        <SlidePreview slide={slide} settings={presentation.settings} />
                        <span className="absolute bottom-1 left-1 rounded bg-black/60 px-1.5 py-0.5 text-[9px] font-bold text-white">{idx + 1}</span>
                        {slide.audio_url && <span className="absolute bottom-1 right-1 rounded bg-black/60 px-1 py-0.5 text-[9px] text-teal-700" title="Has audio">🎵</span>}
                        {isLive && (
                          <span className="absolute top-1 left-1 rounded bg-red-500 px-1.5 py-0.5 text-[8px] font-bold text-white uppercase tracking-widest animate-pulse">Live</span>
                        )}
                        <div className="absolute inset-x-0 bottom-0 flex items-center justify-center gap-1 bg-gradient-to-t from-black/85 to-transparent pt-6 pb-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button onClick={(e) => { e.stopPropagation(); setLiveSlide(slide.id); }} title="Go Live" className={`rounded-md p-1.5 text-white ${isLive ? 'bg-red-500 pointer-events-none' : 'bg-teal-600 hover:bg-teal-500'}`}><Play className="h-3 w-3 fill-current" /></button>
                          <button onClick={(e) => { e.stopPropagation(); setSelectedSlideId(slide.id); setDesigningSlideId(slide.id); }} title="Design" className="rounded-md p-1.5 bg-stone-100 hover:bg-stone-200 text-teal-700"><Layers className="h-3 w-3" /></button>
                          <button onClick={async (e) => { e.stopPropagation(); const id = await duplicateSlide(slide.id); if (id) setSelectedSlideId(id); }} title="Duplicate" className="rounded-md p-1.5 bg-stone-100 hover:bg-stone-200 text-stone-800"><Copy className="h-3 w-3" /></button>
                          <button onClick={(e) => { e.stopPropagation(); if (presentation.slides.length <= 1) { alert('A presentation needs at least one slide.'); return; } if (confirm(`Delete slide ${idx + 1}?`)) deleteSlide(slide.id); }} title="Delete" className="rounded-md p-1.5 bg-stone-100 hover:bg-red-100 text-stone-700 hover:text-red-600"><Trash2 className="h-3 w-3" /></button>
                        </div>
                      </div>
                    </div>
                  );
                })}
                <button
                  onClick={async () => { const id = await addSlide(); if (id) setSelectedSlideId(id); }}
                  className="aspect-video rounded-xl border-2 border-dashed border-stone-200 hover:border-teal-300 hover:bg-stone-100/30 flex flex-col items-center justify-center gap-1 text-stone-500 hover:text-teal-700 transition-all"
                >
                  <Plus className="h-5 w-5" />
                  <span className="text-[10px] font-bold">Add slide</span>
                </button>
              </div>
            </>
          )}
        </section>

        {/* Right Panel: Now Live (present controls) */}
        <aside className="lg:col-span-3 flex flex-col gap-4 lg:overflow-y-auto order-3">
          {(() => {
            const liveIdx = presentation.slides.findIndex((s) => s.id === activeSlideId);
            const liveSlide = presentation.slides[liveIdx];
            const nextSlide = liveIdx >= 0 ? presentation.slides[liveIdx + 1] : undefined;
            const blank = presentation.settings.blankMode;
            const goTo = (i: number) => { const s = presentation.slides[i]; if (s) setLiveSlide(s.id); };
            return (
              <section className="rounded-2xl border border-stone-200 bg-white p-5 backdrop-blur-md">
                <div className="flex items-center gap-2 mb-3">
                  <span className={`flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[10px] font-black tracking-wider ${liveSlide ? 'bg-red-600 text-white' : 'bg-stone-100 text-stone-500'}`}>
                    <span className={`h-1.5 w-1.5 rounded-full bg-white ${liveSlide ? 'animate-pulse' : ''}`} />LIVE
                  </span>
                  <h2 className="text-xs font-semibold uppercase tracking-wider text-stone-700">On screen now</h2>
                </div>
                {/* Mirrors exactly what the audience sees, including blank/blackout/logo states */}
                <div className="relative aspect-video rounded-xl overflow-hidden ring-1 ring-white/10 mb-3 bg-stone-50">
                  {liveSlide ? (
                    <>
                      <div style={{ opacity: blank === 'clear' ? 0.05 : 1 }} className="absolute inset-0">
                        <SlidePreview slide={liveSlide} settings={presentation.settings} />
                      </div>
                      {blank === 'black' && <div className="absolute inset-0 bg-black flex items-center justify-center text-[10px] font-bold tracking-widest text-stone-400">BLACKOUT</div>}
                      {blank === 'logo' && <div className="absolute inset-0 bg-stone-50 flex items-center justify-center text-2xl">✨</div>}
                    </>
                  ) : (
                    <div className="absolute inset-0 flex items-center justify-center text-[11px] text-stone-400 px-4 text-center">Nothing live yet — press Go Live on a slide.</div>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <button onClick={() => goTo(liveIdx - 1)} disabled={liveIdx <= 0} className="flex-1 flex items-center justify-center gap-1 rounded-xl bg-stone-100 border border-stone-200 hover:bg-stone-200 py-2 text-xs font-bold text-stone-700 disabled:opacity-30">
                    <ChevronLeft className="h-4 w-4" />Prev
                  </button>
                  <span className="text-[10px] text-stone-500 w-14 text-center">{liveIdx >= 0 ? `${liveIdx + 1} / ${presentation.slides.length}` : '—'}</span>
                  <button onClick={() => goTo(liveIdx < 0 ? 0 : liveIdx + 1)} disabled={liveIdx >= presentation.slides.length - 1} className="flex-1 flex items-center justify-center gap-1 rounded-xl bg-teal-600 hover:bg-teal-500 py-2 text-xs font-bold text-white disabled:opacity-30">
                    Next<ChevronRight className="h-4 w-4" />
                  </button>
                </div>
                {nextSlide && (
                  <div className="mt-3 flex items-center gap-2.5">
                    <span className="text-[9px] uppercase font-bold tracking-widest text-stone-500 shrink-0">Next&nbsp;up</span>
                    <button onClick={() => goTo(liveIdx + 1)} className="relative w-28 aspect-video rounded-lg overflow-hidden ring-1 ring-white/10 hover:ring-teal-400/60 transition-all">
                      <SlidePreview slide={nextSlide} settings={presentation.settings} />
                    </button>
                  </div>
                )}
                <div className="mt-3 flex items-center gap-2 border-t border-stone-200 pt-3">
                  <button
                    onClick={() => setLooping((v) => !v)}
                    className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[11px] font-bold transition-all ${looping ? 'bg-teal-600 text-white' : 'bg-stone-100 border border-stone-200 text-stone-700 hover:bg-stone-200'}`}
                  >
                    {looping ? '⏸ Stop loop' : '🔁 Auto-loop'}
                  </button>
                  <span className="text-[10px] text-stone-500">every</span>
                  <input
                    type="number" min={2} max={120} value={loopSecs}
                    onChange={(e) => setLoopSecs(Math.max(2, Number(e.target.value) || 8))}
                    className="w-14 rounded-lg border border-stone-200 bg-white py-1 px-2 text-[11px] text-stone-800 focus:outline-none"
                  />
                  <span className="text-[10px] text-stone-500">sec</span>
                </div>
                <div className="mt-2 flex items-center justify-between">
                  <button
                    onClick={() => setMidiOn((v) => !v)}
                    className={`rounded-lg px-2.5 py-1 text-[10px] font-bold transition-all ${midiOn ? 'bg-emerald-600 text-white' : 'bg-stone-100 border border-stone-200 text-stone-500 hover:text-stone-800'}`}
                    title="Advance slides from a MIDI controller / foot pedal"
                  >
                    🎹 MIDI {midiOn ? 'on' : 'off'}
                  </button>
                  <span className="text-[9px] text-stone-400">Keys: ← → / space, B = blank</span>
                </div>
              </section>
            );
          })()}

          <section className="rounded-2xl border border-stone-200 bg-white p-5 backdrop-blur-md space-y-2.5">
            <span className="block text-xs text-stone-500 font-medium">Quick screen overlays</span>
            <div className="grid grid-cols-2 gap-2">
              <button onClick={() => setBlankMode(presentation.settings.blankMode === 'black' ? 'none' : 'black')} className={`rounded-xl py-2 text-[10px] font-bold border transition-all ${presentation.settings.blankMode === 'black' ? 'bg-red-50 border-red-500/50 text-red-600' : 'bg-white border-stone-200 text-stone-500 hover:border-stone-300'}`}>⚫ Blackout</button>
              <button onClick={() => setBlankMode(presentation.settings.blankMode === 'clear' ? 'none' : 'clear')} className={`rounded-xl py-2 text-[10px] font-bold border transition-all ${presentation.settings.blankMode === 'clear' ? 'bg-teal-50 border-teal-300 text-sky-600' : 'bg-white border-stone-200 text-stone-500 hover:border-stone-300'}`}>🔍 Clear text</button>
              <button onClick={() => setBlankMode(presentation.settings.blankMode === 'logo' ? 'none' : 'logo')} className={`rounded-xl py-2 text-[10px] font-bold border col-span-2 transition-all ${presentation.settings.blankMode === 'logo' ? 'bg-emerald-50 border-emerald-500/50 text-emerald-600' : 'bg-white border-stone-200 text-stone-500 hover:border-stone-300'}`}>✨ Show logo</button>
            </div>
          </section>

          <section className="rounded-2xl border border-stone-200 bg-white p-5 backdrop-blur-md space-y-2.5">
            <span className="block text-xs text-stone-500 font-medium">⏱ Pre-service countdown</span>
            {presentation.settings.countdownTarget ? (
              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    const base = Math.max(Date.now(), new Date(presentation.settings.countdownTarget as string).getTime());
                    updateSettings({ countdownTarget: new Date(base + 60000).toISOString() });
                  }}
                  className="rounded-xl bg-white border border-stone-200 py-2 px-3 text-[11px] font-bold text-stone-800 hover:border-teal-300 transition-all"
                >
                  +1 min
                </button>
                <button
                  onClick={() => updateSettings({ countdownTarget: null })}
                  className="flex-1 rounded-xl bg-red-50 border border-red-200 py-2 text-[11px] font-bold text-red-700 hover:bg-red-100 transition-all"
                >
                  ✕ Clear countdown (running)
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <input
                  type="number" min={1} max={120} value={countdownMins}
                  onChange={(e) => setCountdownMins(Math.min(120, Math.max(1, Number(e.target.value) || 5)))}
                  className="w-14 rounded-lg border border-stone-200 bg-white py-1.5 px-2 text-[11px] text-stone-800 focus:outline-none"
                />
                <span className="text-[10px] text-stone-500">min</span>
                <button
                  onClick={() => updateSettings({ countdownTarget: new Date(Date.now() + countdownMins * 60000).toISOString() })}
                  className="flex-1 rounded-xl bg-teal-600 hover:bg-teal-500 py-1.5 text-[11px] font-bold text-white transition-all"
                >
                  Start countdown
                </button>
              </div>
            )}
            <input
              type="text"
              defaultValue={presentation.settings.countdownMessage ?? ''}
              onBlur={(e) => updateSettings({ countdownMessage: e.target.value })}
              placeholder="Heading (default: “Service begins in”)"
              className="w-full rounded-lg border border-stone-200 bg-white py-1.5 px-2.5 text-[11px] text-stone-800 placeholder:text-stone-400 focus:border-teal-400 focus:outline-none"
            />
          </section>

          <section className="rounded-2xl border border-stone-200 bg-white p-5 backdrop-blur-md space-y-2.5">
            <span className="block text-xs text-stone-500 font-medium">🌐 Translate whole presentation</span>
            <div className="flex items-center gap-2">
              <select
                value={bulkLang || presentation.settings.translationLang || DEFAULT_TRANSLATION_LANG}
                onChange={(e) => setBulkLang(e.target.value)}
                disabled={!!bulkProgress}
                className="flex-1 rounded-lg border border-stone-200 bg-white py-1.5 px-2 text-[11px] text-stone-800 focus:outline-none disabled:opacity-50"
              >
                {LANGUAGES.map((l) => <option key={l.name} value={l.name}>{l.name}{l.rtl ? ' (RTL)' : ''}</option>)}
              </select>
              <button
                onClick={translateAllSlides}
                disabled={!!bulkProgress || presentation.slides.length === 0}
                className="rounded-lg bg-teal-600 hover:bg-teal-500 disabled:opacity-40 px-3 py-1.5 text-[11px] font-bold text-white transition-all"
              >
                {bulkProgress ? `${bulkProgress.done}/${bulkProgress.total}…` : 'Translate all'}
              </button>
            </div>
            <p className="text-[10px] text-stone-400">Re-translates every slide&apos;s text to the chosen language and sets it as the default.</p>
          </section>

          <section className="rounded-2xl border border-stone-200 bg-white p-5 backdrop-blur-md space-y-2.5">
            <span className="block text-xs text-stone-500 font-medium">Record the service</span>
            <RecorderButton />
            <p className="text-[10px] text-stone-400">Captures your microphone; download the audio when you stop.</p>
          </section>

          <section className="rounded-2xl border border-stone-200 bg-white p-5 backdrop-blur-md space-y-2.5">
            <span className="block text-xs text-stone-500 font-medium">Stage monitor</span>
            {([['stageShowClock', 'Show clock'], ['stageShowNext', 'Show next slide'], ['stageShowTranslation', 'Show translation']] as const).map(([key, label]) => (
              <label key={key} className="flex items-center justify-between text-[11px] text-stone-700">
                <span>{label}</span>
                <input
                  type="checkbox"
                  checked={presentation.settings[key] !== false}
                  onChange={(e) => updateSettings({ [key]: e.target.checked })}
                  className="h-4 w-4 accent-teal-600"
                />
              </label>
            ))}
            <input
              type="text"
              placeholder="Private note to stage (e.g. 'slow down')"
              defaultValue={presentation.settings.stageMessage || ''}
              onBlur={(e) => updateSettings({ stageMessage: e.target.value })}
              className="w-full rounded-lg border border-stone-200 bg-white py-1.5 px-2.5 text-[11px] text-stone-800 placeholder:text-stone-400 focus:border-teal-400 focus:outline-none"
            />
          </section>

          <section className="rounded-2xl border border-stone-200 bg-white p-5 backdrop-blur-md space-y-2.5">
            <span className="block text-xs text-stone-500 font-medium">Live poll</span>
            <PollControl activePoll={activePoll} pollCounts={pollCounts} onStart={(p) => sendPoll(p)} onEnd={() => sendPoll(null)} />
          </section>
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
            <div className="w-full max-w-md rounded-3xl border border-stone-200 bg-stone-50 p-6 shadow-2xl relative ring-1 ring-white/10 max-h-[92vh] overflow-y-auto">
              <button
                onClick={() => setIsShareModalOpen(false)}
                className="absolute top-4 right-4 rounded-full p-1.5 bg-stone-100 border border-stone-200 text-stone-500 hover:text-stone-900 transition-colors"
              >
                <X className="h-4 w-4" />
              </button>

              <div className="text-center mb-5">
                <h3 className="font-extrabold text-base text-stone-900">Connect a Screen</h3>
                <p className="text-stone-500 text-xs mt-1 max-w-xs mx-auto">
                  Open the link (or scan the code) on any device on your network — an iPad, a smart TV browser, or a laptop plugged into the projector. It stays in sync live.
                </p>
              </div>

              {/* Screen type tabs */}
              <div className="grid grid-cols-3 gap-1.5 bg-white p-1.5 rounded-xl border border-stone-200 mb-4">
                {(['projector', 'stage', 'follow'] as const).map((k) => {
                  const Icon = screens[k].icon;
                  return (
                    <button
                      key={k}
                      onClick={() => { setScreenTab(k); setCopied(false); }}
                      className={`flex items-center justify-center gap-1.5 rounded-lg py-2 text-[11px] font-bold transition-all ${
                        screenTab === k ? 'bg-teal-600 text-white shadow-md' : 'text-stone-500 hover:text-stone-800'
                      }`}
                    >
                      <Icon className="h-3.5 w-3.5" />
                      {screens[k].label}
                    </button>
                  );
                })}
              </div>

              <p className="text-center text-xs text-stone-500 mb-4 flex items-center justify-center gap-1.5">
                <ActiveIcon className="h-3.5 w-3.5 text-teal-600" />
                {active.desc}
              </p>

              {/* QR Code */}
              <div className="flex justify-center mb-4">
                <div className="bg-white p-3 rounded-2xl border border-stone-200 shadow-inner">
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
                  className="flex-1 rounded-xl border border-stone-200 bg-white py-2.5 px-3.5 text-xs text-sky-600 font-medium focus:outline-none"
                />
                <button
                  onClick={() => {
                    navigator.clipboard?.writeText(active.url);
                    setCopied(true);
                    setTimeout(() => setCopied(false), 1500);
                  }}
                  className="flex items-center gap-1.5 rounded-xl bg-teal-600 hover:bg-teal-500 px-4 text-xs font-bold text-white transition-colors"
                >
                  {copied ? <Check className="h-3.5 w-3.5" /> : null}
                  {copied ? 'Copied' : 'Copy'}
                </button>
              </div>

              {/* Open on a connected screen (projector / USB monitor) */}
              <div className="rounded-xl border border-stone-200 bg-white p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] uppercase font-bold text-stone-500">Open on a connected screen</span>
                  <button
                    onClick={async () => { setScreensList(await getScreens()); setScreensChecked(true); }}
                    className="text-[10px] font-bold text-teal-700 hover:text-teal-700"
                  >
                    Detect screens
                  </button>
                </div>
                {screensList && screensList.length > 0 ? (
                  <div className="grid grid-cols-1 gap-1.5">
                    {screensList.map((s) => (
                      <button
                        key={s.id}
                        onClick={() => openOnScreen(active.url, s)}
                        className="flex items-center justify-between rounded-lg bg-stone-100 border border-stone-200 hover:border-teal-300 px-3 py-2 text-xs font-bold text-stone-800"
                      >
                        <span className="flex items-center gap-1.5"><MonitorPlay className="h-3.5 w-3.5 text-teal-600" />{s.label}{s.isPrimary ? ' (main)' : ''}</span>
                        <span className="text-[10px] text-stone-500">{s.width}×{s.height}</span>
                      </button>
                    ))}
                  </div>
                ) : screensChecked ? (
                  <p className="text-[10px] text-stone-500">Couldn’t auto-detect screens in this browser. Use “Open on this device” below, drag the window onto your monitor, then press the fullscreen button.</p>
                ) : (
                  <p className="text-[10px] text-stone-400">Click “Detect screens” to send this directly to your projector / USB monitor (Chrome &amp; Edge).</p>
                )}
              </div>

              {/* Open on this device */}
              <button
                onClick={() => window.open(active.url, '_blank')}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-stone-100 border border-stone-200 hover:bg-stone-200 py-2.5 text-xs font-bold text-sky-600 transition-all"
              >
                <ExternalLink className="h-3.5 w-3.5" />
                Open in a window (drag to your monitor)
              </button>
            </div>
          </div>
        );
      })()}

      {/* Full-screen slide editor (all editing happens here) */}
      {(() => {
        if (!editingSlideId) return null;
        const idx = presentation.slides.findIndex((s) => s.id === editingSlideId);
        const editingSlide = presentation.slides[idx];
        if (!editingSlide) return null;
        return (
          <SlideEditor
            slide={editingSlide}
            settings={presentation.settings}
            slideIndex={idx}
            slideCount={presentation.slides.length}
            isLive={activeSlideId === editingSlide.id}
            onPrev={() => { const p = presentation.slides[idx - 1]; if (p) setEditingSlideId(p.id); }}
            onNext={() => { const n = presentation.slides[idx + 1]; if (n) setEditingSlideId(n.id); }}
            onUpdateContent={(c, t, mt, mu) => updateSlideContent(editingSlide.id, c, t, mt, mu)}
            onUpdateElements={(els) => updateSlideElements(editingSlide.id, els || [])}
            onUpdateSettings={(partial) => updateSettings(partial)}
            onSetFill={(fill) => setSlideFill(editingSlide.id, fill)}
            onSetAudio={(url, loop) => setSlideAudio(editingSlide.id, url, loop)}
            onSetAutoAdvance={(secs) => setSlideAutoAdvance(editingSlide.id, secs)}
            onSetNotes={(notes) => updateSlideSettings(editingSlide.id, { notes })}
            onSetSlideBg={(value) => updateSlideSettings(editingSlide.id, { bgColor: value })}
            onSplit={(chunks) => {
              updateSlideContent(editingSlide.id, chunks[0], editingSlide.translation, editingSlide.media_type, editingSlide.media_url);
              if (chunks.length > 1) appendSlidesToPresentation(presId!, chunks.slice(1).map((c) => ({ content: c })));
            }}
            onGoLive={() => setLiveSlide(editingSlide.id)}
            onOpenDesigner={() => setDesigningSlideId(editingSlide.id)}
            onClose={() => setEditingSlideId(null)}
          />
        );
      })()}

      {/* Free-placement Slide Designer (Phase 2) */}
      {(() => {
        if (!designingSlideId) return null;
        const designingSlide = presentation.slides.find((s) => s.id === designingSlideId);
        if (!designingSlide) return null;
        return (
          <SlideDesigner
            slide={designingSlide}
            settings={presentation.settings}
            onChange={(els) => updateSlideElements(designingSlideId, els)}
            onBgChange={(color) => updateSlideSettings(designingSlideId, { bgColor: color })}
            onClose={() => setDesigningSlideId(null)}
          />
        );
      })()}
    </div>
  );
}

export default function DashboardPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-stone-50 text-stone-800">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-teal-400 border-t-transparent" />
        </div>
      }
    >
      <DashboardContent />
    </Suspense>
  );
}
