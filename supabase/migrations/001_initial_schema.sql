-- HolyProjection Supabase schema
-- Matches the live app data model in src/utils/sync.ts and MediaLibrary.tsx.

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ---------------------------------------------------------------------------
-- Shared helpers
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = TIMEZONE('utc', NOW());
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ---------------------------------------------------------------------------
-- Profiles
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT,
  full_name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT TIMEZONE('utc', NOW()),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT TIMEZONE('utc', NOW())
);

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, avatar_url)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'displayName', NEW.raw_user_meta_data->>'full_name'),
    NEW.raw_user_meta_data->>'avatar_url'
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    full_name = EXCLUDED.full_name,
    avatar_url = EXCLUDED.avatar_url,
    updated_at = TIMEZONE('utc', NOW());

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ---------------------------------------------------------------------------
-- Presentations and slides
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.presentations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL DEFAULT 'Untitled Presentation',
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  settings JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT TIMEZONE('utc', NOW()),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT TIMEZONE('utc', NOW())
);

CREATE TABLE IF NOT EXISTS public.slides (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  presentation_id UUID NOT NULL REFERENCES public.presentations(id) ON DELETE CASCADE,
  order_index INTEGER NOT NULL DEFAULT 0,
  content TEXT NOT NULL DEFAULT '',
  translation TEXT,
  media_type TEXT DEFAULT 'none' CHECK (media_type IS NULL OR media_type IN ('none', 'color', 'video', 'camera', 'image')),
  media_url TEXT,
  media_fill BOOLEAN NOT NULL DEFAULT FALSE,
  elements JSONB,
  settings JSONB NOT NULL DEFAULT '{}'::jsonb,
  audio_url TEXT,
  audio_loop BOOLEAN NOT NULL DEFAULT FALSE,
  auto_advance_secs INTEGER NOT NULL DEFAULT 0 CHECK (auto_advance_secs >= 0),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT TIMEZONE('utc', NOW()),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT TIMEZONE('utc', NOW())
);

CREATE TABLE IF NOT EXISTS public.active_projection (
  presentation_id UUID PRIMARY KEY REFERENCES public.presentations(id) ON DELETE CASCADE,
  active_slide_id UUID REFERENCES public.slides(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT TIMEZONE('utc', NOW()),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT TIMEZONE('utc', NOW())
);

-- ---------------------------------------------------------------------------
-- Service setlists
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.setlists (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL DEFAULT 'Untitled Service',
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  settings JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT TIMEZONE('utc', NOW()),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT TIMEZONE('utc', NOW())
);

CREATE TABLE IF NOT EXISTS public.setlist_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  setlist_id UUID NOT NULL REFERENCES public.setlists(id) ON DELETE CASCADE,
  presentation_id UUID NOT NULL REFERENCES public.presentations(id) ON DELETE CASCADE,
  order_index INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT TIMEZONE('utc', NOW()),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT TIMEZONE('utc', NOW())
);

-- ---------------------------------------------------------------------------
-- Saved slide design templates
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  is_starter BOOLEAN NOT NULL DEFAULT FALSE,
  data JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT TIMEZONE('utc', NOW()),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT TIMEZONE('utc', NOW())
);

-- ---------------------------------------------------------------------------
-- Indexes
-- ---------------------------------------------------------------------------

