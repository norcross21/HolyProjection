'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { resolveAuth } from '@/utils/auth';
import { ArrowLeft, Sparkles, AlertTriangle, FileText, CheckCircle2, ChevronRight, CornerDownLeft } from 'lucide-react';

export default function ImportPage() {
  const router = useRouter();
  const [text, setText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isClient, setIsClient] = useState(false);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [importedSongs, setImportedSongs] = useState<any[]>([]);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    setIsClient(true);
    // Require a real session in cloud mode; localStorage profile only in demo mode
    const checkAuth = async () => {
      const identity = await resolveAuth();
      if (!identity) {
        router.push('/login');
      } else {
        setCurrentUser(identity);
      }
    };
    checkAuth();
  }, [router]);

  if (!isClient || !currentUser) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-950 text-slate-200">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-violet-500 border-t-transparent" />
      </div>
    );
  }

  const handleImport = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim()) return;

    setIsLoading(true);
    setErrorMsg(null);
    setSuccess(false);

    try {
      const res = await fetch('/api/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text,
          userId: currentUser.id || null,
        }),
      });

      const result = await res.json();
      if (!res.ok) throw new Error(result.error || 'Failed to import songs.');

      if (result.success) {
        if (result.mode === 'demo') {
          // Demo Mode: Save parsed songs to local storage
          const stored = localStorage.getItem('holyproj_all_pres');
          const currentList = stored ? JSON.parse(stored) : [];
          
          const newPresentations = result.data.map((song: any) => ({
            id: `demo-presentation-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
            title: song.title,
            settings: {
              fontSize: 48,
              background: '#0f172a',
              margin: 8,
              fontFamily: 'Inter',
            },
            slides: song.slides.map((s: any, idx: number) => ({
              id: `slide-${Date.now()}-${Math.random().toString(36).substr(2, 4)}-${idx}`,
              order_index: idx,
              content: s.content,
              translation: s.translation || null,
            })),
          }));

          const updated = [...newPresentations, ...currentList];
          localStorage.setItem('holyproj_all_pres', JSON.stringify(updated));

          setImportedSongs(newPresentations.map((p: any) => ({
            id: p.id,
            title: p.title,
            slidesCount: p.slides.length
          })));
        } else {
          // Supabase Mode
          setImportedSongs(result.imported || []);
        }

        setSuccess(true);
        setText('');
      }
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || 'An error occurred during import.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 font-sans text-slate-100 flex flex-col relative overflow-hidden">
      {/* Glow effects */}
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
              <Sparkles className="h-4 w-4 text-white animate-pulse" />
            </div>
            <div>
              <h1 className="font-bold text-sm leading-none">HolyProjection</h1>
              <span className="text-[10px] text-slate-500 font-medium">AI Song Importer</span>
            </div>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 max-w-3xl w-full mx-auto p-6 md:py-12 flex flex-col gap-6 z-10">
        <div>
          <h2 className="text-2xl md:text-3xl font-extrabold tracking-tight bg-gradient-to-r from-white via-slate-100 to-slate-400 bg-clip-text text-transparent">
            Bulk AI Importer
          </h2>
          <p className="text-slate-400 text-sm mt-1">
            Paste a massive document of worship songs. Our AI (Gemini 2.5 Flash) will split multiple songs, format them into individual slides, and map bilingual translations automatically.
          </p>
        </div>

        {errorMsg && (
          <div className="rounded-xl bg-red-950/40 border border-red-500/30 p-4 text-sm text-red-400">
            {errorMsg}
          </div>
        )}

        {/* Success View */}
        {success ? (
          <div className="rounded-2xl border border-slate-900 bg-slate-900/40 p-8 shadow-2xl backdrop-blur-xl ring-1 ring-white/5 space-y-6 animate-slide-up">
            <div className="flex items-center gap-3">
              <CheckCircle2 className="h-8 w-8 text-emerald-400 shrink-0" />
              <div>
                <h3 className="font-bold text-lg text-white">Import Successful!</h3>
                <p className="text-xs text-slate-400">Your songs have been structured and saved.</p>
              </div>
            </div>

            <div className="border-t border-slate-800/80 my-4 pt-4 space-y-3">
              <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-500">Imported Songs List</h4>
              
              <div className="space-y-2.5 max-h-[200px] overflow-y-auto pr-2">
                {importedSongs.map((song) => (
                  <div
                    key={song.id}
                    onClick={() => router.push(`/dashboard?pres=${song.id}`)}
                    className="flex justify-between items-center p-3 rounded-xl bg-slate-950/60 border border-slate-900 hover:border-violet-500/30 cursor-pointer transition-all duration-150"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <FileText className="h-4 w-4 text-violet-400 shrink-0" />
                      <span className="text-sm font-bold text-slate-200 truncate">{song.title}</span>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-slate-500 bg-slate-900 border border-slate-850 px-2 py-0.5 rounded-full">
                        {song.slidesCount} slides
                      </span>
                      <ChevronRight className="h-3.5 w-3.5 text-slate-650" />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex gap-4">
              <button
                onClick={() => setSuccess(false)}
                className="flex-1 py-3.5 border border-slate-800 bg-slate-950/40 hover:bg-slate-900 text-sm font-bold rounded-xl active:scale-[0.98] transition-all"
              >
                Import More Songs
              </button>
              <button
                onClick={() => router.push('/dashboard')}
                className="flex-1 py-3.5 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-sm font-bold text-white rounded-xl shadow-lg shadow-indigo-500/20 active:scale-[0.98] transition-all"
              >
                Go to Dashboard
              </button>
            </div>
          </div>
        ) : (
          /* Form View */
          <form onSubmit={handleImport} className="space-y-6">
            <div className="rounded-2xl border border-slate-900 bg-slate-900/20 p-6 backdrop-blur-md space-y-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
                  Paste Messy Lyrics / Songs
                </label>
                
                <textarea
                  required
                  placeholder="Paste your lyrics document here...&#10;&#10;Example:&#10;Song Title: Amazing Grace&#10;Verse 1&#10;Amazing grace how sweet the sound...&#10;&#10;Chorus&#10;My chains are gone...&#10;&#10;Title: 10,000 Reasons&#10;Bless the Lord O my soul..."
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  disabled={isLoading}
                  className="w-full h-80 rounded-xl border border-slate-800 bg-slate-950/60 p-4 text-sm leading-relaxed text-slate-200 placeholder:text-slate-700 focus:border-violet-500 focus:outline-none focus:ring-1 focus:ring-violet-500 transition-all font-mono"
                />
              </div>

              {!process.env.GEMINI_API_KEY && (
                <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-3 text-xs text-amber-300 flex items-start gap-2.5">
                  <AlertTriangle className="h-4.5 w-4.5 text-amber-400 shrink-0" />
                  <span>
                    No <code className="bg-slate-950 px-1 py-0.5 rounded text-amber-250">GEMINI_API_KEY</code> detected in environment variables. The importer will run using the offline rule-based parser fallback. To enable full AI parsing, configure `GEMINI_API_KEY` on Vercel or in `.env.local`.
                  </span>
                </div>
              )}
            </div>

            <button
              type="submit"
              disabled={isLoading || !text.trim()}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 py-3.5 font-bold text-white shadow-lg shadow-indigo-500/20 active:scale-[0.98] transition-all disabled:opacity-50"
            >
              {isLoading ? (
                <div className="flex items-center gap-2.5">
                  <div className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  <span>Gemini is parsing and structuring songs...</span>
                </div>
              ) : (
                <>
                  <Sparkles className="h-5 w-5" />
                  <span>Parse & Import with AI</span>
                </>
              )}
            </button>
          </form>
        )}
      </main>
    </div>
  );
}
