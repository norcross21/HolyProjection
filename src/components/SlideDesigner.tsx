'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { Slide, SlideElement, Presentation, Template, useTemplates } from '@/utils/sync';
import MediaLibrary from '@/components/MediaLibrary';
import SlideElementsLayer from '@/components/SlideElementsLayer';
import { FONTS } from '@/utils/fonts';
import {
  X, Type, Image as ImageIcon, Film, Trash2, ChevronUp, ChevronDown,
  Bold, AlignLeft, AlignCenter, AlignRight, Layers, RotateCw, LayoutTemplate, Save, Copy,
} from 'lucide-react';

interface SlideDesignerProps {
  slide: Slide;
  settings: Presentation['settings'];
  onChange: (elements: SlideElement[]) => void;
  onBgChange: (color: string) => void;
  onClose: () => void;
}

const uid = () => `el-${Date.now()}-${Math.floor(performance.now() % 100000)}`;

export default function SlideDesigner({ slide, settings, onChange, onBgChange, onClose }: SlideDesignerProps) {
  const [els, setEls] = useState<SlideElement[]>(slide.elements ? [...slide.elements] : []);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [showMedia, setShowMedia] = useState<null | 'image' | 'video'>(null);
  const [showTemplates, setShowTemplates] = useState(false);
  const { templates, saveTemplate, deleteTemplate } = useTemplates();
  const stageRef = useRef<HTMLDivElement>(null);
  const drag = useRef<{ id: string; mode: 'move' | 'resize'; sx: number; sy: number; ox: number; oy: number; ow: number; oh: number } | null>(null);

  // Tracks the last element state we either sent out or adopted, so realtime echoes
  // of our own edits don't trigger a reconcile loop.
  const lastSyncedRef = useRef<string>(JSON.stringify(slide.elements || []));

  const commit = useCallback((next: SlideElement[]) => {
    setEls(next);
    lastSyncedRef.current = JSON.stringify(next);
    onChange(next);
  }, [onChange]);

  // Adopt genuine remote element changes (e.g. lyrics/translation edited in the
  // Slide Editor, or a collaborator) while the designer is open — but never while
  // the user is mid-drag, and never for echoes of our own commits.
  useEffect(() => {
    if (drag.current) return;
    const incoming = JSON.stringify(slide.elements || []);
    if (incoming !== lastSyncedRef.current) {
      setEls(slide.elements ? [...slide.elements] : []);
      lastSyncedRef.current = incoming;
    }
  }, [slide.elements]);

  // If the slide's words live in `content` (imported/legacy) with no placed
  // elements yet, seed movable text boxes from them so the designer isn't empty.
  // Seeded locally — only persisted once the user actually moves/edits something.
  const seededRef = useRef(false);
  useEffect(() => {
    if (seededRef.current) return;
    seededRef.current = true;
    if ((slide.elements?.length ?? 0) > 0) return;
    if (!slide.content?.trim() && !slide.translation?.trim()) return;
    const seed: SlideElement[] = [];
    let z = 0;
    if (slide.content?.trim()) {
      seed.push({ id: uid(), type: 'text', role: 'lyrics', x: 8, y: slide.translation?.trim() ? 22 : 38, w: 84, h: 28, z: ++z, text: slide.content, color: '#ffffff', fontSize: 8, align: 'center', bold: true, fontFamily: settings.fontFamily });
    }
    if (slide.translation?.trim()) {
      seed.push({ id: uid(), type: 'text', role: 'translation', x: 8, y: 56, w: 84, h: 24, z: ++z, text: slide.translation, color: '#a5b4fc', fontSize: 7, align: 'center', bold: false, fontFamily: settings.fontFamily });
    }
    if (seed.length) queueMicrotask(() => setEls(seed));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const update = (id: string, patch: Partial<SlideElement>) => {
    commit(els.map((e) => (e.id === id ? { ...e, ...patch } : e)));
  };

  const selected = els.find((e) => e.id === selectedId) || null;
  const maxZ = els.reduce((m, e) => Math.max(m, e.z), 0);

  const addText = () => {
    const el: SlideElement = { id: uid(), type: 'text', x: 25, y: 40, w: 50, h: 18, z: maxZ + 1, text: 'New text', color: '#ffffff', fontSize: 7, align: 'center', bold: true };
    commit([...els, el]); setSelectedId(el.id);
  };

  // Drop the slide's song words (and translation) onto the canvas as movable text boxes.
  const addLyrics = () => {
    const additions: SlideElement[] = [];
    let z = maxZ;
    if (slide.content?.trim()) {
      additions.push({ id: uid(), type: 'text', role: 'lyrics', x: 8, y: slide.translation?.trim() ? 22 : 38, w: 84, h: 28, z: ++z, text: slide.content, color: '#ffffff', fontSize: 8, align: 'center', bold: true, fontFamily: settings.fontFamily });
    }
    if (slide.translation?.trim()) {
      additions.push({ id: uid(), type: 'text', role: 'translation', x: 8, y: 56, w: 84, h: 24, z: ++z, text: slide.translation, color: '#a5b4fc', fontSize: 7, align: 'center', bold: false, fontFamily: settings.fontFamily });
    }
    if (additions.length === 0) { addText(); return; }
    commit([...els, ...additions]);
    setSelectedId(additions[0].id);
  };
  const addMedia = (url: string, kind: 'image' | 'video') => {
    if (!url) { setShowMedia(null); return; }
    const el: SlideElement = { id: uid(), type: kind, x: 30, y: 25, w: 40, h: 45, z: maxZ + 1, url, fit: 'contain' };
    commit([...els, el]); setSelectedId(el.id); setShowMedia(null);
  };
  const removeEl = (id: string) => { commit(els.filter((e) => e.id !== id)); if (selectedId === id) setSelectedId(null); };
  const duplicateEl = (id: string) => {
    const el = els.find((e) => e.id === id);
    if (!el) return;
    const copy: SlideElement = { ...el, id: uid(), x: Math.min(90, el.x + 4), y: Math.min(90, el.y + 4), z: maxZ + 1 };
    commit([...els, copy]);
    setSelectedId(copy.id);
  };

  const applyTemplate = (tpl: Template) => {
    const newEls = (tpl.data.elements || []).map((e, i) => ({ ...e, id: `el-${Date.now()}-${i}` }));
    commit(newEls);
    if (tpl.data.bgColor) onBgChange(tpl.data.bgColor);
    setSelectedId(null);
    setShowTemplates(false);
  };

  const saveCurrentAsTemplate = async () => {
    const name = prompt('Save this slide design as a template. Name:');
    if (!name || !name.trim()) return;
    await saveTemplate(name.trim(), {
      bgColor: slide.settings?.bgColor,
      media_type: slide.media_type,
      media_url: slide.media_url,
      media_fill: slide.media_fill,
      elements: els,
    });
  };
  const bump = (id: string, dir: 1 | -1) => {
    const sorted = [...els].sort((a, b) => a.z - b.z);
    const i = sorted.findIndex((e) => e.id === id);
    const j = i + dir;
    if (j < 0 || j >= sorted.length) return;
    const zi = sorted[i].z, zj = sorted[j].z;
    commit(els.map((e) => e.id === sorted[i].id ? { ...e, z: zj } : e.id === sorted[j].id ? { ...e, z: zi } : e));
  };

  // pointer drag / resize
  const onPointerDown = (e: React.PointerEvent, id: string, mode: 'move' | 'resize') => {
    e.stopPropagation();
    setSelectedId(id);
    const el = els.find((x) => x.id === id);
    if (!el) return;
    drag.current = { id, mode, sx: e.clientX, sy: e.clientY, ox: el.x, oy: el.y, ow: el.w, oh: el.h };
    (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
  };

  useEffect(() => {
    const move = (e: PointerEvent) => {
      const d = drag.current; const stage = stageRef.current;
      if (!d || !stage) return;
      const rect = stage.getBoundingClientRect();
      const dxp = ((e.clientX - d.sx) / rect.width) * 100;
      const dyp = ((e.clientY - d.sy) / rect.height) * 100;
      if (d.mode === 'move') {
        update(d.id, {
          x: Math.min(98, Math.max(0, +(d.ox + dxp).toFixed(2))),
          y: Math.min(98, Math.max(0, +(d.oy + dyp).toFixed(2))),
        });
      } else {
        update(d.id, {
          w: Math.min(100, Math.max(5, +(d.ow + dxp).toFixed(2))),
          h: Math.min(100, Math.max(5, +(d.oh + dyp).toFixed(2))),
        });
      }
    };
    const up = () => { drag.current = null; };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
    return () => { window.removeEventListener('pointermove', move); window.removeEventListener('pointerup', up); };
  });

  // Keyboard: nudge selected element with arrows (Shift = bigger), delete with Del/Backspace.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!selectedId) return;
      const tag = (document.activeElement?.tagName || '').toLowerCase();
      if (tag === 'input' || tag === 'textarea' || tag === 'select') return;
      const el = els.find((x) => x.id === selectedId);
      if (!el) return;
      const step = e.shiftKey ? 5 : 1;
      const clamp = (n: number) => Math.min(98, Math.max(0, +n.toFixed(2)));
      if (e.key === 'ArrowLeft') { e.preventDefault(); update(selectedId, { x: clamp(el.x - step) }); }
      else if (e.key === 'ArrowRight') { e.preventDefault(); update(selectedId, { x: clamp(el.x + step) }); }
      else if (e.key === 'ArrowUp') { e.preventDefault(); update(selectedId, { y: clamp(el.y - step) }); }
      else if (e.key === 'ArrowDown') { e.preventDefault(); update(selectedId, { y: clamp(el.y + step) }); }
      else if (e.key === 'Delete' || e.key === 'Backspace') { e.preventDefault(); removeEl(selectedId); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  const bgColor = slide.settings?.bgColor || settings.background || '#0f172a';

  return (
    <div className="fixed inset-0 z-[60] flex flex-col bg-stone-50/95 backdrop-blur-md">
      {/* Toolbar */}
      <div className="flex items-center justify-between border-b border-stone-200 px-4 py-3 gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          <Layers className="h-4 w-4 text-teal-600" />
          <span className="text-sm font-bold text-stone-900">Slide Designer</span>
          <span className="text-[10px] text-stone-500 hidden sm:inline">drag to move · corner to resize · arrows nudge · Del removes</span>
        </div>
        <div className="flex items-center gap-2">
          {(slide.content?.trim() || slide.translation?.trim()) && (
            <button onClick={addLyrics} title="Drop the slide's song words on as movable text" className="flex items-center gap-1.5 rounded-lg bg-teal-50 border border-teal-200 hover:bg-teal-100 px-3 py-1.5 text-xs font-bold text-teal-700"><Type className="h-3.5 w-3.5" />Add lyrics</button>
          )}
          <button onClick={addText} className="flex items-center gap-1.5 rounded-lg bg-stone-100 border border-stone-200 hover:bg-stone-200 px-3 py-1.5 text-xs font-bold text-stone-800"><Type className="h-3.5 w-3.5" />Text</button>
          <button onClick={() => setShowMedia('image')} className="flex items-center gap-1.5 rounded-lg bg-stone-100 border border-stone-200 hover:bg-stone-200 px-3 py-1.5 text-xs font-bold text-stone-800"><ImageIcon className="h-3.5 w-3.5" />Image</button>
          <button onClick={() => setShowMedia('video')} className="flex items-center gap-1.5 rounded-lg bg-stone-100 border border-stone-200 hover:bg-stone-200 px-3 py-1.5 text-xs font-bold text-stone-800"><Film className="h-3.5 w-3.5" />Video</button>
          <button onClick={() => { setShowTemplates((v) => !v); setShowMedia(null); }} className={`flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-bold ${showTemplates ? 'bg-teal-600 border-teal-400 text-white' : 'bg-stone-100 border-stone-200 text-stone-800 hover:bg-stone-200'}`}><LayoutTemplate className="h-3.5 w-3.5" />Templates</button>
          <button onClick={onClose} className="flex items-center gap-1.5 rounded-lg bg-teal-600 hover:bg-teal-500 px-4 py-1.5 text-xs font-bold text-white"><X className="h-3.5 w-3.5" />Done</button>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Canvas area */}
        <div className="flex-1 flex items-center justify-center p-6 overflow-auto" onPointerDown={() => setSelectedId(null)}>
          <div
            ref={stageRef}
            className="relative w-full max-w-5xl aspect-video rounded-xl overflow-hidden shadow-2xl ring-1 ring-white/10"
            style={{ backgroundColor: bgColor, containerType: 'size' } as React.CSSProperties}
          >
            {/* Background media preview */}
            {slide.media_type === 'image' && slide.media_url && (
              <img src={slide.media_url} alt="" className="absolute inset-0 w-full h-full object-cover" />
            )}
            {slide.media_type === 'video' && slide.media_url && (
              <video src={slide.media_url} muted loop autoPlay playsInline className="absolute inset-0 w-full h-full object-cover" />
            )}

            {/* Elements */}
            {[...els].sort((a, b) => a.z - b.z).map((el) => {
              const isSel = el.id === selectedId;
              const transform = `rotate(${el.rotation || 0}deg) scaleX(${el.flipH ? -1 : 1}) scaleY(${el.flipV ? -1 : 1})`;
              const clipPath = el.crop ? `inset(${el.crop.top}% ${el.crop.right}% ${el.crop.bottom}% ${el.crop.left}%)` : undefined;
              return (
                <div
                  key={el.id}
                  onPointerDown={(e) => onPointerDown(e, el.id, 'move')}
                  className={`absolute cursor-move ${isSel ? 'outline outline-2 outline-violet-400' : ''}`}
                  style={{ left: `${el.x}%`, top: `${el.y}%`, width: `${el.w}%`, height: `${el.h}%`, zIndex: el.z, transform }}
                >
                  {el.type === 'text' ? (
                    <div
                      className="w-full h-full flex items-center overflow-hidden px-1"
                      style={{
                        color: el.color || '#fff',
                        fontSize: `${el.fontSize || 7}cqh`,
                        fontWeight: el.bold ? 800 : 400,
                        textAlign: el.align || 'center',
                        justifyContent: el.align === 'left' ? 'flex-start' : el.align === 'right' ? 'flex-end' : 'center',
                        lineHeight: 1.1,
                        textShadow: '0 2px 8px rgba(0,0,0,0.5)',
                        fontFamily: el.fontFamily || settings.fontFamily || 'Inter',
                      }}
                    >
                      <span className="whitespace-pre-wrap break-words w-full">{el.text}</span>
                    </div>
                  ) : el.type === 'image' ? (
                    <img src={el.url} alt="" className="w-full h-full pointer-events-none" style={{ objectFit: el.fit || 'contain', clipPath }} />
                  ) : (
                    <video src={el.url} muted loop autoPlay playsInline className="w-full h-full pointer-events-none" style={{ objectFit: el.fit || 'contain', clipPath }} />
                  )}

                  {isSel && (
                    <div
                      onPointerDown={(e) => onPointerDown(e, el.id, 'resize')}
                      className="absolute -bottom-1.5 -right-1.5 h-4 w-4 rounded-full bg-teal-400 border-2 border-white cursor-se-resize"
                    />
                  )}
                </div>
              );
            })}

            {els.length === 0 && (
              <div className="absolute inset-0 flex items-center justify-center text-stone-500 text-sm pointer-events-none">
                Add text, an image or a video from the toolbar.
              </div>
            )}
          </div>
        </div>

        {/* Properties / media panel */}
        <aside className="w-72 shrink-0 border-l border-stone-200 bg-white p-4 overflow-y-auto">
          {/* Layers (stacking order) — always visible */}
          {els.length > 0 && !showTemplates && !showMedia && (
            <div className="mb-4 pb-4 border-b border-stone-200">
              <div className="flex items-center gap-2 mb-2"><Layers className="h-3.5 w-3.5 text-teal-600" /><span className="text-xs font-bold uppercase tracking-wider text-stone-500">Layers</span></div>
              <div className="space-y-1">
                {[...els].sort((a, b) => b.z - a.z).map((el) => (
                  <div key={el.id} className={`flex items-center gap-1 rounded-lg px-2 py-1.5 ${selectedId === el.id ? 'bg-teal-50 border border-teal-200' : 'bg-white border border-stone-200'}`}>
                    <button onClick={() => setSelectedId(el.id)} className="flex-1 flex items-center gap-2 text-left min-w-0">
                      {el.type === 'text' ? <Type className="h-3 w-3 text-stone-500 shrink-0" /> : el.type === 'image' ? <ImageIcon className="h-3 w-3 text-stone-500 shrink-0" /> : <Film className="h-3 w-3 text-stone-500 shrink-0" />}
                      <span className="text-[11px] text-stone-700 truncate">{el.type === 'text' ? (el.text || 'Text') : el.type === 'image' ? 'Image' : 'Video'}</span>
                    </button>
                    <button onClick={() => bump(el.id, 1)} title="Bring forward" className="p-1 text-stone-500 hover:text-stone-800"><ChevronUp className="h-3 w-3" /></button>
                    <button onClick={() => bump(el.id, -1)} title="Send back" className="p-1 text-stone-500 hover:text-stone-800"><ChevronDown className="h-3 w-3" /></button>
                  </div>
                ))}
              </div>
              <p className="mt-1.5 text-[9px] text-stone-400">Top of the list = front. Use ↑/↓ to bring a layer forward or back (e.g. text in front of a video).</p>
            </div>
          )}
          {showTemplates ? (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-stone-500">Templates</span>
                <button onClick={() => setShowTemplates(false)} className="text-stone-500 hover:text-stone-800"><X className="h-4 w-4" /></button>
              </div>
              <button onClick={saveCurrentAsTemplate} className="flex w-full items-center justify-center gap-2 rounded-xl bg-teal-50 border border-teal-200 hover:bg-teal-100 py-2 text-xs font-bold text-teal-700">
                <Save className="h-3.5 w-3.5" />Save current design
              </button>
              <div className="space-y-2.5">
                {templates.length === 0 && (
                  <p className="text-[10px] text-stone-400 text-center py-3">No templates yet. Design a slide and save it.</p>
                )}
                {templates.map((t) => (
                  <div key={t.id} className="group relative">
                    <button onClick={() => applyTemplate(t)} className="block w-full text-left rounded-xl border border-stone-200 hover:border-teal-300 overflow-hidden bg-white transition-colors">
                      <div className="relative w-full aspect-video" style={{ backgroundColor: t.data.bgColor || '#0f172a', containerType: 'size' } as React.CSSProperties}>
                        <SlideElementsLayer elements={t.data.elements} />
                      </div>
                      <div className="px-2.5 py-1.5 flex items-center justify-between">
                        <span className="text-[11px] font-bold text-stone-800 truncate">{t.name}</span>
                        {t.is_starter && <span className="text-[8px] text-stone-500 uppercase tracking-wider">starter</span>}
                      </div>
                    </button>
                    {!t.is_starter && (
                      <button onClick={() => deleteTemplate(t.id)} title="Delete template" className="absolute top-1.5 right-1.5 p-1 rounded-lg bg-white/90 text-stone-500 hover:text-red-600 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Trash2 className="h-3 w-3" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ) : showMedia ? (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-stone-500">Add {showMedia}</span>
                <button onClick={() => setShowMedia(null)} className="text-stone-500 hover:text-stone-800"><X className="h-4 w-4" /></button>
              </div>
              <MediaLibrary onSelectMedia={(url, kind) => addMedia(url, showMedia === 'video' || kind === 'audio' ? 'video' : kind)} />
            </div>
          ) : selected ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-stone-500">{selected.type} properties</span>
                <div className="flex items-center gap-1">
                  <button onClick={() => duplicateEl(selected.id)} title="Duplicate" className="rounded-lg p-1.5 text-stone-500 hover:text-sky-600 hover:bg-teal-100"><Copy className="h-4 w-4" /></button>
                  <button onClick={() => removeEl(selected.id)} title="Delete" className="rounded-lg p-1.5 text-stone-500 hover:text-red-600 hover:bg-red-100"><Trash2 className="h-4 w-4" /></button>
                </div>
              </div>

              {selected.type === 'text' && (
                <>
                  <textarea
                    value={selected.text || ''}
                    onChange={(e) => update(selected.id, { text: e.target.value })}
                    rows={3}
                    className="w-full rounded-xl border border-stone-200 bg-white p-2.5 text-xs text-stone-900 focus:border-teal-400 focus:outline-none resize-none"
                  />
                  <div>
                    <label className="block text-[10px] uppercase font-bold text-stone-500 mb-1.5">Font size</label>
                    <div className="flex items-center gap-2">
                      <button onClick={() => update(selected.id, { fontSize: Math.max(2, (selected.fontSize || 7) - 1) })} className="rounded-lg bg-stone-100 border border-stone-200 px-2.5 py-1 text-sm font-bold text-stone-700">−</button>
                      <span className="text-xs text-stone-500 w-8 text-center">{selected.fontSize || 7}</span>
                      <button onClick={() => update(selected.id, { fontSize: Math.min(40, (selected.fontSize || 7) + 1) })} className="rounded-lg bg-stone-100 border border-stone-200 px-2.5 py-1 text-sm font-bold text-stone-700">+</button>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <label className="text-[10px] uppercase font-bold text-stone-500">Colour</label>
                    <input type="color" value={selected.color || '#ffffff'} onChange={(e) => update(selected.id, { color: e.target.value })} className="h-7 w-10 rounded border border-stone-200 bg-transparent cursor-pointer" />
                    <button onClick={() => update(selected.id, { bold: !selected.bold })} className={`rounded-lg border px-2 py-1 ${selected.bold ? 'bg-teal-600 border-teal-400 text-white' : 'bg-stone-100 border-stone-200 text-stone-700'}`}><Bold className="h-3.5 w-3.5" /></button>
                  </div>
                  <div className="grid grid-cols-3 gap-1 bg-white p-1 rounded-xl border border-stone-200">
                    {([['left', AlignLeft], ['center', AlignCenter], ['right', AlignRight]] as const).map(([a, Icon]) => (
                      <button key={a} onClick={() => update(selected.id, { align: a })} className={`flex items-center justify-center rounded-lg py-1.5 ${ (selected.align || 'center') === a ? 'bg-teal-600 text-white' : 'text-stone-500 hover:text-stone-800'}`}><Icon className="h-3.5 w-3.5" /></button>
                    ))}
                  </div>
                  <div>
                    <label className="block text-[10px] uppercase font-bold text-stone-500 mb-1.5">Font</label>
                    <select
                      value={selected.fontFamily || ''}
                      onChange={(e) => update(selected.id, { fontFamily: e.target.value || undefined })}
                      style={{ fontFamily: selected.fontFamily || 'inherit' }}
                      className="w-full rounded-xl border border-stone-200 bg-stone-50 px-3 py-2 text-xs text-stone-700 focus:border-teal-400 focus:outline-none"
                    >
                      <option value="">Default</option>
                      {FONTS.map((f) => (
                        <option key={f.family} value={f.family} style={{ fontFamily: f.family }}>{f.label} · {f.category}</option>
                      ))}
                    </select>
                  </div>
                </>
              )}

              {(selected.type === 'image' || selected.type === 'video') && (
                <>
                  <div className="grid grid-cols-2 gap-1 bg-white p-1 rounded-xl border border-stone-200">
                    {(['contain', 'cover'] as const).map((f) => (
                      <button key={f} onClick={() => update(selected.id, { fit: f })} className={`rounded-lg py-1.5 text-[10px] font-bold capitalize ${ (selected.fit || 'contain') === f ? 'bg-teal-600 text-white' : 'text-stone-500 hover:text-stone-800'}`}>{f === 'contain' ? 'Fit (whole)' : 'Fill (crop)'}</button>
                    ))}
                  </div>
                  <div>
                    <label className="block text-[10px] uppercase font-bold text-stone-500 mb-1.5">Crop edges (%)</label>
                    <div className="grid grid-cols-2 gap-2">
                      {(['top', 'right', 'bottom', 'left'] as const).map((side) => (
                        <label key={side} className="flex items-center gap-1.5 text-[10px] text-stone-500">
                          <span className="w-9 capitalize">{side}</span>
                          <input
                            type="number" min={0} max={90}
                            value={selected.crop?.[side] ?? 0}
                            onChange={(e) => {
                              const v = Math.max(0, Math.min(90, Number(e.target.value) || 0));
                              const c = { top: 0, right: 0, bottom: 0, left: 0, ...(selected.crop || {}) };
                              update(selected.id, { crop: { ...c, [side]: v } });
                            }}
                            className="w-full rounded-lg border border-stone-200 bg-white px-2 py-1 text-stone-800 focus:outline-none"
                          />
                        </label>
                      ))}
                    </div>
                  </div>
                </>
              )}

              {/* Rotate & flip (all element types) */}
              <div className="border-t border-stone-200 pt-3 space-y-2">
                <label className="block text-[10px] uppercase font-bold text-stone-500">Rotate &amp; flip</label>
                <div className="flex items-center gap-2">
                  <RotateCw className="h-3.5 w-3.5 text-stone-500" />
                  <input type="range" min={-180} max={180} value={selected.rotation || 0} onChange={(e) => update(selected.id, { rotation: Number(e.target.value) })} className="flex-1 accent-teal-600" />
                  <span className="text-[10px] text-stone-500 w-9 text-right">{selected.rotation || 0}°</span>
                </div>
                <div className="flex items-center gap-2">
                  <button onClick={() => update(selected.id, { flipH: !selected.flipH })} className={`flex-1 rounded-lg border py-1.5 text-[10px] font-bold ${selected.flipH ? 'bg-teal-600 border-teal-400 text-white' : 'bg-stone-100 border-stone-200 text-stone-700'}`}>Flip H</button>
                  <button onClick={() => update(selected.id, { flipV: !selected.flipV })} className={`flex-1 rounded-lg border py-1.5 text-[10px] font-bold ${selected.flipV ? 'bg-teal-600 border-teal-400 text-white' : 'bg-stone-100 border-stone-200 text-stone-700'}`}>Flip V</button>
                </div>
              </div>

              <div className="flex items-center gap-2 border-t border-stone-200 pt-3">
                <span className="text-[10px] uppercase font-bold text-stone-500">Layer</span>
                <button onClick={() => bump(selected.id, 1)} title="Bring forward" className="rounded-lg bg-stone-100 border border-stone-200 p-1.5 text-stone-700 hover:bg-stone-200"><ChevronUp className="h-3.5 w-3.5" /></button>
                <button onClick={() => bump(selected.id, -1)} title="Send back" className="rounded-lg bg-stone-100 border border-stone-200 p-1.5 text-stone-700 hover:bg-stone-200"><ChevronDown className="h-3.5 w-3.5" /></button>
              </div>
            </div>
          ) : (
            <div className="text-xs text-stone-500 leading-relaxed space-y-5">
              <div>
                <label className="block text-[10px] uppercase font-bold text-stone-500 mb-1.5">Slide background colour</label>
                <div className="flex items-center gap-2">
                  <input type="color" value={bgColor} onChange={(e) => onBgChange(e.target.value)} className="h-8 w-12 rounded border border-stone-200 bg-transparent cursor-pointer" />
                  <code className="text-[10px] text-stone-500">{bgColor}</code>
                </div>
                <p className="mt-1 text-[10px] text-stone-400">Used when the slide has no background image/video.</p>
              </div>
              <div>
                <p className="font-bold text-stone-700 mb-2">Free-placement designer</p>
                <p>Add text boxes, images and videos from the toolbar, then drag them around and resize from the corner. Click an element to edit it — colour, font, rotate/flip, crop and layer order.</p>
              </div>
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}
