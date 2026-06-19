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
  const { createNewPresentation, appendSlidesToPresentation } = usePresentationsPortal();
  const [currentUser, setCurrentUser] = useState<AuthIdentity | null>(null);
  const [appendTo] = useState<string | null>(() =>
    typeof window === 'undefined' ? null : new URLSearchParams(window.location.search).get('append')
  );
  
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
      <div className="flex min-h-screen items-center justify-center bg-stone-50 text-stone-800">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-teal-400 border-t-transparent" />
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

      if (appendTo) {
        const count = await appendSlidesToPresentation(appendTo, slides);
        if (count === 0) {
          throw new Error('Failed to add. Check that you are signed in and that database write access is enabled.');
        }
        setSuccess(true);
        setTimeout(() => router.push(`/dashboard?pres=${appendTo}`), 600);
        return;
      }

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
              <BookOpen className="h-4 w-4 text-white" />
            </div>
            <div>
              <h1 className="font-bold text-sm leading-none">HolyProjection</h1>
              <span className="text-[10px] text-stone-500 font-medium">Liturgy Importer</span>
            </div>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 max-w-4xl w-full mx-auto p-6 md:py-12 flex flex-col gap-6 z-10">
        <div>
          <h2 className="text-2xl md:text-3xl font-extrabold tracking-tight bg-gradient-to-r from-stone-900 to-stone-600 bg-clip-text text-transparent">
            Liturgy Automation
          </h2>
          <p className="text-stone-500 text-sm mt-1">
            Query standard lectionary daily readings or fetch custom scripture passages. Split automatically into projector-friendly slides.
          </p>
        </div>

        {errorMsg && (
          <div className="rounded-xl bg-red-50 border border-red-200 p-4 text-sm text-red-600">
            {errorMsg}
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-start">
          
          {/* Controls Panel (Col: 5) */}
          <div className="md:col-span-5 space-y-6">
            
            {/* Daily Readings Card */}
            <section className="rounded-2xl border border-stone-200 bg-white p-5 backdrop-blur-xl ring-1 ring-black/5 shadow-xl">
              <div className="flex items-center gap-2 mb-4">
                <Calendar className="h-4 w-4 text-teal-600" />
                <h3 className="font-bold text-stone-900 text-xs uppercase tracking-wider">Daily Lectionary</h3>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-[10px] uppercase font-semibold text-stone-500 mb-1.5">Select Date</label>
                  <input
                    type="date"
                    value={selectedDate}
                    onChange={(e) => setSelectedDate(e.target.value)}
                    className="w-full rounded-xl border border-stone-200 bg-white py-2.5 px-3 text-xs text-stone-900 focus:border-teal-400 focus:outline-none"
                  />
                </div>

                <div className="space-y-2">
                  <label className="block text-[10px] uppercase font-semibold text-stone-500">Today&apos;s Readings</label>
                  
                  {dailyReadings.map((reading, idx) => (
                    <button
                      key={idx}
                      onClick={() => {
                        setReference(reading.ref);
                        handleFetchScripture(reading.ref);
                      }}
                      className="flex justify-between items-center w-full p-2.5 rounded-xl bg-white border border-stone-200 hover:border-teal-200 text-left transition-colors"
                    >
                      <div>
                        <span className="text-[10px] font-bold text-stone-500 block uppercase leading-none mb-1">
                          {reading.type}
                        </span>
                        <span className="text-xs font-semibold text-stone-800">{reading.ref}</span>
                      </div>
                      <ChevronRight className="h-4 w-4 text-stone-500" />
                    </button>
                  ))}
                </div>
              </div>
            </section>

            {/* Custom Reference Card */}
            <section className="rounded-2xl border border-stone-200 bg-white p-5 backdrop-blur-xl ring-1 ring-black/5 shadow-xl">
              <div className="flex items-center gap-2 mb-4">
                <BookOpen className="h-4 w-4 text-teal-600" />
                <h3 className="font-bold text-stone-900 text-xs uppercase tracking-wider">Scripture Reference</h3>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-[10px] uppercase font-semibold text-stone-500 mb-1.5">Bible Version</label>
                  <select
                    value={translation}
                    onChange={(e) => setTranslation(e.target.value)}
                    className="w-full rounded-xl border border-stone-200 bg-stone-50 px-3 py-2.5 text-xs font-medium text-stone-700 focus:border-teal-400 focus:outline-none"
                  >
                    <option value="web">World English Bible (WEB)</option>
                    <option value="webbe">World English Bible, British (WEBBE)</option>
                    <option value="kjv">King James Version (KJV)</option>
                    <option value="bbe">Bible in Basic English (BBE)</option>
                    <option value="oeb-us">Open English Bible, US (OEB)</option>
                    <option value="oeb-cw">Open English Bible, Commonwealth</option>
                    <option value="cherokee">Cherokee New Testament</option>
                    <option value="clementine">Latin — Clementine Vulgate</option>
                    <option value="almeida">Portuguese — João Ferreira de Almeida</option>
                    <option value="rccv">Romanian — Cornilescu</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] uppercase font-semibold text-stone-500 mb-1.5">Reference Query</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. John 3:16-21 or Psalm 91"
                    value={reference}
                    onChange={(e) => setReference(e.target.value)}
                    className="w-full rounded-xl border border-stone-200 bg-white py-2.5 px-3.5 text-xs text-stone-900 placeholder:text-stone-400 focus:border-teal-400 focus:outline-none"
                  />
                </div>

                <button
                  onClick={() => handleFetchScripture(reference)}
                  disabled={isLoading || !reference.trim()}
                  className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-sky-500 to-teal-600 hover:from-sky-400 hover:to-teal-500 py-3 text-xs font-bold text-white shadow-lg shadow-teal-500/15 active:scale-[0.98] transition-all disabled:opacity-50"
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
              <div className="rounded-2xl border border-emerald-200 bg-emerald-500/5 p-8 text-center space-y-4 shadow-xl backdrop-blur-md">
                <CheckCircle2 className="h-12 w-12 text-emerald-600 mx-auto animate-bounce" />
                <h3 className="font-bold text-lg text-stone-900">Import Successful!</h3>
                <p className="text-xs text-stone-500">Your scripture slides have been compiled. Redirecting to presenter dashboard...</p>
              </div>
            ) : previewSlides.length > 0 ? (
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-stone-500">Preview formatted slides</h3>
                  <button
                    onClick={handleImport}
                    disabled={isLoading}
                    className="flex items-center gap-1.5 bg-teal-600 hover:bg-teal-500 text-xs font-bold text-white px-4 py-2 rounded-xl shadow-md active:scale-[0.98] transition-all"
                  >
                    <span>Import {previewSlides.length} slides</span>
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </div>

                <div className="space-y-4 max-h-[500px] overflow-y-auto pr-2">
                  {previewSlides.map((slide, index) => (
                    <div
                      key={index}
                      className="rounded-2xl border border-stone-200 bg-white p-5 space-y-2.5"
                    >
                      <span className="text-[10px] font-bold text-stone-500 uppercase tracking-widest block">
                        Slide {index + 1}: {slide.label}
                      </span>
                      <p className="text-xs leading-relaxed text-stone-800 whitespace-pre-line">
                        {slide.content}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="rounded-2xl border border-dashed border-stone-200 py-32 text-center text-stone-500 text-xs flex flex-col items-center justify-center gap-3">
                <BookOpen className="h-10 w-10 text-stone-800" />
                <span>Select a daily reading or enter a reference to preview slides.</span>
              </div>
            )}
          </div>

        </div>
      </main>
    </div>
  );
}