CREATE INDEX IF NOT EXISTS idx_presentations_created_by ON public.presentations(created_by);
CREATE INDEX IF NOT EXISTS idx_presentations_created_at ON public.presentations(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_slides_presentation_order ON public.slides(presentation_id, order_index);
CREATE INDEX IF NOT EXISTS idx_setlists_created_by ON public.setlists(created_by);
CREATE INDEX IF NOT EXISTS idx_setlists_created_at ON public.setlists(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_setlist_items_setlist_order ON public.setlist_items(setlist_id, order_index);
CREATE INDEX IF NOT EXISTS idx_setlist_items_presentation_id ON public.setlist_items(presentation_id);
CREATE INDEX IF NOT EXISTS idx_templates_created_by ON public.templates(created_by);
CREATE INDEX IF NOT EXISTS idx_templates_starter ON public.templates(is_starter);

-- ---------------------------------------------------------------------------
-- updated_at triggers
-- ---------------------------------------------------------------------------

DROP TRIGGER IF EXISTS set_profiles_updated_at ON public.profiles;
CREATE TRIGGER set_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS set_presentations_updated_at ON public.presentations;
CREATE TRIGGER set_presentations_updated_at
  BEFORE UPDATE ON public.presentations
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS set_slides_updated_at ON public.slides;
CREATE TRIGGER set_slides_updated_at
  BEFORE UPDATE ON public.slides
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS set_active_projection_updated_at ON public.active_projection;
CREATE TRIGGER set_active_projection_updated_at
  BEFORE UPDATE ON public.active_projection
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS set_setlists_updated_at ON public.setlists;
CREATE TRIGGER set_setlists_updated_at
  BEFORE UPDATE ON public.setlists
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS set_setlist_items_updated_at ON public.setlist_items;
CREATE TRIGGER set_setlist_items_updated_at
  BEFORE UPDATE ON public.setlist_items
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS set_templates_updated_at ON public.templates;
CREATE TRIGGER set_templates_updated_at
  BEFORE UPDATE ON public.templates
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Row Level Security
--
-- Live projector/follow screens need anonymous read access. Writes are limited
-- to authenticated presenters and are checked against the owning parent row.
-- ---------------------------------------------------------------------------

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.presentations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.slides ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.active_projection ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.setlists ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.setlist_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.templates ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
CREATE POLICY "Users can view their own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
CREATE POLICY "Users can update their own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "Anyone can read presentations" ON public.presentations;
CREATE POLICY "Anyone can read presentations"
  ON public.presentations FOR SELECT
  USING (TRUE);

DROP POLICY IF EXISTS "Authenticated users can create their presentations" ON public.presentations;
CREATE POLICY "Authenticated users can create their presentations"
  ON public.presentations FOR INSERT
  WITH CHECK (auth.role() = 'authenticated' AND created_by = auth.uid());

DROP POLICY IF EXISTS "Owners can update presentations" ON public.presentations;
CREATE POLICY "Owners can update presentations"
  ON public.presentations FOR UPDATE
  USING (created_by = auth.uid())
  WITH CHECK (created_by = auth.uid());

DROP POLICY IF EXISTS "Owners can delete presentations" ON public.presentations;
CREATE POLICY "Owners can delete presentations"
  ON public.presentations FOR DELETE
  USING (created_by = auth.uid());

DROP POLICY IF EXISTS "Anyone can read slides" ON public.slides;
CREATE POLICY "Anyone can read slides"
  ON public.slides FOR SELECT
  USING (TRUE);

DROP POLICY IF EXISTS "Presentation owners can insert slides" ON public.slides;
CREATE POLICY "Presentation owners can insert slides"
  ON public.slides FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.presentations
      WHERE presentations.id = slides.presentation_id
      AND presentations.created_by = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Presentation owners can update slides" ON public.slides;
CREATE POLICY "Presentation owners can update slides"
  ON public.slides FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.presentations
      WHERE presentations.id = slides.presentation_id
      AND presentations.created_by = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.presentations
      WHERE presentations.id = slides.presentation_id
      AND presentations.created_by = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Presentation owners can delete slides" ON public.slides;
CREATE POLICY "Presentation owners can delete slides"
  ON public.slides FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.presentations
      WHERE presentations.id = slides.presentation_id
      AND presentations.created_by = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Anyone can read active projection" ON public.active_projection;
CREATE POLICY "Anyone can read active projection"
  ON public.active_projection FOR SELECT
  USING (TRUE);

DROP POLICY IF EXISTS "Presentation owners can create active projection" ON public.active_projection;
CREATE POLICY "Presentation owners can create active projection"
  ON public.active_projection FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.presentations
      WHERE presentations.id = active_projection.presentation_id
      AND presentations.created_by = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Presentation owners can update active projection" ON public.active_projection;
CREATE POLICY "Presentation owners can update active projection"
  ON public.active_projection FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.presentations
      WHERE presentations.id = active_projection.presentation_id
      AND presentations.created_by = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.presentations
      WHERE presentations.id = active_projection.presentation_id
      AND presentations.created_by = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Presentation owners can delete active projection" ON public.active_projection;
CREATE POLICY "Presentation owners can delete active projection"
  ON public.active_projection FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.presentations
      WHERE presentations.id = active_projection.presentation_id
      AND presentations.created_by = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Anyone can read setlists" ON public.setlists;
CREATE POLICY "Anyone can read setlists"
  ON public.setlists FOR SELECT
  USING (TRUE);

DROP POLICY IF EXISTS "Authenticated users can create their setlists" ON public.setlists;
CREATE POLICY "Authenticated users can create their setlists"
  ON public.setlists FOR INSERT
  WITH CHECK (auth.role() = 'authenticated' AND created_by = auth.uid());

DROP POLICY IF EXISTS "Owners can update setlists" ON public.setlists;
CREATE POLICY "Owners can update setlists"
  ON public.setlists FOR UPDATE
  USING (created_by = auth.uid())
  WITH CHECK (created_by = auth.uid());

DROP POLICY IF EXISTS "Owners can delete setlists" ON public.setlists;
CREATE POLICY "Owners can delete setlists"
  ON public.setlists FOR DELETE
  USING (created_by = auth.uid());

DROP POLICY IF EXISTS "Anyone can read setlist items" ON public.setlist_items;
CREATE POLICY "Anyone can read setlist items"
  ON public.setlist_items FOR SELECT
  USING (TRUE);

DROP POLICY IF EXISTS "Setlist owners can insert setlist items" ON public.setlist_items;
CREATE POLICY "Setlist owners can insert setlist items"
  ON public.setlist_items FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.setlists
      WHERE setlists.id = setlist_items.setlist_id
      AND setlists.created_by = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Setlist owners can update setlist items" ON public.setlist_items;
CREATE POLICY "Setlist owners can update setlist items"
  ON public.setlist_items FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.setlists
      WHERE setlists.id = setlist_items.setlist_id
      AND setlists.created_by = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.setlists
      WHERE setlists.id = setlist_items.setlist_id
      AND setlists.created_by = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Setlist owners can delete setlist items" ON public.setlist_items;
CREATE POLICY "Setlist owners can delete setlist items"
  ON public.setlist_items FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.setlists
      WHERE setlists.id = setlist_items.setlist_id
      AND setlists.created_by = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Anyone can read templates" ON public.templates;
CREATE POLICY "Anyone can read templates"
  ON public.templates FOR SELECT
  USING (TRUE);

DROP POLICY IF EXISTS "Authenticated users can create templates" ON public.templates;
CREATE POLICY "Authenticated users can create templates"
  ON public.templates FOR INSERT
  WITH CHECK (auth.role() = 'authenticated' AND created_by = auth.uid());

DROP POLICY IF EXISTS "Template owners can update templates" ON public.templates;
CREATE POLICY "Template owners can update templates"
  ON public.templates FOR UPDATE
  USING (created_by = auth.uid())
  WITH CHECK (created_by = auth.uid());

DROP POLICY IF EXISTS "Template owners can delete templates" ON public.templates;
CREATE POLICY "Template owners can delete templates"
  ON public.templates FOR DELETE
  USING (created_by = auth.uid());

-- ---------------------------------------------------------------------------
-- Storage bucket for uploaded backgrounds, videos, and audio.
-- ---------------------------------------------------------------------------

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'presentation-media',
  'presentation-media',
  TRUE,
  524288000,
  ARRAY[
    'image/jpeg',
    'image/png',
    'image/gif',
    'image/webp',
    'video/mp4',
    'video/webm',
    'video/quicktime',
    'audio/mpeg',
    'audio/wav',
    'audio/mp4',
    'audio/aac',
    'audio/ogg',
    'audio/flac'
  ]
)
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

DROP POLICY IF EXISTS "Anyone can read presentation media" ON storage.objects;
CREATE POLICY "Anyone can read presentation media"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'presentation-media');

