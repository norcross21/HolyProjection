'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { resolveAuth, type AuthIdentity } from '@/utils/auth';
import { usePresentationsPortal } from '@/utils/sync';
import { ArrowLeft, Sparkles, AlertTriangle, FileText, CheckCircle2, ChevronRight } from 'lucide-react';

interface ImportedSlide {
  content: string;
  translation?: string | null;
}

interface ImportedSong {
  title: string;
  slides: ImportedSlide[];
}

interface ImportResult {
  error?: string;
  data?: ImportedSong[];
}

interface SavedImport {
  id: string;
  title: string;
  slidesCount: number;
}

function errorMessage(err: unknown, fallback: string): string {
  return err instanceof Error ? err.message : fallback;
}

export default function ImportPage() {
  const router = useRouter();
  const { createNewPresentation, appendSlidesToPresentation } = usePresentationsPortal();
  const [text, setText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [currentUser, setCurrentUser] = useState<AuthIdentity | null>(null);
  const [importedSongs, setImportedSongs] = useState<SavedImport[]>([]);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [appendTo] = useState<string | null>(() =>
    typeof window === 'undefined' ? null : new URLSearchParams(window.location.search).get('append')
  );

  useEffect(() => {
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

  if (!currentUser) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-stone-50 text-stone-800">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-teal-400 border-t-transparent" />
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
      // The route only PARSES the text (AI or rule-based) and returns songs.
      const res = await fetch('/api/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text }),
      });

      const result = (await res.json()) as ImportResult;
      if (!res.ok) throw new Error(result.error || 'Failed to import songs.');

      const songs = result.data || [];
      if (songs.length === 0) {
        throw new Error('No songs could be parsed from that text.');
      }

      // Insert here, in the browser, so the writes run under the user's
      // authenticated session and satisfy Supabase row-level security
      // (the server route uses the anon key and would be blocked).
      if (appendTo) {
        // Append all parsed slides into the current presentation.
        const allSlides = songs.flatMap((song) =>
          (song.slides || []).map((s) => ({ content: s.content, translation: s.translation || undefined }))
        );
        const count = await appendSlidesToPresentation(appendTo, allSlides);
        if (count === 0) {
          throw new Error('Parsing succeeded but saving failed. Check that you are signed in and that database write access is enabled.');
        }
        router.push(`/dashboard?pres=${appendTo}`);
        return;
      }

      const imported: SavedImport[] = [];
      for (const song of songs) {
        const slides = (song.slides || []).map((s) => ({
          content: s.content,
          translation: s.translation || undefined,
        }));
        const newId = await createNewPresentation(song.title, slides);
        if (newId) {
          imported.push({ id: newId, title: song.title, slidesCount: slides.length });
        }
      }

      if (imported.length === 0) {
        throw new Error('Parsing succeeded but saving failed. Check that you are signed in and that database write access is enabled.');
      }

      setImportedSongs(imported);
      setSuccess(true);
      setText('');
    } catch (err: unknown) {
      console.error(err);
      setErrorMsg(errorMessage(err, 'An error occurred during import.'));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-stone-50 font-sans text-stone-900 flex flex-col relative overflow-hidden">
      {/* Glow effects */}
      <div className="absolute top-0 right-0 h-[500px] w-[500px] rounded-full bg-sky-200/40 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-0 left-0 h-[500px] w-[500px] rounded-full bg-teal-200/40 blur-[120px] pointer-events-none" />

      {/* Header */}
      <header className="sticky top-0 z-30 border-b border-stone-200 bg-white/80 backdrop-blur-md px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            onClick={() => router.push(appendTo ? `/dashboard?pres=${appendTo}` : '/dashboard')}
            className="flex items-center gap-1.5 rounded-xl bg-stone-100 border border-stone-200 hover:bg-stone-200 px-3 py-2 text-xs font-bold text-stone-500 hover:text-stone-800 transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Portal</span>
          </button>
          
          <div className="h-4 w-px bg-stone-100" />

          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-tr from-sky-500 to-teal-600 shadow-md shadow-teal-500/15">
              <Sparkles className="h-4 w-4 text-white animate-pulse" />
            </div>
            <div>
              <h1 className="font-bold text-sm leading-none">HolyProjection</h1>
              <span className="text-[10px] text-stone-500 font-medium">AI Song Importer</span>
            </div>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 max-w-3xl w-full mx-auto p-6 md:py-12 flex flex-col gap-6 z-10">
        <div>
          <h2 className="text-2xl md:text-3xl font-extrabold tracking-tight bg-gradient-to-r from-stone-900 to-stone-600 bg-clip-text text-transparent">
            Bulk AI Importer
          </h2>
          <p className="text-stone-500 text-sm mt-1">
            Paste a massive document of worship songs. Our AI (Gemini 2.5 Flash) will split multiple songs, format them into individual slides, and map bilingual translations automatically.
          </p>
        </div>

        {errorMsg && (
          <div className="rounded-xl bg-red-50 border border-red-200 p-4 text-sm text-red-600">
            {errorMsg}
          </div>
        )}

        {/* Success View */}
        {success ? (
          <div className="rounded-2xl border border-stone-200 bg-white p-8 shadow-2xl backdrop-blur-xl ring-1 ring-black/5 space-y-6 animate-slide-up">
            <div className="flex items-center gap-3">
              <CheckCircle2 className="h-8 w-8 text-emerald-600 shrink-0" />
              <div>
                <h3 className="font-bold text-lg text-stone-900">Import Successful!</h3>
                <p className="text-xs text-stone-500">Your songs have been structured and saved.</p>
              </div>
            </div>

            <div className="border-t border-stone-200/80 my-4 pt-4 space-y-3">
              <h4 className="text-xs font-semibold uppercase tracking-wider text-stone-500">Imported Songs List</h4>
              
              <div className="space-y-2.5 max-h-[200px] overflow-y-auto pr-2">
                {importedSongs.map((song) => (
                  <div
                    key={song.id}
                    onClick={() => router.push(`/dashboard?pres=${song.id}`)}
                    className="flex justify-between items-center p-3 rounded-xl bg-white border border-stone-200 hover:border-teal-300 cursor-pointer transition-all duration-150"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <FileText className="h-4 w-4 text-teal-600 shrink-0" />
                      <span className="text-sm font-bold text-stone-800 truncate">{song.title}</span>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-stone-500 bg-stone-100 border border-stone-200 px-2 py-0.5 rounded-full">
                        {song.slidesCount} slides
                      </span>
                      <ChevronRight className="h-3.5 w-3.5 text-stone-400" />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex gap-4">
              <button
                onClick={() => setSuccess(false)}
                className="flex-1 py-3.5 border border-stone-200 bg-white hover:bg-stone-100 text-sm font-bold rounded-xl active:scale-[0.98] transition-all"
              >
                Import More Songs
              </button>
              <button
                onClick={() => router.push(appendTo ? `/dashboard?pres=${appendTo}` : '/dashboard')}
                className="flex-1 py-3.5 bg-gradient-to-r from-sky-500 to-teal-600 hover:from-sky-400 hover:to-teal-500 text-sm font-bold text-white rounded-xl shadow-lg shadow-teal-500/15 active:scale-[0.98] transition-all"
              >
                Go to Dashboard
              </button>
            </div>
          </div>
        ) : (
          /* Form View */
          <form onSubmit={handleImport} className="space-y-6">
            <div className="rounded-2xl border border-stone-200 bg-white p-6 backdrop-blur-md space-y-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-stone-500 mb-2">
                  Paste Messy Lyrics / Songs
                </label>
                
                <textarea
                  required
                  placeholder="Paste your lyrics document here...&#10;&#10;Example:&#10;Song Title: Amazing Grace&#10;Verse 1&#10;Amazing grace how sweet the sound...&#10;&#10;Chorus&#10;My chains are gone...&#10;&#10;Title: 10,000 Reasons&#10;Bless the Lord O my soul..."
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  disabled={isLoading}
                  className="w-full h-80 rounded-xl border border-stone-200 bg-white p-4 text-sm leading-relaxed text-stone-800 placeholder:text-stone-400 focus:border-teal-400 focus:outline-none focus:ring-1 focus:ring-teal-300 transition-all font-mono"
                />
              </div>

              {!process.env.GEMINI_API_KEY && (
                <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-3 text-xs text-amber-700 flex items-start gap-2.5">
                  <AlertTriangle className="h-4.5 w-4.5 text-amber-600 shrink-0" />
                  <span>
                    No <code className="bg-stone-50 px-1 py-0.5 rounded text-amber-250">GEMINI_API_KEY</code> detected in environment variables. The importer will run using the offline rule-based parser fallback. To enable full AI parsing, configure `GEMINI_API_KEY` on Vercel or in `.env.local`.
                  </span>
                </div>
              )}
            </div>

            <button
              type="submit"
              disabled={isLoading || !text.trim()}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-sky-500 to-teal-600 hover:from-sky-400 hover:to-teal-500 py-3.5 font-bold text-white shadow-lg shadow-teal-500/15 active:scale-[0.98] transition-all disabled:opacity-50"
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
