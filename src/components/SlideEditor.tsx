'use client';

import { useState, type ComponentType, type ReactNode } from 'react';
import { Slide, Presentation } from '@/utils/sync';
import SlidePreview from '@/components/SlidePreview';
import MediaLibrary from '@/components/MediaLibrary';
import { LANGUAGES, dirFor, DEFAULT_TRANSLATION_LANG } from '@/utils/languages';
import { FONTS } from '@/utils/fonts';
import {
  ArrowLeft, ChevronLeft, ChevronRight, Play, Layers, Sparkles, Languages, Type, Image as ImageIcon,
} from 'lucide-react';

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
    <section className="rounded-2xl border border-slate-900 bg-slate-900/30 p-4 space-y-3">
      <div className="flex items-center gap-2"><Icon className="h-4 w-4 text-violet-400" /><h3 className="text-xs font-bold uppercase tracking-wider text-slate-300">{title}</h3></div>
      {children}
    </section>
  );
}

export default function SlideEditor(props: SlideEditorProps) {
  const { slide, settings, slideIndex, slideCount, isLive } = props;
  const [isTranslating, setIsTranslating] = useState(false);
  const translationLang = settings.translationLang || DEFAULT_TRANSLATION_LANG;

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

  const translate = async (lang?: string) => {
    if (!slide.content.trim()) return;
    const target = lang || translationLang;
    setIsTranslating(true);
    try {
      const res = await fetch('/api/translate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: slide.content, targetLang: target }),
      });
      const data = (await res.json()) as TranslateResponse;
      if (data.success && data.translation) setTranslation(data.translation);
      else alert(data.error || 'Translation failed.');
    } catch {
      alert('Translation failed. Please try again.');
    } finally {
      setIsTranslating(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-slate-950 text-slate-100">
      {/* Top bar */}
      <header className="flex items-center justify-between border-b border-slate-800 bg-slate-950/80 px-4 py-3 gap-3 flex-wrap">
        <button onClick={props.onClose} className="flex items-center gap-1.5 rounded-xl bg-slate-900 border border-slate-800 hover:bg-slate-800 px-3 py-2 text-xs font-bold text-slate-300">
          <ArrowLeft className="h-4 w-4" />Running order
        </button>
        <div className="flex items-center gap-2">
          <button onClick={props.onPrev} disabled={slideIndex <= 0} className="rounded-lg bg-slate-900 border border-slate-800 hover:bg-slate-800 p-2 text-slate-300 disabled:opacity-30"><ChevronLeft className="h-4 w-4" /></button>
          <span className="text-xs font-bold text-slate-400 w-20 text-center">Slide {slideIndex + 1} / {slideCount}</span>
          <button onClick={props.onNext} disabled={slideIndex >= slideCount - 1} className="rounded-lg bg-slate-900 border border-slate-800 hover:bg-slate-800 p-2 text-slate-300 disabled:opacity-30"><ChevronRight className="h-4 w-4" /></button>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={props.onOpenDesigner} className="flex items-center gap-1.5 rounded-xl bg-slate-900 border border-slate-800 hover:bg-slate-800 px-3 py-2 text-xs font-bold text-violet-300"><Layers className="h-4 w-4" />Designer</button>
          <button onClick={props.onGoLive} className={`flex items-center gap-1.5 rounded-xl px-4 py-2 text-xs font-bold text-white ${isLive ? 'bg-red-500 pointer-events-none' : 'bg-indigo-600 hover:bg-indigo-500'}`}><Play className="h-4 w-4 fill-current" />{isLive ? 'LIVE' : 'Go Live'}</button>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden flex-col lg:flex-row">
        {/* Preview — click to open the designer and move things around */}
        <div className="lg:flex-1 flex flex-col items-center justify-center gap-3 p-4 lg:p-8 bg-slate-950 overflow-auto">
          <button
            onClick={props.onOpenDesigner}
            title="Open the designer to move text and arrange the slide"
            className="group relative w-full max-w-3xl aspect-video rounded-xl overflow-hidden ring-1 ring-white/10 hover:ring-violet-500/60 shadow-2xl transition-all"
          >
            <SlidePreview slide={slide} settings={settings} />
            <div className="absolute inset-0 flex items-center justify-center bg-black/0 group-hover:bg-black/40 transition-colors">
              <span className="flex items-center gap-1.5 rounded-full bg-violet-600/90 px-4 py-2 text-xs font-bold text-white opacity-0 group-hover:opacity-100 transition-opacity">
                <Layers className="h-4 w-4" /> Arrange &amp; move text
              </span>
            </div>
          </button>
          <p className="text-[11px] text-slate-500">Click the slide to open the designer — drag text, images and video anywhere.</p>
        </div>

        {/* Editing controls */}
        <aside className="w-full lg:w-[26rem] shrink-0 border-t lg:border-t-0 lg:border-l border-slate-800 bg-slate-950/60 p-4 space-y-4 overflow-y-auto">
          <Section icon={Type} title="Song words / text">
            <textarea
              value={slide.content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Enter the slide text / lyrics…"
              rows={5}
              className="w-full rounded-xl border border-slate-800 bg-slate-950/60 p-3 text-sm leading-relaxed text-slate-100 placeholder:text-slate-600 focus:border-violet-500 focus:outline-none resize-none"
            />
          </Section>

          <Section icon={Languages} title="Translation">
            <div className="flex items-center gap-2">
              <select
                value={translationLang}
                onChange={(e) => { props.onUpdateSettings({ translationLang: e.target.value }); if (slide.content.trim()) translate(e.target.value); }}
                disabled={isTranslating}
                className="flex-1 rounded-xl border border-slate-800 bg-slate-950 px-3 py-2 text-xs font-medium text-slate-300 focus:border-violet-500 focus:outline-none disabled:opacity-50"
              >
                {LANGUAGES.map((l) => <option key={l.name} value={l.name}>{l.name}{l.rtl ? ' (RTL)' : ''}</option>)}
              </select>
              <button onClick={() => translate()} disabled={isTranslating || !slide.content.trim()} className="flex items-center gap-1.5 rounded-xl bg-violet-600/20 border border-violet-500/30 hover:bg-violet-600/40 px-3 py-2 text-xs font-bold text-violet-300 disabled:opacity-50">
                {isTranslating ? <span className="h-4 w-4 animate-spin rounded-full border-2 border-violet-400 border-t-transparent" /> : <Sparkles className="h-4 w-4" />}
                AI
              </button>
            </div>
            <textarea
              dir={dirFor(translationLang)}
              value={slide.translation || ''}
              onChange={(e) => setTranslation(e.target.value)}
              placeholder="Translation…"
              rows={4}
              className="w-full rounded-xl border border-slate-800 bg-slate-950/60 p-3 text-sm leading-relaxed text-slate-100 placeholder:text-slate-600 focus:border-violet-500 focus:outline-none resize-none font-serif"
            />
          </Section>

          <Section icon={ImageIcon} title="Background media">
            <select
              value={slide.media_type || 'none'}
              onChange={(e) => setMedia(e.target.value as Slide['media_type'], slide.media_url)}
              className="w-full rounded-xl border border-slate-800 bg-slate-950 px-3 py-2 text-xs font-medium text-slate-300 focus:border-violet-500 focus:outline-none"
            >
              <option value="none">Colour theme (default)</option>
              <option value="image">Image (upload)</option>
              <option value="video">Video (upload or link)</option>
              <option value="camera">Live camera</option>
            </select>

            {(slide.media_type === 'image' || slide.media_type === 'video') && (
              <div className="space-y-3 pt-1">
                <MediaLibrary currentUrl={slide.media_url} onSelectMedia={(url, kind) => setMedia(url ? kind : 'none', url)} />
                {slide.media_type === 'video' && (
                  <input
                    type="url"
                    placeholder="…or paste a video link (https://…​.mp4)"
                    defaultValue={slide.media_url || ''}
                    onBlur={(e) => setMedia(e.target.value.trim() ? 'video' : 'none', e.target.value.trim() || undefined)}
                    className="w-full rounded-xl border border-slate-800 bg-slate-950/60 py-2 px-3 text-xs text-slate-200 placeholder:text-slate-650 focus:border-violet-500 focus:outline-none"
                  />
                )}
                {slide.media_url && (
                  <label className="flex items-start gap-2.5 rounded-xl border border-slate-800 bg-slate-950/40 p-3 cursor-pointer">
                    <input type="checkbox" checked={!!slide.media_fill} onChange={(e) => props.onSetFill(e.target.checked)} className="mt-0.5 h-4 w-4 accent-violet-600" />
                    <span className="text-[11px] text-slate-300 leading-relaxed"><strong className="text-slate-200">Fill the screen</strong> — full-brightness {slide.media_type}, no text (announcement slide). Off = darkened background behind text.</span>
                  </label>
                )}
              </div>
            )}
          </Section>

          <Section icon={Type} title="Text style">
            <div>
              <label className="block text-[10px] uppercase font-bold text-slate-500 mb-1.5">Font</label>
              <select value={settings.fontFamily} onChange={(e) => props.onUpdateSettings({ fontFamily: e.target.value })} className="w-full rounded-xl border border-slate-800 bg-slate-950 px-3 py-2 text-xs text-slate-300 focus:border-violet-500 focus:outline-none">
                {FONTS.map((f) => <option key={f.family} value={f.family} style={{ fontFamily: f.family }}>{f.label} · {f.category}</option>)}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[10px] uppercase font-bold text-slate-500 mb-1">Align</label>
                <div className="grid grid-cols-3 gap-1 bg-slate-950/60 p-1 rounded-xl border border-slate-800">
                  {(['left', 'center', 'right'] as const).map((a) => (
                    <button key={a} onClick={() => props.onUpdateSettings({ textAlign: a })} className={`rounded-lg py-1 text-[10px] font-bold capitalize ${(settings.textAlign || 'center') === a ? 'bg-violet-600 text-white' : 'text-slate-400'}`}>{a[0]}</button>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-[10px] uppercase font-bold text-slate-500 mb-1">Vertical</label>
                <div className="grid grid-cols-3 gap-1 bg-slate-950/60 p-1 rounded-xl border border-slate-800">
                  {(['top', 'center', 'bottom'] as const).map((v) => (
                    <button key={v} onClick={() => props.onUpdateSettings({ verticalAlign: v })} className={`rounded-lg py-1 text-[10px] font-bold capitalize ${(settings.verticalAlign || 'center') === v ? 'bg-violet-600 text-white' : 'text-slate-400'}`}>{v[0]}</button>
                  ))}
                </div>
              </div>
            </div>
            <div>
              <div className="flex justify-between text-[10px] uppercase font-bold text-slate-500 mb-1"><span>Spacing / margins</span><span>{settings.margin}</span></div>
              <input type="range" min={2} max={12} value={settings.margin} onChange={(e) => props.onUpdateSettings({ margin: Number(e.target.value) })} className="w-full accent-violet-600" />
            </div>
            <div className="grid grid-cols-3 gap-2">
              <div>
                <label className="block text-[9px] uppercase font-bold text-slate-500 mb-1">Caps</label>
                <select value={settings.textTransform || 'none'} onChange={(e) => props.onUpdateSettings({ textTransform: e.target.value as Presentation['settings']['textTransform'] })} className="w-full rounded-lg border border-slate-800 bg-slate-950 px-2 py-1.5 text-[10px] text-slate-300 focus:outline-none">
                  <option value="none">Normal</option><option value="uppercase">CAPS</option>
                </select>
              </div>
              <div>
                <label className="block text-[9px] uppercase font-bold text-slate-500 mb-1">Shadow</label>
                <select value={settings.textShadow || 'none'} onChange={(e) => props.onUpdateSettings({ textShadow: e.target.value as Presentation['settings']['textShadow'] })} className="w-full rounded-lg border border-slate-800 bg-slate-950 px-2 py-1.5 text-[10px] text-slate-300 focus:outline-none">
                  <option value="none">None</option><option value="subtle">Subtle</option><option value="strong">Strong</option>
                </select>
              </div>
              <div>
                <label className="block text-[9px] uppercase font-bold text-slate-500 mb-1">Outline</label>
                <select value={settings.textOutline || 'none'} onChange={(e) => props.onUpdateSettings({ textOutline: e.target.value as Presentation['settings']['textOutline'] })} className="w-full rounded-lg border border-slate-800 bg-slate-950 px-2 py-1.5 text-[10px] text-slate-300 focus:outline-none">
                  <option value="none">None</option><option value="subtle">Subtle</option><option value="strong">Strong</option>
                </select>
              </div>
            </div>
            <div>
              <label className="block text-[10px] uppercase font-bold text-slate-500 mb-1">Transition</label>
              <select value={settings.slideTransition || 'none'} onChange={(e) => props.onUpdateSettings({ slideTransition: e.target.value as Presentation['settings']['slideTransition'] })} className="w-full rounded-xl border border-slate-800 bg-slate-950 px-3 py-2 text-xs text-slate-300 focus:outline-none">
                <option value="none">None (instant)</option><option value="fade">Fade</option><option value="slide">Slide</option><option value="zoom">Zoom</option>
              </select>
              <p className="mt-1 text-[10px] text-slate-600">Text style &amp; transitions apply to all lyric slides in this presentation.</p>
            </div>
          </Section>

          <button onClick={props.onOpenDesigner} className="flex w-full items-center justify-center gap-2 rounded-xl bg-violet-600/15 border border-violet-500/30 hover:bg-violet-600/25 py-2.5 text-xs font-bold text-violet-300">
            <Layers className="h-4 w-4" />Free-placement designer (images, text boxes, video)
          </button>
        </aside>
      </div>
    </div>
  );
}
