'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { Search, CornerDownLeft } from 'lucide-react';

export interface QuickItem {
  id: string;
  title: string;
  subtitle?: string;
  group?: string;
  badge?: string;
}

/**
 * Quick Find command palette. Opens over the app (⌘K / Ctrl-K), filters a list
 * by title + subtitle as you type, full keyboard nav (↑ ↓ Enter Esc). Context
 * decides what `items` are passed in — presentations in the portal, slides inside
 * a presentation — so one component serves both "switch to" and "jump live".
 */
export default function QuickFind({
  open,
  onClose,
  onSelect,
  items,
  placeholder = 'Search…',
  hint = 'to select',
}: {
  open: boolean;
  onClose: () => void;
  onSelect: (id: string) => void;
  items: QuickItem[];
  placeholder?: string;
  hint?: string;
}) {
  const [query, setQuery] = useState('');
  const [active, setActive] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (open) {
      setQuery('');
      setActive(0);
      // focus after the element is mounted/painted
      const t = setTimeout(() => inputRef.current?.focus(), 30);
      return () => clearTimeout(t);
    }
  }, [open]);

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return items.slice(0, 50);
    return items
      .filter((it) => `${it.title} ${it.subtitle ?? ''}`.toLowerCase().includes(q))
      .slice(0, 50);
  }, [items, query]);

  useEffect(() => { setActive(0); }, [query]);

  // Keep the active row in view.
  useEffect(() => {
    const el = listRef.current?.querySelector<HTMLElement>(`[data-idx="${active}"]`);
    el?.scrollIntoView({ block: 'nearest' });
  }, [active]);

  if (!open) return null;

  const choose = (i: number) => {
    const it = results[i];
    if (it) { onSelect(it.id); onClose(); }
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') { e.preventDefault(); setActive((a) => Math.min(a + 1, results.length - 1)); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setActive((a) => Math.max(a - 1, 0)); }
    else if (e.key === 'Enter') { e.preventDefault(); choose(active); }
    else if (e.key === 'Escape') { e.preventDefault(); onClose(); }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-start justify-center bg-stone-900/30 backdrop-blur-sm px-4 pt-[12vh]" onClick={onClose}>
      <div
        className="w-full max-w-xl rounded-2xl border border-stone-200 bg-white shadow-2xl shadow-stone-900/20 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
        onKeyDown={onKeyDown}
      >
        <div className="flex items-center gap-3 border-b border-stone-200 px-4">
          <Search className="h-4 w-4 text-stone-400 shrink-0" />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={placeholder}
            className="flex-1 bg-transparent py-3.5 text-sm text-stone-900 placeholder:text-stone-400 focus:outline-none"
          />
          <kbd className="hidden sm:block text-[10px] font-bold text-stone-400 border border-stone-200 rounded px-1.5 py-0.5">ESC</kbd>
        </div>

        <div ref={listRef} className="max-h-[50vh] overflow-y-auto py-1.5">
          {results.length === 0 ? (
            <p className="px-4 py-8 text-center text-sm text-stone-400">No matches.</p>
          ) : (
            results.map((it, i) => (
              <button
                key={it.id}
                data-idx={i}
                onMouseEnter={() => setActive(i)}
                onClick={() => choose(i)}
                className={`flex w-full items-center gap-3 px-4 py-2.5 text-left transition-colors ${i === active ? 'bg-teal-50' : 'hover:bg-stone-50'}`}
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="truncate text-sm font-semibold text-stone-900">{it.title || 'Untitled'}</span>
                    {it.badge && <span className="shrink-0 rounded-full bg-stone-100 px-2 py-0.5 text-[10px] font-bold text-stone-500">{it.badge}</span>}
                  </div>
                  {it.subtitle && <p className="truncate text-xs text-stone-500 mt-0.5">{it.subtitle}</p>}
                </div>
                {i === active && (
                  <span className="hidden sm:flex items-center gap-1 text-[10px] font-bold text-teal-600 shrink-0">
                    <CornerDownLeft className="h-3 w-3" />{hint}
                  </span>
                )}
              </button>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
