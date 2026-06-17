'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { resolveAuth, type AuthIdentity } from '@/utils/auth';
import { usePresentationsPortal } from '@/utils/sync';
import { ArrowLeft, BookOpen, Calendar, CheckCircle2, ChevronRight } from 'lucide-react';

interface Verse {
  book_name: string;
  chapter: number;
  verse: number;
  text: string;
}

interface BibleApiResponse {
  reference: string;
  verses: Verse[];
  text: string;
  translation_name: string;
}

interface ScriptureSlide {
  label: string;
  content: string;
  translation: string;
}

function errorMessage(err: unknown, fallback: string): string {
  return err instanceof Error ? err.message : fallback;
}

export default function LiturgyPage() {
  const router = useRouter();
  const { createNewPresentation } = usePresentationsPortal();
  const [currentUser, setCurrentUser] = useState<AuthIdentity | null>(null);
  
  // Importer State
  const [reference, setReference] = useState('');
  const [translation, setTranslation] = useState('web'); // World English Bible (default)
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [previewSlides, setPreviewSlides] = useState<ScriptureSlide[]>([]);
  const [title, setTitle] = useState('');

  // Daily Lectionary Readings database
  const getDailyLectionary = (dateString: string) => {
    // Basic calendar parser mapping dates to daily readings
    const date = new Date(dateString);
    const dayOfWeek = date.getDay(); // 0 = Sunday, 6 = Saturday

    const SundayLectionary = [
      { type: 'Psalm', ref: 'Psalm 23:1-6' },
      { type: 'Epistle', ref: 'Romans 8:28-39' },
      { type: 'Gospel', ref: 'John 14:1-14' }
    ];

    const WeekdayLectionary = [
      { type: 'Psalm', ref: 'Psalm 121:1-8' },
      { type: 'Old Testament', ref: 'Proverbs 3:1-12' },
      { type: 'Gospel', ref: 'Matthew 5:1-12' }
    ];

    return dayOfWeek === 0 ? SundayLectionary : WeekdayLectionary;
  };

  const [selectedDate, setSelectedDate] = useState(() => {
    const today = new Date();
    return today.toISOString().split('T')[0];
  });

  const dailyReadings = getDailyLectionary(selectedDate);

  useEffect(() => {
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
      <div className="flex min-h-screen items-center justify-center bg-slate-950 text-slate-200">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-violet-500 border-t-transparent" />
      </div>
    );
  }

  // Fetch scripture from bible-api.com and split into slides
  const handleFetchScripture = async (refQuery: string) => {
    if (!refQuery.trim()) return;
    setIsLoading(true);
    setErrorMsg(null);
    setPreviewSlides([]);

    try {
      const formattedRef = encodeURIComponent(refQuery.trim());
      const response = await fetch(`https://bible-api.com/${formattedRef}?translation=${translation}`);
      
      if (!response.ok) {
        throw new Error('Scripture reference not found. Please verify spelling (e.g. "Romans 8:28-39").');
      }

      const data = (await response.json()) as BibleApiResponse;

      if (!data.verses || data.verses.length === 0) {
        throw new Error('No verses returned for this reference.');
      }

      setTitle(data.reference);

      // Auto-chunking: Group every 3 verses per slide
      const chunkedSlides: ScriptureSlide[] = [];
      const versesPerSlide = 3;

      for (let i = 0; i < data.verses.length; i += versesPerSlide) {
        const verseGroup = data.verses.slice(i, i + versesPerSlide);
        
        // Assemble English content
        const content = verseGroup.map(v => `${v.verse}. ${v.text.trim()}`).join('\n\n');
        
        // Create descriptive label/title for slide
        const startVerse = verseGroup[0].verse;
        const endVerse = verseGroup[verseGroup.length - 1].verse;
        const bookName = verseGroup[0].book_name;
        const chapter = verseGroup[0].chapter;
        const label = `${bookName} ${chapter}:${startVerse}-${endVerse}`;

        // Basic Arabic placeholder. Translation can be populated or edited later.
        const translationText = `[الترجمة العربية لآيات ${bookName} ${chapter}:${startVerse}-${endVerse}]`;

        chunkedSlides.push({
          label,
          content,
          translation: translationText
        });
      }

      setPreviewSlides(chunkedSlides);
    } catch (err: unknown) {
      console.error(err);
      setErrorMsg(errorMessage(err, 'Failed to fetch scripture.'));
    } finally {
      setIsLoading(false);
    }
  };

  // Save the structured slides via the authenticated client (handles both
  // demo localStorage mode and Supabase cloud mode, and sets created_by from
  // the session so the insert satisfies row-level security).
  const handleImport = async () => {
    if (previewSlides.length === 0) return;
    setIsLoading(true);
    setErrorMsg(null);

    try {
      const slides = previewSlides.map((slide) => ({
        content: slide.content,
        translation: slide.translation,
      }));
      const newPresId = await createNewPresentation(`Scripture: ${title}`, slides);

      if (!newPresId) {
        throw new Error('Failed to save. Check that you are signed in and that database write access is enabled.');
      }

      setSuccess(true);
      setTimeout(() => {
        router.push(`/dashboard?pres=${newPresId}`);
      }, 800);
    } catch (err: unknown) {
      console.error(err);
      setErrorMsg(errorMessage(err, 'Failed to save presentation.'));
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
              <BookOpen className="h-4 w-4 text-white" />
            </div>
            <div>
              <h1 className="font-bold text-sm leading-none">HolyProjection</h1>
              <span className="text-[10px] text-slate-500 font-medium">Liturgy Importer</span>
            </div>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 max-w-4xl w-full mx-auto p-6 md:py-12 flex flex-col gap-6 z-10">
        <div>
          <h2 className="text-2xl md:text-3xl font-extrabold tracking-tight bg-gradient-to-r from-white via-slate-100 to-slate-400 bg-clip-text text-transparent">
            Liturgy Automation
          </h2>
          <p className="text-slate-400 text-sm mt-1">
            Query standard lectionary daily readings or fetch custom scripture passages. Split automatically into projector-friendly slides.
          </p>
        </div>

        {errorMsg && (
          <div className="rounded-xl bg-red-950/40 border border-red-500/30 p-4 text-sm text-red-400">
            {errorMsg}
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-start">
          
          {/* Controls Panel (Col: 5) */}
          <div className="md:col-span-5 space-y-6">
            
            {/* Daily Readings Card */}
            <section className="rounded-2xl border border-slate-900 bg-slate-900/35 p-5 backdrop-blur-xl ring-1 ring-white/5 shadow-xl">
              <div className="flex items-center gap-2 mb-4">
                <Calendar className="h-4 w-4 text-violet-400" />
                <h3 className="font-bold text-white text-xs uppercase tracking-wider">Daily Lectionary</h3>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-[10px] uppercase font-semibold text-slate-500 mb-1.5">Select Date</label>
                  <input
                    type="date"
                    value={selectedDate}
                    onChange={(e) => setSelectedDate(e.target.value)}
                    className="w-full rounded-xl border border-slate-800 bg-slate-950/60 py-2.5 px-3 text-xs text-slate-100 focus:border-violet-500 focus:outline-none"
                  />
                </div>

                <div className="space-y-2">
                  <label className="block text-[10px] uppercase font-semibold text-slate-500">Today&apos;s Readings</label>
                  
                  {dailyReadings.map((reading, idx) => (
                    <button
                      key={idx}
                      onClick={() => {
                        setReference(reading.ref);
                        handleFetchScripture(reading.ref);
                      }}
                      className="flex justify-between items-center w-full p-2.5 rounded-xl bg-slate-950/40 border border-slate-900/80 hover:border-violet-500/20 text-left transition-colors"
                    >
                      <div>
                        <span className="text-[10px] font-bold text-slate-500 block uppercase leading-none mb-1">
                          {reading.type}
                        </span>
                        <span className="text-xs font-semibold text-slate-200">{reading.ref}</span>
                      </div>
                      <ChevronRight className="h-4 w-4 text-slate-700" />
                    </button>
                  ))}
                </div>
              </div>
            </section>

            {/* Custom Reference Card */}
            <section className="rounded-2xl border border-slate-900 bg-slate-900/35 p-5 backdrop-blur-xl ring-1 ring-white/5 shadow-xl">
              <div className="flex items-center gap-2 mb-4">
                <BookOpen className="h-4 w-4 text-violet-400" />
                <h3 className="font-bold text-white text-xs uppercase tracking-wider">Scripture Reference</h3>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-[10px] uppercase font-semibold text-slate-500 mb-1.5">Bible Version</label>
                  <select
                    value={translation}
                    onChange={(e) => setTranslation(e.target.value)}
                    className="w-full rounded-xl border border-slate-800 bg-slate-950 px-3 py-2.5 text-xs font-medium text-slate-300 focus:border-violet-500 focus:outline-none"
                  >
                    <option value="web">World English Bible (WEB)</option>
                    <option value="kjv">King King James Version (KJV)</option>
                    <option value="oeb">Open English Bible (OEB)</option>
                    <option value="almeida">Almeida (Portuguese)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] uppercase font-semibold text-slate-500 mb-1.5">Reference Query</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. John 3:16-21 or Psalm 91"
                    value={reference}
                    onChange={(e) => setReference(e.target.value)}
                    className="w-full rounded-xl border border-slate-800 bg-slate-950/60 py-2.5 px-3.5 text-xs text-slate-100 placeholder:text-slate-700 focus:border-violet-500 focus:outline-none"
                  />
                </div>

                <button
                  onClick={() => handleFetchScripture(reference)}
                  disabled={isLoading || !reference.trim()}
                  className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 py-3 text-xs font-bold text-white shadow-lg shadow-indigo-500/20 active:scale-[0.98] transition-all disabled:opacity-50"
                >
                  {isLoading ? (
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  ) : (
                    <span>Fetch & Format Scripture</span>
                  )}
                </button>
              </div>
            </section>

          </div>

          {/* Preview Panel (Col: 7) */}
          <div className="md:col-span-7">
            {success ? (
              <div className="rounded-2xl border border-emerald-950/40 bg-emerald-500/5 p-8 text-center space-y-4 shadow-xl backdrop-blur-md">
                <CheckCircle2 className="h-12 w-12 text-emerald-400 mx-auto animate-bounce" />
                <h3 className="font-bold text-lg text-white">Import Successful!</h3>
                <p className="text-xs text-slate-400">Your scripture slides have been compiled. Redirecting to presenter dashboard...</p>
              </div>
            ) : previewSlides.length > 0 ? (
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500">Preview formatted slides</h3>
                  <button
                    onClick={handleImport}
                    disabled={isLoading}
                    className="flex items-center gap-1.5 bg-violet-600 hover:bg-violet-500 text-xs font-bold text-white px-4 py-2 rounded-xl shadow-md active:scale-[0.98] transition-all"
                  >
                    <span>Import {previewSlides.length} slides</span>
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </div>

                <div className="space-y-4 max-h-[500px] overflow-y-auto pr-2">
                  {previewSlides.map((slide, index) => (
                    <div
                      key={index}
                      className="rounded-2xl border border-slate-900 bg-slate-900/20 p-5 space-y-2.5"
                    >
                      <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block">
                        Slide {index + 1}: {slide.label}
                      </span>
                      <p className="text-xs leading-relaxed text-slate-200 whitespace-pre-line">
                        {slide.content}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="rounded-2xl border border-dashed border-slate-900 py-32 text-center text-slate-500 text-xs flex flex-col items-center justify-center gap-3">
                <BookOpen className="h-10 w-10 text-slate-800" />
                <span>Select a daily reading or enter a reference to preview slides.</span>
              </div>
            )}
          </div>

        </div>
      </main>
    </div>
  );
}
