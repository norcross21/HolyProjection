'use client';

import { useState, useRef, type ComponentType, type ReactNode } from 'react';
import { Slide, Presentation, saveBrandPreset, getBrandPreset, clearBrandPreset } from '@/utils/sync';
import SlidePreview from '@/components/SlidePreview';
import MediaLibrary from '@/components/MediaLibrary';
import { LANGUAGES, dirFor, DEFAULT_TRANSLATION_LANG } from '@/utils/languages';
import { FONTS } from '@/utils/fonts';
import { splitLyricsIntoSlides } from '@/utils/lyrics';
import { BACKGROUNDS } from '@/utils/backgrounds';
import {
  ArrowLeft, ChevronLeft, ChevronRight, Play, Layers, Sparkles, Languages, Type, Image as ImageIcon, Music, Palette, Scissors, Timer, Stamp, StickyNote,
} from 'lucide-react';
import { THEMES } from '@/utils/themes';

interface SlideEditorProps {
  slide: Slide;
  settings: Presentation['settings'];
  slideIndex: number;
  slideCount: number;
  isLive: boolean;
  onPrev: () => void;
  onNext: () => void;
  onUpdateContent: (content: string, translation: string | undefined, mediaType: Slide['media_type'], mediaUrl: string | undefined) => void;
  onUpdateElements: (elements: Slide['elements']) => void;
  onUpdateSettings: (partial: Partial<Presentation['settings']>) => void;
  onSetFill: (fill: boolean) => void;
  onSetAudio: (url: string | undefined, loop: boolean) => void;
  onSetAutoAdvance: (secs: number) => void;
  onSetNotes: (notes: string) => void;
  onSetSlideBg: (value: string | undefined) => void;
  onSplit: (chunks: string[]) => void;
  onGoLive: () => void;
  onOpenDesigner: () => void;
  onClose: () => void;
}

interface TranslateResponse {
  success?: boolean;
  translation?: string;
  error?: string;
}

interface SectionProps {
  icon: ComponentType<{ className?: string }>;
  title: string;
  children: ReactNode;
}

function Section({ icon: Icon, title, children }: SectionProps) {
  return (
    <section className="rounded-2xl border border-stone-200 bg-stone-100/30 p-4 space-y-3">
      <div className="flex items-center gap-2"><Icon className="h-4 w-4 text-teal-600" /><h3 className="text-xs font-bold uppercase tracking-wider text-stone-700">{title}</h3></div>
      {children}
    </section>
  );
}

