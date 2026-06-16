'use client';

import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/utils/supabase';
import { UploadCloud, Loader2, Trash2, CheckCircle2 } from 'lucide-react';

export type MediaKind = 'image' | 'video';

interface MediaLibraryProps {
  onSelectMedia: (url: string, kind: MediaKind) => void;
  currentUrl?: string;
}

const VIDEO_EXT = /\.(mp4|webm|mov|m4v|ogg)(\?|$)/i;
const kindOf = (url: string): MediaKind => (VIDEO_EXT.test(url) ? 'video' : 'image');

const isSupabaseConfigured =
  Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL) &&
  Boolean(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) &&
  process.env.NEXT_PUBLIC_SUPABASE_URL !== 'https://your-project-id.supabase.co' &&
  process.env.NEXT_PUBLIC_SUPABASE_URL !== 'https://placeholder-project-id.supabase.co';

export default function MediaLibrary({ onSelectMedia, currentUrl }: MediaLibraryProps) {
  const [items, setItems] = useState<string[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadInfo, setUploadInfo] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    loadMedia();
  }, []);

  const loadMedia = async () => {
    setIsLoading(true);
    setErrorMsg(null);

    if (!isSupabaseConfigured) {
      const stored = localStorage.getItem('holyproj_uploaded_media');
      setItems(stored ? JSON.parse(stored) : []);
      setIsLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase.storage.from('presentation-media').list('', {
        sortBy: { column: 'created_at', order: 'desc' },
      });
      if (error) throw error;
      if (data) {
        const urls = data
          .filter((f) => f.name !== '.emptyFolderPlaceholder')
          .map((file) => supabase.storage.from('presentation-media').getPublicUrl(file.name).data.publicUrl);
        setItems(urls);
      }
    } catch (err: any) {
      console.error('Error fetching media:', err?.message || err);
      setErrorMsg(err?.message || 'Failed to load media.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    const file = files[0];
    const kind: MediaKind = file.type.startsWith('video') ? 'video' : 'image';
    const mb = file.size / (1024 * 1024);
    if (mb > 500) {
      setErrorMsg(`That file is ${mb.toFixed(0)} MB — the limit is 500 MB. Please compress the ${kind} first (see the tip below).`);
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }
    setUploadInfo(`${file.name} · ${mb.toFixed(1)} MB`);
    setIsUploading(true);
    setErrorMsg(null);

    if (!isSupabaseConfigured) {
      const localUrl = URL.createObjectURL(file);
      const updated = [localUrl, ...items];
      localStorage.setItem('holyproj_uploaded_media', JSON.stringify(updated));
      setItems(updated);
      onSelectMedia(localUrl, kind);
      setIsUploading(false);
      return;
    }

    try {
      const fileName = `${Date.now()}-${file.name.replace(/[^a-zA-Z0-9.]/g, '_')}`;
      const { error } = await supabase.storage
        .from('presentation-media')
        .upload(fileName, file, { cacheControl: '3600', upsert: false });
      if (error) throw error;

      const { data: { publicUrl } } = supabase.storage.from('presentation-media').getPublicUrl(fileName);
      setItems((prev) => [publicUrl, ...prev]);
      onSelectMedia(publicUrl, kind);
    } catch (err: any) {
      console.error('Error uploading media:', err?.message || err);
      setErrorMsg(err?.message || 'Upload failed. Check your connection and try again.');
    } finally {
      setIsUploading(false);
      setUploadInfo(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleRemove = (url: string) => {
    const updated = items.filter((u) => u !== url);
    setItems(updated);
    if (!isSupabaseConfigured) {
      localStorage.setItem('holyproj_uploaded_media', JSON.stringify(updated));
    } else {
      // Best-effort delete from storage (filename is the last path segment)
      const name = decodeURIComponent(url.split('/').pop()?.split('?')[0] || '');
      if (name) supabase.storage.from('presentation-media').remove([name]);
    }
    if (currentUrl === url) onSelectMedia('', 'image');
  };

  return (
    <div className="space-y-4">
      {errorMsg && (
        <div className="rounded-xl bg-red-950/40 border border-red-500/30 p-3 text-[10px] text-red-400">{errorMsg}</div>
      )}

      <div
        onClick={() => fileInputRef.current?.click()}
        className="border-2 border-dashed border-slate-800 hover:border-violet-500/50 rounded-2xl p-5 text-center cursor-pointer bg-slate-950/40 hover:bg-slate-950/70 transition-all duration-200"
      >
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileUpload}
          accept="image/*,video/*"
          className="hidden"
        />
        {isUploading ? (
          <div className="flex flex-col items-center justify-center gap-2">
            <Loader2 className="h-6 w-6 text-violet-400 animate-spin" />
            <span className="text-[10px] text-slate-400">Uploading… large videos can take a minute</span>
            {uploadInfo && <span className="text-[9px] text-slate-600">{uploadInfo}</span>}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center gap-1.5">
            <UploadCloud className="h-6 w-6 text-slate-500" />
            <span className="text-[11px] font-bold text-slate-300">Upload Image or Video</span>
            <span className="text-[9px] text-slate-650">JPG, PNG, GIF, MP4, WebM · up to 500MB</span>
          </div>
        )}
      </div>

      <p className="text-[9px] text-slate-600 leading-relaxed">
        Tip: video files are large. If yours is over ~500MB or uploads slowly, compress it first
        (free tools: HandBrake, or the "compress video" option in your phone/Photos app) — 1080p is plenty for projection.
      </p>

      <div className="space-y-2">
        <label className="block text-[10px] uppercase font-semibold text-slate-500">Media Library</label>
        {isLoading ? (
          <div className="flex justify-center py-4"><Loader2 className="h-5 w-5 text-violet-500 animate-spin" /></div>
        ) : items.length === 0 ? (
          <div className="text-[10px] text-slate-600 text-center py-2">No media uploaded yet.</div>
        ) : (
          <div className="grid grid-cols-3 gap-2.5 max-h-[160px] overflow-y-auto pr-1">
            {items.map((url, idx) => {
              const isSelected = currentUrl === url;
              const kind = kindOf(url);
              return (
                <div
                  key={idx}
                  onClick={() => onSelectMedia(url, kind)}
                  className={`group relative rounded-xl aspect-video overflow-hidden border cursor-pointer transition-all ${
                    isSelected ? 'border-violet-500 shadow-md shadow-violet-500/10' : 'border-slate-900 hover:border-slate-800'
                  }`}
                >
                  {kind === 'video' ? (
                    <video src={url} muted playsInline preload="metadata" className="w-full h-full object-cover" />
                  ) : (
                    <img src={url} alt="Media option" className="w-full h-full object-cover" />
                  )}
                  {kind === 'video' && (
                    <span className="absolute bottom-1 left-1 rounded bg-black/70 px-1 py-0.5 text-[8px] font-bold text-white">VIDEO</span>
                  )}
                  {isSelected && (
                    <div className="absolute inset-0 bg-violet-950/20 flex items-center justify-center">
                      <CheckCircle2 className="h-5 w-5 text-violet-400 drop-shadow-md" />
                    </div>
                  )}
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); handleRemove(url); }}
                    className="absolute top-1 right-1 p-1 rounded-lg bg-slate-950/80 text-slate-500 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <Trash2 className="h-3 w-3" />
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
