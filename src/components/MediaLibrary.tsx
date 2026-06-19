'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '@/utils/supabase';
import { UploadCloud, Loader2, Trash2, CheckCircle2, Music } from 'lucide-react';

export type MediaKind = 'image' | 'video' | 'audio';

interface MediaLibraryProps {
  onSelectMedia: (url: string, kind: MediaKind) => void;
  currentUrl?: string;
  filter?: MediaKind; // when set, only show/accept this kind (e.g. 'audio')
}

const VIDEO_EXT = /\.(mp4|webm|mov|m4v)(\?|$)/i;
const AUDIO_EXT = /\.(mp3|wav|m4a|aac|oga|ogg|flac)(\?|$)/i;
const kindOf = (url: string): MediaKind => (AUDIO_EXT.test(url) ? 'audio' : VIDEO_EXT.test(url) ? 'video' : 'image');

const isSupabaseConfigured =
  Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL) &&
  Boolean(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) &&
  process.env.NEXT_PUBLIC_SUPABASE_URL !== 'https://your-project-id.supabase.co' &&
  process.env.NEXT_PUBLIC_SUPABASE_URL !== 'https://placeholder-project-id.supabase.co';

function errorMessage(err: unknown, fallback: string): string {
  return err instanceof Error ? err.message : fallback;
}