DROP POLICY IF EXISTS "Authenticated users can upload presentation media" ON storage.objects;
CREATE POLICY "Authenticated users can upload presentation media"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'presentation-media' AND auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Authenticated users can update presentation media" ON storage.objects;
CREATE POLICY "Authenticated users can update presentation media"
  ON storage.objects FOR UPDATE
  USING (bucket_id = 'presentation-media' AND auth.role() = 'authenticated')
  WITH CHECK (bucket_id = 'presentation-media' AND auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Authenticated users can delete presentation media" ON storage.objects;
CREATE POLICY "Authenticated users can delete presentation media"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'presentation-media' AND auth.role() = 'authenticated');

-- ---------------------------------------------------------------------------
-- Realtime publication. The app uses postgres_changes subscriptions for these.
-- ---------------------------------------------------------------------------

DO $$
DECLARE
  table_name TEXT;
BEGIN
  FOREACH table_name IN ARRAY ARRAY[
    'presentations',
    'slides',
    'active_projection',
    'setlists',
    'setlist_items',
    'templates'
  ]
  LOOP
    BEGIN
      EXECUTE FORMAT('ALTER PUBLICATION supabase_realtime ADD TABLE public.%I', table_name);
    EXCEPTION
      WHEN duplicate_object THEN NULL;
      WHEN undefined_object THEN NULL;
    END;
  END LOOP;
END $$;
