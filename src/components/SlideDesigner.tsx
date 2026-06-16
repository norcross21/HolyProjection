'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { Slide, SlideElement, Presentation } from '@/utils/sync';
import MediaLibrary from '@/components/MediaLibrary';
import {
  X, Type, Image as ImageIcon, Film, Trash2, ChevronUp, ChevronDown,
  Bold, AlignLeft, AlignCenter, AlignRight, Layers,
} from 'lucide-react';

interface SlideDesignerProps {
  slide: Slide;
  settings: Presentation['settings'];
  onChange: (elements: SlideElement[]) => void;
  onClose: () => void;
}

const uid = () => `el-${Date.now()}-${Math.floor(performance.now() % 100000)}`;

export default function SlideDesigner({ slide, settings, onChange, onClose }: SlideDesignerProps) {
  const [els, setEls] = useState<SlideElement[]>(slide.elements ? [...slide.elements] : []);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [showMedia, setShowMedia] = useState<null | 'image' | 'video'>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const drag = useRef<{ id: string; mode: 'move' | 'resize'; sx: number; sy: number; ox: number; oy: number; ow: number; oh: number } | null>(null);

  const commit = useCallback((next: SlideElement[]) => {
    setEls(next);
    onChange(next);
  }, [onChange]);

  const update = (id: string, patch: Partial<SlideElement>) => {
    commit(els.map((e) => (e.id === id ? { ...e, ...patch } : e)));
  };

  const selected = els.find((e) => e.id === selectedId) || null;
  const maxZ = els.reduce((m, e) => Math.max(m, e.z), 0);

  const addText = () => {
    const el: SlideElement = { id: uid(), type: 'text', x: 25, y: 40, w: 50, h: 18, z: maxZ + 1, text: 'New text', color: '#ffffff', fontSize: 7, align: 'center', bold: true };
    commit([...els, el]); setSelectedId(el.id);
  };
  const addMedia = (url: string, kind: 'image' | 'video') => {
    if (!url) { setShowMedia(null); return; }
    const el: SlideElement = { id: uid(), type: kind, x: 30, y: 25, w: 40, h: 45, z: maxZ + 1, url, fit: 'contain' };
    commit([...els, el]); setSelectedId(el.id); setShowMedia(null);
  };
  const removeEl = (id: string) => { commit(els.filter((e) => e.id !== id)); if (selectedId === id) setSelectedId(null); };
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

  const bgColor = settings.background || '#0f172a';

  return (
    <div className="fixed inset-0 z-[60] flex flex-col bg-slate-950/95 backdrop-blur-md">
      {/* Toolbar */}
      <div className="flex items-center justify-between border-b border-slate-800 px-4 py-3 gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          <Layers className="h-4 w-4 text-violet-400" />
          <span className="text-sm font-bold text-slate-100">Slide Designer</span>
          <span className="text-[10px] text-slate-500 hidden sm:inline">drag to move · drag corner to resize</span>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={addText} className="flex items-center gap-1.5 rounded-lg bg-slate-900 border border-slate-800 hover:bg-slate-800 px-3 py-1.5 text-xs font-bold text-slate-200"><Type className="h-3.5 w-3.5" />Text</button>
          <button onClick={() => setShowMedia('image')} className="flex items-center gap-1.5 rounded-lg bg-slate-900 border border-slate-800 hover:bg-slate-800 px-3 py-1.5 text-xs font-bold text-slate-200"><ImageIcon className="h-3.5 w-3.5" />Image</button>
          <button onClick={() => setShowMedia('video')} className="flex items-center gap-1.5 rounded-lg bg-slate-900 border border-slate-800 hover:bg-slate-800 px-3 py-1.5 text-xs font-bold text-slate-200"><Film className="h-3.5 w-3.5" />Video</button>
          <button onClick={onClose} className="flex items-center gap-1.5 rounded-lg bg-violet-600 hover:bg-violet-500 px-4 py-1.5 text-xs font-bold text-white"><X className="h-3.5 w-3.5" />Done</button>
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
              return (
                <div
                  key={el.id}
                  onPointerDown={(e) => onPointerDown(e, el.id, 'move')}
                  className={`absolute cursor-move ${isSel ? 'outline outline-2 outline-violet-400' : ''}`}
                  style={{ left: `${el.x}%`, top: `${el.y}%`, width: `${el.w}%`, height: `${el.h}%`, zIndex: el.z }}
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
                        fontFamily: settings.fontFamily || 'Inter',
                      }}
                    >
                      <span className="whitespace-pre-wrap break-words w-full">{el.text}</span>
                    </div>
                  ) : el.type === 'image' ? (
                    <img src={el.url} alt="" className="w-full h-full pointer-events-none" style={{ objectFit: el.fit || 'contain' }} />
                  ) : (
                    <video src={el.url} muted loop autoPlay playsInline className="w-full h-full pointer-events-none" style={{ objectFit: el.fit || 'contain' }} />
                  )}

                  {isSel && (
                    <div
                      onPointerDown={(e) => onPointerDown(e, el.id, 'resize')}
                      className="absolute -bottom-1.5 -right-1.5 h-4 w-4 rounded-full bg-violet-400 border-2 border-white cursor-se-resize"
                    />
                  )}
                </div>
              );
            })}

            {els.length === 0 && (
              <div className="absolute inset-0 flex items-center justify-center text-slate-400 text-sm pointer-events-none">
                Add text, an image or a video from the toolbar.
              </div>
            )}
          </div>
        </div>

        {/* Properties / media panel */}
        <aside className="w-72 shrink-0 border-l border-slate-800 bg-slate-950/60 p-4 overflow-y-auto">
          {showMedia ? (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Add {showMedia}</span>
                <button onClick={() => setShowMedia(null)} className="text-slate-500 hover:text-slate-200"><X className="h-4 w-4" /></button>
              </div>
              <MediaLibrary onSelectMedia={(url, kind) => addMedia(url, showMedia === 'video' ? 'video' : kind)} />
            </div>
          ) : selected ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-400">{selected.type} properties</span>
                <button onClick={() => removeEl(selected.id)} title="Delete" className="rounded-lg p-1.5 text-slate-500 hover:text-red-400 hover:bg-red-950/30"><Trash2 className="h-4 w-4" /></button>
              </div>

              {selected.type === 'text' && (
                <>
                  <textarea
                    value={selected.text || ''}
                    onChange={(e) => update(selected.id, { text: e.target.value })}
                    rows={3}
                    className="w-full rounded-xl border border-slate-800 bg-slate-950/60 p-2.5 text-xs text-slate-100 focus:border-violet-500 focus:outline-none resize-none"
                  />
                  <div>
                    <label className="block text-[10px] uppercase font-bold text-slate-500 mb-1.5">Font size</label>
                    <div className="flex items-center gap-2">
                      <button onClick={() => update(selected.id, { fontSize: Math.max(2, (selected.fontSize || 7) - 1) })} className="rounded-lg bg-slate-900 border border-slate-800 px-2.5 py-1 text-sm font-bold text-slate-300">−</button>
                      <span className="text-xs text-slate-400 w-8 text-center">{selected.fontSize || 7}</span>
                      <button onClick={() => update(selected.id, { fontSize: Math.min(40, (selected.fontSize || 7) + 1) })} className="rounded-lg bg-slate-900 border border-slate-800 px-2.5 py-1 text-sm font-bold text-slate-300">+</button>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <label className="text-[10px] uppercase font-bold text-slate-500">Colour</label>
                    <input type="color" value={selected.color || '#ffffff'} onChange={(e) => update(selected.id, { color: e.target.value })} className="h-7 w-10 rounded border border-slate-800 bg-transparent cursor-pointer" />
                    <button onClick={() => update(selected.id, { bold: !selected.bold })} className={`rounded-lg border px-2 py-1 ${selected.bold ? 'bg-violet-600 border-violet-500 text-white' : 'bg-slate-900 border-slate-800 text-slate-300'}`}><Bold className="h-3.5 w-3.5" /></button>
                  </div>
                  <div className="grid grid-cols-3 gap-1 bg-slate-950/60 p-1 rounded-xl border border-slate-800">
                    {([['left', AlignLeft], ['center', AlignCenter], ['right', AlignRight]] as const).map(([a, Icon]) => (
                      <button key={a} onClick={() => update(selected.id, { align: a })} className={`flex items-center justify-center rounded-lg py-1.5 ${ (selected.align || 'center') === a ? 'bg-violet-600 text-white' : 'text-slate-400 hover:text-slate-200'}`}><Icon className="h-3.5 w-3.5" /></button>
                    ))}
                  </div>
                </>
              )}

              {(selected.type === 'image' || selected.type === 'video') && (
                <div className="grid grid-cols-2 gap-1 bg-slate-950/60 p-1 rounded-xl border border-slate-800">
                  {(['contain', 'cover'] as const).map((f) => (
                    <button key={f} onClick={() => update(selected.id, { fit: f })} className={`rounded-lg py-1.5 text-[10px] font-bold capitalize ${ (selected.fit || 'contain') === f ? 'bg-violet-600 text-white' : 'text-slate-400 hover:text-slate-200'}`}>{f === 'contain' ? 'Fit (whole)' : 'Fill (crop)'}</button>
                  ))}
                </div>
              )}

              <div className="flex items-center gap-2 border-t border-slate-900 pt-3">
                <span className="text-[10px] uppercase font-bold text-slate-500">Layer</span>
                <button onClick={() => bump(selected.id, 1)} title="Bring forward" className="rounded-lg bg-slate-900 border border-slate-800 p-1.5 text-slate-300 hover:bg-slate-800"><ChevronUp className="h-3.5 w-3.5" /></button>
                <button onClick={() => bump(selected.id, -1)} title="Send back" className="rounded-lg bg-slate-900 border border-slate-800 p-1.5 text-slate-300 hover:bg-slate-800"><ChevronDown className="h-3.5 w-3.5" /></button>
              </div>
            </div>
          ) : (
            <div className="text-xs text-slate-500 leading-relaxed">
              <p className="font-bold text-slate-300 mb-2">Free-placement designer</p>
              <p>Add text boxes, images and videos from the toolbar, then drag them around and resize from the corner. Click an element to edit it here.</p>
              <p className="mt-3 text-slate-600">Elements show on top of the slide background on the projector and follower screens.</p>
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}