export default function SlideEditor(props: SlideEditorProps) {
  const { slide, settings, slideIndex, slideCount, isLive } = props;
  const [isTranslating, setIsTranslating] = useState(false);
  const [presetMsg, setPresetMsg] = useState<string | null>(null);
  const [hasPreset, setHasPreset] = useState(() => !!getBrandPreset());
  const translationLang = settings.translationLang || DEFAULT_TRANSLATION_LANG;

  const handleSavePreset = () => {
    saveBrandPreset(settings);
    setHasPreset(true);
    setPresetMsg('Saved — new presentations will use this look.');
    setTimeout(() => setPresetMsg(null), 3500);
  };
  const handleClearPreset = () => {
    clearBrandPreset();
    setHasPreset(false);
    setPresetMsg('Default cleared.');
    setTimeout(() => setPresetMsg(null), 3500);
  };

  // Keep any placed lyric/translation text boxes (designer elements) in sync.
  const syncRole = (role: 'lyrics' | 'translation', value: string) => {
    const els = slide.elements;
    if (els && els.some((e) => e.role === role)) {
      props.onUpdateElements(els.map((e) => (e.role === role ? { ...e, text: value } : e)));
    }
  };
  const setContent = (content: string) => { props.onUpdateContent(content, slide.translation, slide.media_type, slide.media_url); syncRole('lyrics', content); };
  const setTranslation = (t: string) => { props.onUpdateContent(slide.content, t, slide.media_type, slide.media_url); syncRole('translation', t); };
  const setMedia = (type: Slide['media_type'], url: string | undefined) => props.onUpdateContent(slide.content, slide.translation, type, url);

  const translateSeq = useRef(0);
  const translate = async (lang?: string) => {
    if (!slide.content.trim()) return;
    const target = lang || translationLang;
    const seq = ++translateSeq.current; // guard: only the latest request may apply its result
    setIsTranslating(true);
    try {
      const res = await fetch('/api/translate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: slide.content, targetLang: target }),
      });
      const data = (await res.json()) as TranslateResponse;
      if (seq !== translateSeq.current) return; // a newer translation was requested; drop this stale one
      if (data.success && data.translation) setTranslation(data.translation);
      else alert(data.error || 'Translation failed.');
    } catch {
      if (seq === translateSeq.current) alert('Translation failed. Please try again.');
    } finally {
      if (seq === translateSeq.current) setIsTranslating(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-stone-50 text-stone-900">
      {/* Top bar */}
      <header className="flex items-center justify-between border-b border-stone-200 bg-white/90 px-4 py-3 gap-3 flex-wrap">
        <button onClick={props.onClose} className="flex items-center gap-1.5 rounded-xl bg-stone-100 border border-stone-200 hover:bg-stone-200 px-3 py-2 text-xs font-bold text-stone-700">
          <ArrowLeft className="h-4 w-4" />Running order
        </button>
        <div className="flex items-center gap-2">
          <button onClick={props.onPrev} disabled={slideIndex <= 0} className="rounded-lg bg-stone-100 border border-stone-200 hover:bg-stone-200 p-2 text-stone-700 disabled:opacity-30"><ChevronLeft className="h-4 w-4" /></button>
          <span className="text-xs font-bold text-stone-500 w-20 text-center">Slide {slideIndex + 1} / {slideCount}</span>
          <button onClick={props.onNext} disabled={slideIndex >= slideCount - 1} className="rounded-lg bg-stone-100 border border-stone-200 hover:bg-stone-200 p-2 text-stone-700 disabled:opacity-30"><ChevronRight className="h-4 w-4" /></button>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={props.onOpenDesigner} className="flex items-center gap-1.5 rounded-xl bg-stone-100 border border-stone-200 hover:bg-stone-200 px-3 py-2 text-xs font-bold text-teal-700"><Layers className="h-4 w-4" />Designer</button>
          <button onClick={props.onGoLive} className={`flex items-center gap-1.5 rounded-xl px-4 py-2 text-xs font-bold text-white ${isLive ? 'bg-red-500 pointer-events-none' : 'bg-teal-600 hover:bg-teal-500'}`}><Play className="h-4 w-4 fill-current" />{isLive ? 'LIVE' : 'Go Live'}</button>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden flex-col lg:flex-row">
        {/* Preview — click to open the designer and move things around */}
        <div className="lg:flex-1 flex flex-col items-center justify-center gap-3 p-4 lg:p-8 bg-stone-50 overflow-auto">
          <button
            onClick={props.onOpenDesigner}
            title="Open the designer to move text and arrange the slide"
            className="group relative w-full max-w-3xl aspect-video rounded-xl overflow-hidden ring-1 ring-white/10 hover:ring-teal-400/60 shadow-2xl transition-all"
          >
            <SlidePreview slide={slide} settings={settings} />
            <div className="absolute inset-0 flex items-center justify-center bg-black/0 group-hover:bg-black/40 transition-colors">
              <span className="flex items-center gap-1.5 rounded-full bg-teal-600/90 px-4 py-2 text-xs font-bold text-white opacity-0 group-hover:opacity-100 transition-opacity">
                <Layers className="h-4 w-4" /> Arrange &amp; move text
              </span>
            </div>
          </button>
          <p className="text-[11px] text-stone-500">Click the slide to open the designer — drag text, images and video anywhere.</p>
        </div>

        {/* Editing controls */}
        <aside className="w-full lg:w-[26rem] shrink-0 border-t lg:border-t-0 lg:border-l border-stone-200 bg-white p-4 space-y-4 overflow-y-auto">
          <Section icon={Type} title="Song words / text">
            <textarea
              value={slide.content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Enter the slide text / lyrics…"
              rows={5}
              className="w-full rounded-xl border border-stone-200 bg-white p-3 text-sm leading-relaxed text-stone-900 placeholder:text-stone-400 focus:border-teal-400 focus:outline-none resize-none"
            />
            {(() => {
              // Smart split: by verse/chorus (blank lines) then by length (max 4 lines).
              const chunks = splitLyricsIntoSlides(slide.content, { maxLinesPerSlide: 4 });
              if (chunks.length < 2) return null;
              return (
                <button
                  onClick={() => props.onSplit(chunks)}
                  className="flex w-full items-center justify-center gap-1.5 rounded-xl bg-teal-50 border border-teal-200 hover:bg-teal-100 py-2 text-xs font-bold text-teal-700"
                >
                  <Scissors className="h-3.5 w-3.5" /> Auto-split into {chunks.length} slides (by verse &amp; length)
                </button>
              );
            })()}
          </Section>

          <Section icon={Languages} title="Translation">
            <div className="flex items-center gap-2">
              <select
                value={translationLang}
                onChange={(e) => { props.onUpdateSettings({ translationLang: e.target.value }); if (slide.content.trim()) translate(e.target.value); }}
                disabled={isTranslating}
                className="flex-1 rounded-xl border border-stone-200 bg-stone-50 px-3 py-2 text-xs font-medium text-stone-700 focus:border-teal-400 focus:outline-none disabled:opacity-50"
              >
                {LANGUAGES.map((l) => <option key={l.name} value={l.name}>{l.name}{l.rtl ? ' (RTL)' : ''}</option>)}
              </select>
              <button onClick={() => translate()} disabled={isTranslating || !slide.content.trim()} className="flex items-center gap-1.5 rounded-xl bg-teal-50 border border-teal-200 hover:bg-teal-100 px-3 py-2 text-xs font-bold text-teal-700 disabled:opacity-50">
                {isTranslating ? <span className="h-4 w-4 animate-spin rounded-full border-2 border-teal-400 border-t-transparent" /> : <Sparkles className="h-4 w-4" />}
                AI
              </button>
            </div>
            <textarea
              dir={dirFor(translationLang)}
              value={slide.translation || ''}
              onChange={(e) => setTranslation(e.target.value)}
              placeholder="Translation…"
              rows={4}
              className="w-full rounded-xl border border-stone-200 bg-white p-3 text-sm leading-relaxed text-stone-900 placeholder:text-stone-400 focus:border-teal-400 focus:outline-none resize-none font-serif"
            />
          </Section>

          <Section icon={ImageIcon} title="Background media">
            <select
              value={slide.media_type || 'none'}
              onChange={(e) => setMedia(e.target.value as Slide['media_type'], slide.media_url)}
              className="w-full rounded-xl border border-stone-200 bg-stone-50 px-3 py-2 text-xs font-medium text-stone-700 focus:border-teal-400 focus:outline-none"
            >
              <option value="none">Colour / background (default)</option>
              <option value="image">Image (upload)</option>
              <option value="video">Video (upload or link)</option>
              <option value="camera">Live camera</option>
            </select>

            {(!slide.media_type || slide.media_type === 'none') && (
              <div className="space-y-2 pt-1">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] uppercase font-bold text-stone-500">Built-in backgrounds</span>
                  {slide.settings?.bgColor && (
                    <button onClick={() => props.onSetSlideBg(undefined)} className="text-[10px] font-bold text-stone-500 hover:text-red-600">Reset to theme</button>
                  )}
                </div>
                <div className="grid grid-cols-6 gap-1.5">
                  {BACKGROUNDS.map((bg) => {
                    const active = slide.settings?.bgColor === bg.value;
                    return (
                      <button
                        key={bg.id}
                        title={bg.name}
                        onClick={() => props.onSetSlideBg(bg.value)}
                        style={{ background: bg.value }}
                        className={`aspect-square rounded-md border transition-all ${active ? 'border-teal-400 ring-2 ring-teal-300' : 'border-stone-200 hover:border-stone-400'}`}
                      />
                    );
                  })}
                </div>
                <p className="text-[10px] text-stone-400">Applies to this slide. Use the Theme section to set one for the whole presentation.</p>
              </div>
            )}

            {(slide.media_type === 'image' || slide.media_type === 'video') && (
              <div className="space-y-3 pt-1">
                <MediaLibrary currentUrl={slide.media_url} onSelectMedia={(url, kind) => { if (kind === 'audio') return; setMedia(url ? kind : 'none', url); }} />
                {slide.media_type === 'video' && (
                  <input
                    key={slide.id}
                    type="url"
                    placeholder="…or paste a video link (https://…​.mp4)"
                    defaultValue={slide.media_url || ''}
                    onBlur={(e) => setMedia(e.target.value.trim() ? 'video' : 'none', e.target.value.trim() || undefined)}
                    className="w-full rounded-xl border border-stone-200 bg-white py-2 px-3 text-xs text-stone-800 placeholder:text-stone-400 focus:border-teal-400 focus:outline-none"
                  />
                )}
                {slide.media_url && (
                  <label className="flex items-start gap-2.5 rounded-xl border border-stone-200 bg-white p-3 cursor-pointer">
                    <input type="checkbox" checked={!!slide.media_fill} onChange={(e) => props.onSetFill(e.target.checked)} className="mt-0.5 h-4 w-4 accent-teal-600" />
                    <span className="text-[11px] text-stone-700 leading-relaxed"><strong className="text-stone-800">Fill the screen</strong> — full-brightness {slide.media_type}, no text (announcement slide). Off = darkened background behind text.</span>
                  </label>
                )}
              </div>
            )}
          </Section>

          <Section icon={Music} title="Audio (plays when slide goes live)">
            {slide.audio_url ? (
              <div className="space-y-2">
                <audio controls src={slide.audio_url} className="w-full h-9" />
                <div className="flex items-center justify-between">
                  <label className="flex items-center gap-2 text-[11px] text-stone-700">
                    <input type="checkbox" checked={!!slide.audio_loop} onChange={(e) => props.onSetAudio(slide.audio_url, e.target.checked)} className="h-4 w-4 accent-teal-600" />
                    Loop
                  </label>
                  <button onClick={() => props.onSetAudio(undefined, false)} className="text-[11px] font-bold text-stone-500 hover:text-red-600">Remove audio</button>
                </div>
              </div>
            ) : (
              <>
                <MediaLibrary filter="audio" currentUrl={slide.audio_url} onSelectMedia={(url) => props.onSetAudio(url || undefined, slide.audio_loop ?? false)} />
                <input
                  type="url"
                  placeholder="…or paste an audio link (https://…​.mp3)"
                  onBlur={(e) => { if (e.target.value.trim()) props.onSetAudio(e.target.value.trim(), slide.audio_loop ?? false); }}
                  className="w-full rounded-xl border border-stone-200 bg-white py-2 px-3 text-xs text-stone-800 placeholder:text-stone-400 focus:border-teal-400 focus:outline-none"
                />
              </>
            )}
          </Section>

          <Section icon={Timer} title="Automation">
            <label className="flex items-center justify-between text-[11px] text-stone-700">
              <span>Auto-advance after</span>
              <span className="flex items-center gap-1.5">
                <input
                  type="number" min={0} max={600}
                  value={slide.auto_advance_secs || 0}
                  onChange={(e) => props.onSetAutoAdvance(Math.max(0, Number(e.target.value) || 0))}
                  className="w-16 rounded-lg border border-stone-200 bg-white py-1 px-2 text-stone-800 focus:outline-none"
                />
                <span className="text-stone-500">sec</span>
              </span>
            </label>
            <p className="text-[10px] text-stone-400">0 = off. When live, the presenter view moves to the next slide after this many seconds.</p>
          </Section>

          <Section icon={StickyNote} title="Presenter notes">
            <textarea
              key={slide.id}
              defaultValue={slide.settings?.notes ?? ''}
              onBlur={(e) => props.onSetNotes(e.target.value)}
              rows={3}
              placeholder="Private cue for the team — e.g. “key change”, “pause for prayer”, “next: announcements”"
              className="w-full resize-y rounded-xl border border-stone-200 bg-white py-2 px-3 text-xs text-stone-800 placeholder:text-stone-400 focus:border-teal-400 focus:outline-none"
            />
            <p className="text-[10px] text-stone-400">Shows only on the stage/confidence monitor — never on the projector or follower.</p>
          </Section>

          <Section icon={Palette} title="Theme (whole presentation)">
            <div className="grid grid-cols-4 gap-2">
              {THEMES.map((t) => (
                <button
                  key={t.name}
                  onClick={() => props.onUpdateSettings(t.settings)}
                  title={t.name}
                  className={`rounded-lg border p-1.5 transition-all ${settings.background === t.settings.background && settings.fontFamily === t.settings.fontFamily ? 'border-teal-400 ring-1 ring-teal-400/40' : 'border-stone-200 hover:border-stone-300'}`}
                >
                  <div className="rounded h-8 w-full flex items-center justify-center" style={{ backgroundColor: t.swatch }}>
                    <span className="text-[10px] font-bold text-stone-900" style={{ fontFamily: t.settings.fontFamily }}>Aa</span>
                  </div>
                  <span className="mt-1 block text-[8px] text-stone-500 truncate text-center">{t.name}</span>
                </button>
              ))}
            </div>
            <p className="text-[10px] text-stone-400">Applies background, font &amp; text style to every lyric slide.</p>
            <div className="pt-2 space-y-1.5">
              <span className="text-[10px] uppercase font-bold text-stone-500">Background for whole presentation</span>
              <div className="grid grid-cols-6 gap-1.5">
                {BACKGROUNDS.map((bg) => (
                  <button
                    key={bg.id}
                    title={bg.name}
                    onClick={() => props.onUpdateSettings({ background: bg.value })}
                    style={{ background: bg.value }}
                    className={`aspect-square rounded-md border transition-all ${settings.background === bg.value ? 'border-teal-400 ring-2 ring-teal-300' : 'border-stone-200 hover:border-stone-400'}`}
                  />
                ))}
              </div>
            </div>
          </Section>

          <Section icon={Stamp} title="Branding (whole presentation)">
            <label className="flex items-center justify-between text-[11px] text-stone-700">
              <span>Show logo &amp; banner on every slide</span>
              <input type="checkbox" checked={!!settings.brandShow} onChange={(e) => props.onUpdateSettings({ brandShow: e.target.checked })} className="h-4 w-4 accent-teal-600" />
            </label>
            {settings.brandShow && (
              <div className="space-y-3 pt-1">
                <div>
                  <label className="block text-[10px] uppercase font-bold text-stone-500 mb-1.5">Logo image</label>
                  {settings.brandLogoUrl ? (
                    <div className="flex items-center gap-2">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={settings.brandLogoUrl} alt="" className="h-10 w-10 object-contain rounded bg-stone-100 border border-stone-200" />
                      <button onClick={() => props.onUpdateSettings({ brandLogoUrl: undefined })} className="text-[11px] font-bold text-stone-500 hover:text-red-600">Remove</button>
                    </div>
                  ) : (
                    <MediaLibrary filter="image" currentUrl={settings.brandLogoUrl} onSelectMedia={(url, kind) => { if (kind === 'image') props.onUpdateSettings({ brandLogoUrl: url || undefined }); }} />
                  )}
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] uppercase font-bold text-stone-500 mb-1">Position</label>
                    <select value={settings.brandLogoPos || 'bottom-right'} onChange={(e) => props.onUpdateSettings({ brandLogoPos: e.target.value as 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right' })} className="w-full rounded-lg border border-stone-200 bg-stone-50 px-2 py-1.5 text-[10px] text-stone-700 focus:outline-none">
                      <option value="top-left">Top left</option>
                      <option value="top-right">Top right</option>
                      <option value="bottom-left">Bottom left</option>
                      <option value="bottom-right">Bottom right</option>
                    </select>
                  </div>
                  <div>
                    <div className="flex justify-between text-[10px] uppercase font-bold text-stone-500 mb-1"><span>Size</span><span>{settings.brandLogoSize || 8}</span></div>
                    <input type="range" min={4} max={20} value={settings.brandLogoSize || 8} onChange={(e) => props.onUpdateSettings({ brandLogoSize: Number(e.target.value) })} className="w-full accent-teal-600" />
                  </div>
                </div>
                <div>
                  <label className="block text-[10px] uppercase font-bold text-stone-500 mb-1">Lower-third banner (optional)</label>
                  <input
                    type="text"
                    defaultValue={settings.brandLowerThird || ''}
                    onBlur={(e) => props.onUpdateSettings({ brandLowerThird: e.target.value })}
                    placeholder="e.g. St Paul's Church · Welcome"
                    className="w-full rounded-lg border border-stone-200 bg-white py-1.5 px-2.5 text-xs text-stone-800 placeholder:text-stone-400 focus:border-teal-400 focus:outline-none"
                  />
                </div>
                <p className="text-[10px] text-stone-400">Shows on the projector &amp; follower screens, on every slide.</p>
              </div>
            )}
            <div className="mt-3 pt-3 border-t border-stone-200/70 space-y-2">
              <p className="text-[10px] text-stone-500 leading-snug">Reuse this presentation&apos;s logo, colours &amp; text style on every <span className="text-stone-500 font-semibold">new</span> presentation you create.</p>
              <div className="flex items-center gap-2">
                <button onClick={handleSavePreset} className="rounded-lg bg-teal-600/90 hover:bg-teal-600 px-3 py-1.5 text-[11px] font-bold text-white transition-colors">
                  Save as my default look
                </button>
                {hasPreset && (
                  <button onClick={handleClearPreset} className="text-[11px] font-bold text-stone-500 hover:text-red-600 transition-colors">
                    Clear default
                  </button>
                )}
              </div>
              {presetMsg && <p className="text-[10px] font-semibold text-emerald-600">{presetMsg}</p>}
            </div>
          </Section>

          <Section icon={Type} title="Text style">
            <div>
              <label className="block text-[10px] uppercase font-bold text-stone-500 mb-1.5">Font</label>
              <select value={settings.fontFamily} onChange={(e) => props.onUpdateSettings({ fontFamily: e.target.value })} className="w-full rounded-xl border border-stone-200 bg-stone-50 px-3 py-2 text-xs text-stone-700 focus:border-teal-400 focus:outline-none">
                {FONTS.map((f) => <option key={f.family} value={f.family} style={{ fontFamily: f.family }}>{f.label} · {f.category}</option>)}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[10px] uppercase font-bold text-stone-500 mb-1">Align</label>
                <div className="grid grid-cols-3 gap-1 bg-white p-1 rounded-xl border border-stone-200">
                  {(['left', 'center', 'right'] as const).map((a) => (
                    <button key={a} onClick={() => props.onUpdateSettings({ textAlign: a })} className={`rounded-lg py-1 text-[10px] font-bold capitalize ${(settings.textAlign || 'center') === a ? 'bg-teal-600 text-white' : 'text-stone-500'}`}>{a[0]}</button>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-[10px] uppercase font-bold text-stone-500 mb-1">Vertical</label>
                <div className="grid grid-cols-3 gap-1 bg-white p-1 rounded-xl border border-stone-200">
                  {(['top', 'center', 'bottom'] as const).map((v) => (
                    <button key={v} onClick={() => props.onUpdateSettings({ verticalAlign: v })} className={`rounded-lg py-1 text-[10px] font-bold capitalize ${(settings.verticalAlign || 'center') === v ? 'bg-teal-600 text-white' : 'text-stone-500'}`}>{v[0]}</button>
                  ))}
                </div>
              </div>
            </div>
            <div>
              <div className="flex justify-between text-[10px] uppercase font-bold text-stone-500 mb-1"><span>Spacing / margins</span><span>{settings.margin}</span></div>
              <input type="range" min={2} max={12} value={settings.margin} onChange={(e) => props.onUpdateSettings({ margin: Number(e.target.value) })} className="w-full accent-teal-600" />
            </div>
            <div className="grid grid-cols-3 gap-2">
              <div>
                <label className="block text-[9px] uppercase font-bold text-stone-500 mb-1">Caps</label>
                <select value={settings.textTransform || 'none'} onChange={(e) => props.onUpdateSettings({ textTransform: e.target.value as Presentation['settings']['textTransform'] })} className="w-full rounded-lg border border-stone-200 bg-stone-50 px-2 py-1.5 text-[10px] text-stone-700 focus:outline-none">
                  <option value="none">Normal</option><option value="uppercase">CAPS</option>
                </select>
              </div>
              <div>
                <label className="block text-[9px] uppercase font-bold text-stone-500 mb-1">Shadow</label>
                <select value={settings.textShadow || 'none'} onChange={(e) => props.onUpdateSettings({ textShadow: e.target.value as Presentation['settings']['textShadow'] })} className="w-full rounded-lg border border-stone-200 bg-stone-50 px-2 py-1.5 text-[10px] text-stone-700 focus:outline-none">
                  <option value="none">None</option><option value="subtle">Subtle</option><option value="strong">Strong</option>
                </select>
              </div>
              <div>
                <label className="block text-[9px] uppercase font-bold text-stone-500 mb-1">Outline</label>
                <select value={settings.textOutline || 'none'} onChange={(e) => props.onUpdateSettings({ textOutline: e.target.value as Presentation['settings']['textOutline'] })} className="w-full rounded-lg border border-stone-200 bg-stone-50 px-2 py-1.5 text-[10px] text-stone-700 focus:outline-none">
                  <option value="none">None</option><option value="subtle">Subtle</option><option value="strong">Strong</option>
                </select>
              </div>
            </div>
            <div>
              <label className="block text-[10px] uppercase font-bold text-stone-500 mb-1">Transition</label>
              <select value={settings.slideTransition || 'none'} onChange={(e) => props.onUpdateSettings({ slideTransition: e.target.value as Presentation['settings']['slideTransition'] })} className="w-full rounded-xl border border-stone-200 bg-stone-50 px-3 py-2 text-xs text-stone-700 focus:outline-none">
                <option value="none">None (instant)</option><option value="fade">Fade</option><option value="slide">Slide</option><option value="zoom">Zoom</option>
              </select>
              <p className="mt-1 text-[10px] text-stone-400">Text style &amp; transitions apply to all lyric slides in this presentation.</p>
            </div>
          </Section>

          <button onClick={props.onOpenDesigner} className="flex w-full items-center justify-center gap-2 rounded-xl bg-teal-50 border border-teal-200 hover:bg-teal-100 py-2.5 text-xs font-bold text-teal-700">
            <Layers className="h-4 w-4" />Free-placement designer (images, text boxes, video)
          </button>
        </aside>
      </div>
    </div>
  );
}
