'use client';

import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/utils/supabase';
import { UploadCloud, Image as ImageIcon, Loader2, Trash2, CheckCircle2 } from 'lucide-react';

interface MediaLibraryProps {
  onSelectImage: (url: string) => void;
  currentUrl?: string;
}

export default function MediaLibrary({ onSelectImage, currentUrl }: MediaLibraryProps) {
  const [images, setImages] = useState<string[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const isSupabaseConfigured =
    Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL) &&
    Boolean(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) &&
    process.env.NEXT_PUBLIC_SUPABASE_URL !== 'https://your-project-id.supabase.co' &&
    process.env.NEXT_PUBLIC_SUPABASE_URL !== 'https://placeholder-project-id.supabase.co';

  // Load existing images
  useEffect(() => {
    loadMedia();
  }, []);

  const loadMedia = async () => {
    setIsLoading(true);
    setErrorMsg(null);

    if (!isSupabaseConfigured) {
      // Demo Mode: Load mock assets from local storage
      const stored = localStorage.getItem('holyproj_uploaded_images');
      if (stored) {
        setImages(JSON.parse(stored));
      } else {
        // Initial placeholder loops
        const defaults = [
          'https://images.unsplash.com/photo-1438032005730-c779502df39b?q=80&w=800&auto=format&fit=crop', // Stained glass
          'https://images.unsplash.com/photo-1544427928-c49cd7f406b6?q=80&w=800&auto=format&fit=crop', // Particles
          'https://images.unsplash.com/photo-1518156677180-95a2893f3e9f?q=80&w=800&auto=format&fit=crop'  // Sunlight rays
        ];
        localStorage.setItem('holyproj_uploaded_images', JSON.stringify(defaults));
        setImages(defaults);
      }
      setIsLoading(false);
      return;
    }

    // Supabase Mode: Fetch from storage bucket 'presentation-media'
    try {
      const { data, error } = await supabase.storage.from('presentation-media').list();
      
      if (error) {
        // If bucket doesn't exist, log warning but fall back to local storage
        if (error.message.includes('bucket not found') || error.message.includes('does not exist')) {
          console.warn("Storage bucket 'presentation-media' not found in Supabase! Set up the bucket to use cloud uploads.");
          const stored = localStorage.getItem('holyproj_uploaded_images') || '[]';
          setImages(JSON.parse(stored));
        } else {
          throw error;
        }
      } else if (data) {
        // Build public URLs for files
        const urls = data.map((file) => {
          const { data: { publicUrl } } = supabase.storage
            .from('presentation-media')
            .getPublicUrl(file.name);
          return publicUrl;
        });
        setImages(urls);
      }
    } catch (err: any) {
      console.error('Error fetching files:', err);
      setErrorMsg(err.message || 'Failed to load media.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const file = files[0];
    setIsUploading(true);
    setErrorMsg(null);

    if (!isSupabaseConfigured) {
      // Demo Mode: Create Object URL
      const localUrl = URL.createObjectURL(file);
      const updated = [localUrl, ...images];
      localStorage.setItem('holyproj_uploaded_images', JSON.stringify(updated));
      setImages(updated);
      onSelectImage(localUrl);
      setIsUploading(false);
      return;
    }

    // Supabase Mode
    try {
      const fileName = `${Date.now()}-${file.name.replace(/[^a-zA-Z0-9.]/g, '_')}`;
      const { data, error } = await supabase.storage
        .from('presentation-media')
        .upload(fileName, file, {
          cacheControl: '3600',
          upsert: false
        });

      if (error) throw error;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('presentation-media')
        .getPublicUrl(fileName);

      const updated = [publicUrl, ...images];
      setImages(updated);
      onSelectImage(publicUrl);
    } catch (err: any) {
      console.error('Error uploading file:', err);
      setErrorMsg(err.message || 'Failed to upload image. Please verify you created the "presentation-media" bucket in Supabase storage.');
    } finally {
      setIsUploading(false);
    }
  };

  const handleRemoveImage = (imgUrl: string) => {
    const updated = images.filter((img) => img !== imgUrl);
    setImages(updated);
    if (!isSupabaseConfigured) {
      localStorage.setItem('holyproj_uploaded_images', JSON.stringify(updated));
    }
    if (currentUrl === imgUrl) {
      onSelectImage('');
    }
  };

  const triggerFileInput = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className="space-y-4">
      {errorMsg && (
        <div className="rounded-xl bg-red-950/40 border border-red-500/30 p-3 text-[10px] text-red-400">
          {errorMsg}
        </div>
      )}

      {/* Upload area */}
      <div
        onClick={triggerFileInput}
        className="border-2 border-dashed border-slate-800 hover:border-violet-500/50 rounded-2xl p-5 text-center cursor-pointer bg-slate-950/40 hover:bg-slate-950/70 transition-all duration-200"
      >
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileUpload}
          accept="image/*"
          className="hidden"
        />
        {isUploading ? (
          <div className="flex flex-col items-center justify-center gap-2">
            <Loader2 className="h-6 w-6 text-violet-400 animate-spin" />
            <span className="text-[10px] text-slate-400">Uploading background image...</span>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center gap-1.5">
            <UploadCloud className="h-6 w-6 text-slate-500" />
            <span className="text-[11px] font-bold text-slate-300">Upload Slide Background Image</span>
            <span className="text-[9px] text-slate-650">Drag and drop or click to browse</span>
          </div>
        )}
      </div>

      {/* Gallery */}
      <div className="space-y-2">
        <label className="block text-[10px] uppercase font-semibold text-slate-500">Background Image Gallery</label>
        
        {isLoading ? (
          <div className="flex justify-center py-4">
            <Loader2 className="h-5 w-5 text-violet-500 animate-spin" />
          </div>
        ) : images.length === 0 ? (
          <div className="text-[10px] text-slate-600 text-center py-2">No background images uploaded yet.</div>
        ) : (
          <div className="grid grid-cols-3 gap-2.5 max-h-[140px] overflow-y-auto pr-1">
            {images.map((imgUrl, idx) => {
              const isSelected = currentUrl === imgUrl;
              return (
                <div
                  key={idx}
                  className={`group relative rounded-xl aspect-video overflow-hidden border cursor-pointer transition-all ${
                    isSelected ? 'border-violet-500 shadow-md shadow-violet-500/10' : 'border-slate-900 hover:border-slate-800'
                  }`}
                  onClick={() => onSelectImage(imgUrl)}
                >
                  <img src={imgUrl} alt="Background option" className="w-full h-full object-cover" />
                  
                  {isSelected && (
                    <div className="absolute inset-0 bg-violet-950/20 flex items-center justify-center">
                      <CheckCircle2 className="h-5 w-5 text-violet-400 drop-shadow-md" />
                    </div>
                  )}

                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleRemoveImage(imgUrl);
                    }}
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