export default function MediaLibrary({ onSelectMedia, currentUrl, filter }: MediaLibraryProps) {
  const [items, setItems] = useState<string[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadInfo, setUploadInfo] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const loadMedia = useCallback(async () => {
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
    } catch (err: unknown) {
      console.error('Error fetching media:', errorMessage(err, 'Failed to load media.'));
      setErrorMsg(errorMessage(err, 'Failed to load media.'));
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    queueMicrotask(() => {
      void loadMedia();
    });
  }, [loadMedia]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    const file = files[0];
    const kind: MediaKind = file.type.startsWith('audio') ? 'audio' : file.type.startsWith('video') ? 'video' : 'image';
    const mb = file.size / (1024 * 1024);

    // Images: hard 500MB cap. Videos: allow larger input (we compress it down),
    // but cap at ~1GB to avoid crashing the browser tab during compression.
    const inputCap = kind === 'video' ? 1024 : 500;
    if (mb > inputCap) {
      setErrorMsg(`That file is ${mb.toFixed(0)} MB — too large. Please use a smaller ${kind} (see the tip below).`);
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    setIsUploading(true);
    setErrorMsg(null);
    let uploadFile = file;

    try {
      // Auto-compress videos over ~20MB in the browser before uploading.
      if (kind === 'video' && mb > 20) {
        setUploadInfo('Preparing compressor… (first run downloads it once)');
        try {
          const { compressVideo } = await import('@/utils/videoCompress');
          uploadFile = await compressVideo(file, (r) => setUploadInfo(`Compressing video… ${Math.round(r * 100)}%`));
        } catch (cErr) {
          console.warn('Video compression failed, using original:', cErr);
          uploadFile = file; // graceful fallback — upload the original
        }
      }

      const finalMb = uploadFile.size / (1024 * 1024);
      if (finalMb > 500) {
        throw new Error(`Still ${finalMb.toFixed(0)} MB after processing — over the 500 MB limit. Try a shorter clip.`);
      }
      setUploadInfo(`${uploadFile.name} · ${finalMb.toFixed(1)} MB`);

      if (!isSupabaseConfigured) {
        const localUrl = URL.createObjectURL(uploadFile);
        const updated = [localUrl, ...items];
        localStorage.setItem('holyproj_uploaded_media', JSON.stringify(updated));
        setItems(updated);
        onSelectMedia(localUrl, kind);
        return;
      }

      const fileName = `${Date.now()}-${uploadFile.name.replace(/[^a-zA-Z0-9.]/g, '_')}`;
      const { error } = await supabase.storage
        .from('presentation-media')
        .upload(fileName, uploadFile, { cacheControl: '3600', upsert: false });
      if (error) throw error;

      const { data: { publicUrl } } = supabase.storage.from('presentation-media').getPublicUrl(fileName);
      setItems((prev) => [publicUrl, ...prev]);
      onSelectMedia(publicUrl, kind);
    } catch (err: unknown) {
      console.error('Error uploading media:', errorMessage(err, 'Upload failed. Check your connection and try again.'));
      setErrorMsg(errorMessage(err, 'Upload failed. Check your connection and try again.'));
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
        <div className="rounded-xl bg-red-50 border border-red-200 p-3 text-[10px] text-red-600">{errorMsg}</div>
      )}

      <div
        onClick={() => fileInputRef.current?.click()}
        className="border-2 border-dashed border-stone-200 hover:border-teal-300 rounded-2xl p-5 text-center cursor-pointer bg-white hover:bg-white/80 transition-all duration-200"
      >
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileUpload}
          accept={filter === 'audio' ? 'audio/*' : filter === 'video' ? 'video/*' : filter === 'image' ? 'image/*' : 'image/*,video/*,audio/*'}
          className="hidden"
        />
        {isUploading ? (
          <div className="flex flex-col items-center justify-center gap-2">
            <Loader2 className="h-6 w-6 text-teal-600 animate-spin" />
            <span className="text-[10px] text-stone-500">Uploading… large videos can take a minute</span>
            {uploadInfo && <span className="text-[9px] text-stone-400">{uploadInfo}</span>}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center gap-1.5">
            <UploadCloud className="h-6 w-6 text-stone-500" />
            <span className="text-[11px] font-bold text-stone-700">{filter === 'audio' ? 'Upload audio' : 'Upload Image or Video'}</span>
            <span className="text-[9px] text-stone-400">{filter === 'audio' ? 'MP3, WAV, M4A, OGG' : 'JPG, PNG, GIF, MP4, WebM'} · up to 500MB</span>
          </div>
        )}
      </div>

      {filter !== 'audio' && (
        <p className="text-[9px] text-stone-400 leading-relaxed">
          Tip: video files are large. If yours is over ~500MB or uploads slowly, compress it first
          (free tools: HandBrake, or the &quot;compress video&quot; option in your phone/Photos app) — 1080p is plenty for projection.
        </p>
      )}

      <div className="space-y-2">
        <label className="block text-[10px] uppercase font-semibold text-stone-500">{filter === 'audio' ? 'Audio library' : 'Media Library'}</label>
        {(() => {
          const visible = filter ? items.filter((u) => kindOf(u) === filter) : items;
          if (isLoading) return <div className="flex justify-center py-4"><Loader2 className="h-5 w-5 text-teal-600 animate-spin" /></div>;
          if (visible.length === 0) return <div className="text-[10px] text-stone-400 text-center py-2">Nothing uploaded yet.</div>;
          return (
          <div className={`grid gap-2.5 max-h-[160px] overflow-y-auto pr-1 ${filter === 'audio' ? 'grid-cols-1' : 'grid-cols-3'}`}>
            {visible.map((url, idx) => {
              const isSelected = currentUrl === url;
              const kind = kindOf(url);
              if (kind === 'audio') {
                const name = decodeURIComponent(url.split('/').pop()?.split('?')[0] || 'audio').replace(/^\d+-/, '');
                return (
                  <div key={idx} onClick={() => onSelectMedia(url, 'audio')} className={`group relative flex items-center gap-2 rounded-xl border px-3 py-2 cursor-pointer transition-all ${isSelected ? 'border-teal-400 bg-teal-50' : 'border-stone-200 hover:border-stone-300'}`}>
                    <Music className={`h-4 w-4 shrink-0 ${isSelected ? 'text-teal-600' : 'text-stone-500'}`} />
                    <span className="text-[11px] text-stone-800 truncate flex-1">{name}</span>
                    {isSelected && <CheckCircle2 className="h-4 w-4 text-teal-600 shrink-0" />}
                    <button type="button" onClick={(e) => { e.stopPropagation(); handleRemove(url); }} className="p-1 rounded text-stone-500 hover:text-red-600 opacity-0 group-hover:opacity-100"><Trash2 className="h-3 w-3" /></button>
                  </div>
                );
              }
              return (
                <div
                  key={idx}
                  onClick={() => onSelectMedia(url, kind)}
                  className={`group relative rounded-xl aspect-video overflow-hidden border cursor-pointer transition-all ${
                    isSelected ? 'border-teal-400 shadow-md shadow-teal-500/10' : 'border-stone-200 hover:border-stone-300'
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
                    <div className="absolute inset-0 bg-teal-50 flex items-center justify-center">
                      <CheckCircle2 className="h-5 w-5 text-teal-600 drop-shadow-md" />
                    </div>
                  )}
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); handleRemove(url); }}
                    className="absolute top-1 right-1 p-1 rounded-lg bg-white/90 text-stone-500 hover:text-red-600 opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <Trash2 className="h-3 w-3" />
                  </button>
                </div>
              );
            })}
          </div>
          );
        })()}
      </div>
    </div>
  );
}
