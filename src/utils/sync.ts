import { useEffect, useState, useRef } from 'react';
import { supabase } from './supabase';

// A free-placement element on a slide (Phase 2 designer). Positions/sizes are
// percentages of the slide canvas so they scale to any screen resolution.
export interface SlideElement {
  id: string;
  type: 'text' | 'image' | 'video';
  x: number; // % from left (top-left corner)
  y: number; // % from top
  w: number; // % width
  h: number; // % height
  z: number; // stacking order
  rotation?: number; // degrees
  flipH?: boolean;
  flipV?: boolean;
  role?: 'lyrics' | 'translation'; // links the element to the slide's words/translation
  // text
  text?: string;
  color?: string;
  fontSize?: number; // % of canvas height (vh-like)
  fontFamily?: string;
  align?: 'left' | 'center' | 'right';
  bold?: boolean;
  // media
  url?: string;
  fit?: 'cover' | 'contain';
  crop?: { top: number; right: number; bottom: number; left: number }; // % insets
}

export interface TemplateData {
  bgColor?: string;
  media_type?: 'none' | 'color' | 'video' | 'camera' | 'image';
  media_url?: string;
  media_fill?: boolean;
  elements?: SlideElement[];
}

export interface Template {
  id: string;
  name: string;
  is_starter?: boolean;
  data: TemplateData;
}

export interface Slide {
  id: string;
  order_index: number;
  content: string;
  translation?: string;
  media_type?: 'none' | 'color' | 'video' | 'camera' | 'image';
  media_url?: string;
  media_fill?: boolean; // true = media fills the screen at full brightness, text hidden (announcement slide)
  elements?: SlideElement[]; // free-placement overlay elements (Phase 2)
  settings?: { bgColor?: string }; // per-slide designer settings (jsonb column)
  audio_url?: string; // plays when the slide goes live
  audio_loop?: boolean;
  auto_advance_secs?: number; // >0 = auto-advance to next slide after N seconds when live
}

export interface Presentation {
  id: string;
  title: string;
  slides: Slide[];
  settings: {
    fontSize: number;
    background: string;
    margin: number;
    fontFamily: string;
    blankMode?: 'none' | 'black' | 'clear' | 'logo';
    textAlign?: 'left' | 'center' | 'right';
    verticalAlign?: 'top' | 'center' | 'bottom';
    textTransform?: 'none' | 'uppercase';
    textShadow?: 'none' | 'subtle' | 'strong';
    textOutline?: 'none' | 'subtle' | 'strong';
    slideTransition?: 'none' | 'fade' | 'slide' | 'zoom';
    translationLang?: string;
    stageShowClock?: boolean;
    stageShowNext?: boolean;
    stageShowTranslation?: boolean;
    stageMessage?: string;
    brandShow?: boolean;
    brandLogoUrl?: string;
    brandLogoPos?: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
    brandLogoSize?: number; // % of screen height
    brandLowerThird?: string;
  };
}

export interface PresenceUser {
  id: string;
  email: string;
  displayName: string;
  onlineAt: string;
}

export interface LiveAlert {
  id: string;
  message: string;
  type: 'general' | 'nursery' | 'warning';
  position: 'top' | 'bottom';
  timestamp: string;
}

export interface Poll {
  id: string;
  question: string;
  options: string[];
}

type SupabaseChannel = ReturnType<typeof supabase.channel>;
type RealtimeCleanup = () => void;

interface RealtimeChannels {
  activeProjChannel?: SupabaseChannel;
  setlistChannel?: SupabaseChannel;
  presenceChannel: SupabaseChannel;
}

interface PresenceMeta {
  displayName?: string;
  onlineAt?: string;
}

interface SetlistItemRow {
  id: string;
  setlist_id: string;
  presentation_id: string;
  order_index: number;
  presentations?: Presentation | null;
}

function errorMessage(err: unknown): string {
  return err instanceof Error ? err.message : String(err);
}

// Initial Mock/Default Presentation Data
export const DEFAULT_PRESENTATION: Presentation = {
  id: 'demo-presentation-1',
  title: 'Amazing Grace (Bilingual)',
  settings: {
    fontSize: 48,
    background: '#0f172a', // Tailwind slate-900
    margin: 8,
    fontFamily: 'Inter',
    textAlign: 'center',
    verticalAlign: 'center',
    textTransform: 'none',
    textShadow: 'none',
    textOutline: 'none',
    slideTransition: 'none',
    translationLang: 'Arabic',
  },
  slides: [
    {
      id: 'slide-1',
      order_index: 0,
      content: 'Amazing grace! How sweet the sound\nThat saved a wretch like me!',
      translation: 'يا للنعمة المذهلة! ما أحلى الصوت\nالذي خلص بائسًا مثلي!',
    },
    {
      id: 'slide-2',
      order_index: 1,
      content: 'I once was lost, but now am found\nWas blind, but now I see.',
      translation: 'كنت ضالًا ذات يوم، ولكنني الآن موجود\nكنت أعمى، ولكنني الآن أبصر.',
    },
    {
      id: 'slide-3',
      order_index: 2,
      content: 'Twas grace that taught my heart to fear\nAnd grace my fears relieved.',
      translation: 'كانت النعمة هي التي علمت قلبي الخوف\nوالنعمة خففت مخاوفي.',
    },
    {
      id: 'slide-4',
      order_index: 3,
      content: 'How precious did that grace appear\nThe hour I first believed.',
      translation: 'كم كانت تلك النعمة ثمينة\nساعة آمنت لأول مرة.',
    },
  ],
};

const IS_SUPABASE_CONFIGURED =
  Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL) &&
  Boolean(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) &&
  process.env.NEXT_PUBLIC_SUPABASE_URL !== 'https://your-project-id.supabase.co' &&
  process.env.NEXT_PUBLIC_SUPABASE_URL !== 'https://placeholder-project-id.supabase.co';

// ---- Brand preset (per-user default look applied to new presentations) ----
// Stored in localStorage so a church's logo/colours/text style carry over to
// every new presentation without re-setting them each time.
const BRAND_PRESET_KEY = 'hp_brand_preset';

// The settings keys that make up a reusable "look" — branding + theme/typography.
// Deliberately excludes per-service values (translationLang, stageMessage, blankMode).
export type BrandPreset = Partial<Pick<Presentation['settings'],
  | 'background' | 'fontFamily' | 'fontSize' | 'margin'
  | 'textAlign' | 'verticalAlign' | 'textTransform' | 'textShadow' | 'textOutline' | 'slideTransition'
  | 'brandShow' | 'brandLogoUrl' | 'brandLogoPos' | 'brandLogoSize' | 'brandLowerThird'>>;

const BRAND_PRESET_KEYS: (keyof BrandPreset)[] = [
  'background', 'fontFamily', 'fontSize', 'margin',
  'textAlign', 'verticalAlign', 'textTransform', 'textShadow', 'textOutline', 'slideTransition',
  'brandShow', 'brandLogoUrl', 'brandLogoPos', 'brandLogoSize', 'brandLowerThird',
];

export function getBrandPreset(): BrandPreset | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(BRAND_PRESET_KEY);
    return raw ? (JSON.parse(raw) as BrandPreset) : null;
  } catch {
    return null;
  }
}

/** Save the reusable subset of a presentation's settings as the default brand preset. */
export function saveBrandPreset(settings: Presentation['settings']): BrandPreset {
  const preset: BrandPreset = {};
  for (const k of BRAND_PRESET_KEYS) {
    const v = settings[k];
    if (v !== undefined) (preset as Record<string, unknown>)[k] = v;
  }
  if (typeof window !== 'undefined') {
    try { localStorage.setItem(BRAND_PRESET_KEY, JSON.stringify(preset)); } catch { /* ignore quota */ }
  }
  return preset;
}

export function clearBrandPreset() {
  if (typeof window !== 'undefined') {
    try { localStorage.removeItem(BRAND_PRESET_KEY); } catch { /* ignore */ }
  }
}

// Hook for loading and creating presentations (Portal View)
export function usePresentationsPortal() {
  const [presentations, setPresentations] = useState<Presentation[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDemoMode, setIsDemoMode] = useState(!IS_SUPABASE_CONFIGURED);

  const fetchPresentations = async () => {
    setLoading(true);
    if (!IS_SUPABASE_CONFIGURED) {
      // Demo Mode
      const stored = localStorage.getItem('holyproj_all_pres');
      if (stored) {
        setPresentations(JSON.parse(stored));
      } else {
        const initial = [DEFAULT_PRESENTATION];
        localStorage.setItem('holyproj_all_pres', JSON.stringify(initial));
        setPresentations(initial);
      }
      setLoading(false);
      return;
    }

    // Supabase Mode
    try {
      const { data, error } = await supabase
        .from('presentations')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      if (data) {
        const loaded: Presentation[] = [];
        for (const pres of data) {
          const { data: slides } = await supabase
            .from('slides')
            .select('*')
            .eq('presentation_id', pres.id)
            .order('order_index', { ascending: true });
          
          loaded.push({
            id: pres.id,
            title: pres.title,
            settings: pres.settings,
            slides: slides || [],
          });
        }
        setPresentations(loaded);
      }
    } catch (err) {
      console.error('Error fetching presentations:', err);
    }
    setLoading(false);
  };

  const createNewPresentation = async (title: string, customSlides?: { content: string; translation?: string }[]) => {
    if (!IS_SUPABASE_CONFIGURED) {
      // Demo Mode
      const newPres: Presentation = {
        id: `demo-presentation-${Date.now()}`,
        title,
        settings: {
          fontSize: 48,
          background: '#0f172a',
          margin: 8,
          fontFamily: 'Inter',
          ...(getBrandPreset() || {}),
        },
        slides: customSlides
          ? customSlides.map((s, idx) => ({
              id: `slide-${Date.now()}-${idx}`,
              order_index: idx,
              content: s.content,
              translation: s.translation,
            }))
          : [
              {
                id: `slide-${Date.now()}-1`,
                order_index: 0,
                content: 'Amazing grace! How sweet the sound...',
                translation: 'يا للنعمة المذهلة! ما أحلى الصوت...',
              }
            ]
      };

      const updated = [newPres, ...presentations];
      localStorage.setItem('holyproj_all_pres', JSON.stringify(updated));
      setPresentations(updated);
      return newPres.id;
    }

    // Supabase Mode
    try {
      const { data: userSession } = await supabase.auth.getSession();
      const userId = userSession?.session?.user?.id || null;

      const { data: presData, error: presErr } = await supabase
        .from('presentations')
        .insert({
          title,
          created_by: userId,
          settings: {
            fontSize: 48,
            background: '#0f172a',
            margin: 8,
            fontFamily: 'Inter',
            ...(getBrandPreset() || {}),
          }
        })
        .select()
        .single();

      if (presErr) throw presErr;

      // Create slides
      const slidesToInsert = customSlides
        ? customSlides.map((s, idx) => ({
            presentation_id: presData.id,
            order_index: idx,
            content: s.content,
            translation: s.translation || null,
          }))
        : [
            {
              presentation_id: presData.id,
              order_index: 0,
              content: 'Amazing grace! How sweet the sound...',
              translation: 'يا للنعمة المذهلة! ما أحلى الصوت...',
            }
          ];

      const { error: slideErr } = await supabase
        .from('slides')
        .insert(slidesToInsert);

      if (slideErr) throw slideErr;

      fetchPresentations();
      return presData.id;
    } catch (err) {
      console.error('Error creating presentation:', err);
      return null;
    }
  };

  const deletePresentation = async (id: string) => {
    if (!IS_SUPABASE_CONFIGURED) {
      const updated = presentations.filter((p) => p.id !== id);
      localStorage.setItem('holyproj_all_pres', JSON.stringify(updated));
      setPresentations(updated);
      return true;
    }

    try {
      // Remove dependents first in case the DB has no ON DELETE CASCADE.
      await supabase.from('active_projection').delete().eq('presentation_id', id);
      await supabase.from('slides').delete().eq('presentation_id', id);
      const { error } = await supabase.from('presentations').delete().eq('id', id);
      if (error) throw error;
      setPresentations((prev) => prev.filter((p) => p.id !== id));
      return true;
    } catch (err: unknown) {
      console.error('Error deleting presentation:', errorMessage(err));
      return false;
    }
  };

  // Append slides to an existing presentation (used by the importers when
  // building a presentation rather than creating a new one).
  const appendSlidesToPresentation = async (presId: string, slides: { content: string; translation?: string }[]) => {
    if (slides.length === 0) return 0;

    if (!IS_SUPABASE_CONFIGURED) {
      const list = JSON.parse(localStorage.getItem('holyproj_all_pres') || '[]') as Presentation[];
      const pres = list.find((p) => p.id === presId);
      if (!pres) return 0;
      const start = pres.slides.length;
      pres.slides.push(...slides.map((s, i) => ({ id: `slide-${Date.now()}-${i}`, order_index: start + i, content: s.content, translation: s.translation })));
      localStorage.setItem('holyproj_all_pres', JSON.stringify(list));
      localStorage.setItem(`holyproj_pres_${presId}`, JSON.stringify(pres));
      return slides.length;
    }

    try {
      const { data: existing } = await supabase
        .from('slides')
        .select('order_index')
        .eq('presentation_id', presId)
        .order('order_index', { ascending: false })
        .limit(1);
      const start = existing && existing[0] ? (existing[0].order_index as number) + 1 : 0;
      const rows = slides.map((s, i) => ({
        presentation_id: presId,
        order_index: start + i,
        content: s.content,
        translation: s.translation || null,
      }));
      const { error } = await supabase.from('slides').insert(rows);
      if (error) throw error;
      return rows.length;
    } catch (err) {
      console.error('Error appending slides:', errorMessage(err));
      return 0;
    }
  };

  useEffect(() => {
    void Promise.resolve().then(fetchPresentations);
  }, []);

  return {
    presentations,
    loading,
    isDemoMode,
    refresh: fetchPresentations,
    createNewPresentation,
    appendSlidesToPresentation,
    deletePresentation,
  };
}

// Hook for a single presentation realtime dashboard / projector sync
export function useRealtimePresentation(presentationId: string) {
  const [isDemoMode, setIsDemoMode] = useState(!IS_SUPABASE_CONFIGURED);
  const [presentation, setPresentation] = useState<Presentation>(DEFAULT_PRESENTATION);
  const [activeSlideId, setActiveSlideId] = useState<string | null>(null);
  const [presenceUsers, setPresenceUsers] = useState<PresenceUser[]>([]);
  const [currentUser, setCurrentUser] = useState<{ email: string; displayName: string } | null>(null);
  const [loading, setLoading] = useState(true);

  const channelRef = useRef<RealtimeChannels | null>(null);
  const localBcRef = useRef<BroadcastChannel | null>(null);
  const saveTimersRef = useRef<Record<string, ReturnType<typeof setTimeout>>>({});
  const [prayerRequests, setPrayerRequests] = useState<{ id: string; name: string; text: string; timestamp: string }[]>([]);
  const [activeAlert, setActiveAlert] = useState<LiveAlert | null>(null);
  const [activePoll, setActivePoll] = useState<Poll | null>(null);
  const [pollCounts, setPollCounts] = useState<number[]>([]);

  // Load profile and run synchronization
  useEffect(() => {
    if (!presentationId) return;

    const initSessionAndSync = async () => {
      setLoading(true);
      let email = 'collaborator@church.org';
      let displayName = 'Presenter';

      if (IS_SUPABASE_CONFIGURED) {
        // Fetch active Supabase user session
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) {
          email = session.user.email || email;
          // Look up display name from user_metadata or default to display
          displayName = session.user.user_metadata?.displayName || session.user.email?.split('@')[0] || displayName;
        } else {
          // Bypassed local user
          const savedUser = localStorage.getItem('holyproj_user');
          if (savedUser) {
            const parsed = JSON.parse(savedUser);
            email = parsed.email;
            displayName = parsed.displayName;
          }
        }
      } else {
        // Localstorage mock user
        const savedUser = localStorage.getItem('holyproj_user');
        if (savedUser) {
          const parsed = JSON.parse(savedUser);
          email = parsed.email;
          displayName = parsed.displayName;
        }
      }

      const userDetails = { email, displayName };
      setCurrentUser(userDetails);

      // --- Offline Demo Sync Setup ---
      if (!IS_SUPABASE_CONFIGURED) {
        const bc = new BroadcastChannel(`holyprojection_sync_${presentationId}`);
        localBcRef.current = bc;

        // Load presentation from list
        const storedPresList = localStorage.getItem('holyproj_all_pres');
        let currentPres = DEFAULT_PRESENTATION;
        if (storedPresList) {
          const list = JSON.parse(storedPresList) as Presentation[];
          const found = list.find((p) => p.id === presentationId);
          if (found) currentPres = found;
        }
        setPresentation(currentPres);

        // Load active slide
        const cachedActive = localStorage.getItem(`holyproj_active_${presentationId}`);
        if (cachedActive) {
          setActiveSlideId(cachedActive);
        } else if (currentPres.slides.length > 0) {
          setActiveSlideId(currentPres.slides[0].id);
        }

        // Listener for messages
        bc.onmessage = (event) => {
          const { type, data } = event.data;
          if (type === 'STATE_UPDATE') {
            if (data.presentation) setPresentation(data.presentation);
            if (data.activeSlideId !== undefined) setActiveSlideId(data.activeSlideId);
          } else if (type === 'PING_PRESENCE') {
            bc.postMessage({
              type: 'PONG_PRESENCE',
              data: {
                id: userDetails.email,
                email: userDetails.email,
                displayName: userDetails.displayName,
                onlineAt: new Date().toISOString(),
              },
            });
          } else if (type === 'PONG_PRESENCE') {
            setPresenceUsers((prev) => {
              if (prev.some((u) => u.id === data.id)) return prev;
              return [...prev, data];
            });
          } else if (type === 'PRAYER_REQUEST') {
            setPrayerRequests((prev) => [data, ...prev]);
          } else if (type === 'LIVE_ALERT') {
            setActiveAlert(data.activeAlert);
          } else if (type === 'POLL') {
            setActivePoll(data.poll);
            setPollCounts(data.poll ? new Array(data.poll.options.length).fill(0) : []);
          } else if (type === 'POLL_VOTE') {
            setPollCounts((prev) => { const n = [...prev]; n[data.option] = (n[data.option] || 0) + 1; return n; });
          }
        };

        bc.postMessage({ type: 'PING_PRESENCE' });
        setPresenceUsers([{
          id: userDetails.email,
          email: userDetails.email,
          displayName: userDetails.displayName + ' (You)',
          onlineAt: new Date().toISOString(),
        }]);

        setLoading(false);
        return () => {
          bc.close();
        };
      }

      // --- Supabase Live Cloud Sync Setup ---
      try {
        // 1. Fetch initial presentation. maybeSingle() returns null (instead of
        // throwing) when the id doesn't exist — e.g. a projector opened with no
        // presentation selected — so we keep the default slide without console noise.
        const { data: presData, error: presError } = await supabase
          .from('presentations')
          .select('*')
          .eq('id', presentationId)
          .maybeSingle();

        if (presError) throw presError;

        if (presData) {
          const { data: slidesData } = await supabase
            .from('slides')
            .select('*')
            .eq('presentation_id', presentationId)
            .order('order_index', { ascending: true });

          const loaded = {
            id: presData.id,
            title: presData.title,
            settings: presData.settings,
            slides: slidesData || [],
          };
          setPresentation(loaded);

          // 2. Fetch active projection (maybeSingle: no row yet is normal for a
          // freshly created presentation, and should not throw)
          const { data: activeData } = await supabase
            .from('active_projection')
            .select('active_slide_id')
            .eq('presentation_id', presentationId)
            .maybeSingle();

          let active: string | null = null;
          if (activeData) active = activeData.active_slide_id;
          else if (slidesData && slidesData.length > 0) active = slidesData[0].id;
          if (active) setActiveSlideId(active);

          // Cache for offline reload (keeps the projector working if WiFi drops).
          try { localStorage.setItem(`hp_cache_${presentationId}`, JSON.stringify({ presentation: loaded, activeSlideId: active })); } catch {}
        }
      } catch (err: unknown) {
        // Offline / load failed — fall back to the last cached copy so the
        // projector keeps showing this presentation through a dropout.
        try {
          const cached = localStorage.getItem(`hp_cache_${presentationId}`);
          if (cached) {
            const { presentation: cp, activeSlideId: ca } = JSON.parse(cached);
            if (cp) setPresentation(cp);
            if (ca) setActiveSlideId(ca);
          }
        } catch {}
        console.error('Error loading presentation sync:', errorMessage(err));
      }
      setLoading(false);

      // Subscribe to DB changes
      const activeProjChannel = supabase
        .channel(`presentation-${presentationId}`)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'active_projection',
            filter: `presentation_id=eq.${presentationId}`,
          },
          (payload) => {
            if (payload.new) {
              const row = payload.new as { active_slide_id?: string | null };
              setActiveSlideId(row.active_slide_id ?? null);
            }
          }
        )
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'slides',
            filter: `presentation_id=eq.${presentationId}`,
          },
          () => {
            supabase
              .from('slides')
              .select('*')
              .eq('presentation_id', presentationId)
              .order('order_index', { ascending: true })
              .then(({ data }) => {
                if (data) {
                  setPresentation((prev) => ({ ...prev, slides: data }));
                }
              });
          }
        )
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'presentations',
            filter: `id=eq.${presentationId}`,
          },
          (payload) => {
            if (payload.new) {
              const row = payload.new as {
                title?: string;
                settings?: Presentation['settings'];
              };
              setPresentation((prev) => ({
                ...prev,
                title: row.title || prev.title,
                settings: row.settings || prev.settings,
              }));
            }
          }
        );

      // Presence Sync setup
      const presenceChannel = supabase.channel(`presence-${presentationId}`, {
        config: { presence: { key: userDetails.email } },
      });

      presenceChannel
        .on('presence', { event: 'sync' }, () => {
          const state = presenceChannel.presenceState();
          const users: PresenceUser[] = [];
          Object.keys(state).forEach((key) => {
            const userPresences = state[key] as PresenceMeta[] | undefined;
            if (userPresences && userPresences.length > 0) {
              users.push({
                id: key,
                email: key,
                displayName: userPresences[0].displayName || key,
                onlineAt: userPresences[0].onlineAt || new Date().toISOString(),
              });
            }
          });
          setPresenceUsers(users);
        })
        .on('broadcast', { event: 'prayer_request' }, ({ payload }) => {
          if (payload) {
            setPrayerRequests((prev) => {
              if (prev.some((r) => r.id === payload.id)) return prev;
              return [payload, ...prev];
            });
          }
        })
        .on('broadcast', { event: 'live_alert' }, ({ payload }) => {
          if (payload) {
            setActiveAlert(payload.activeAlert);
          }
        })
        .on('broadcast', { event: 'poll' }, ({ payload }) => {
          const poll = (payload?.poll ?? null) as Poll | null;
          setActivePoll(poll);
          setPollCounts(poll ? new Array(poll.options.length).fill(0) : []);
        })
        .on('broadcast', { event: 'poll_vote' }, ({ payload }) => {
          const i = payload?.option;
          if (typeof i === 'number') {
            setPollCounts((prev) => {
              const next = [...prev];
              next[i] = (next[i] || 0) + 1;
              return next;
            });
          }
        })
        // .subscribe() must come AFTER all .on() bindings — bindings added after
        // subscribe are not registered with the realtime server and would be dropped.
        .subscribe(async (status) => {
          if (status === 'SUBSCRIBED') {
            await presenceChannel.track({
              displayName: userDetails.displayName,
              onlineAt: new Date().toISOString(),
            });
          }
        });

      activeProjChannel.subscribe();
      channelRef.current = { activeProjChannel, presenceChannel };

      return () => {
        supabase.removeChannel(activeProjChannel);
        supabase.removeChannel(presenceChannel);
      };
    };

    let cleanupFn: RealtimeCleanup | undefined;
    let cancelled = false;
    initSessionAndSync().then(fn => {
      cleanupFn = typeof fn === 'function' ? fn : undefined;
      // If the effect was already torn down before setup finished, the channels
      // it just created would otherwise leak — clean them up immediately.
      if (cancelled && typeof fn === 'function') fn();
    });

    return () => {
      cancelled = true;
      if (cleanupFn) cleanupFn();
    };
  }, [presentationId]);

  // Sync edits
  const updateSlideContent = (
    slideId: string, 
    content: string, 
    translation?: string, 
    media_type?: Slide['media_type'], 
    media_url?: string
  ) => {
    const updatedSlides = presentation.slides.map((s) => {
      if (s.id === slideId) return { ...s, content, translation, media_type, media_url };
      return s;
    });

    // Functional update so a concurrent settings change (e.g. switching the
    // translation language, which also re-translates this slide) is not
    // clobbered by a stale `presentation` snapshot.
    setPresentation((prev) => ({
      ...prev,
      slides: prev.slides.map((s) =>
        s.id === slideId ? { ...s, content, translation, media_type, media_url } : s
      ),
    }));

    const updatedPresentation = { ...presentation, slides: updatedSlides };

    if (isDemoMode) {
      // Save locally
      localStorage.setItem(`holyproj_pres_${presentationId}`, JSON.stringify(updatedPresentation));
      
      // Update portal list cache
      const storedList = localStorage.getItem('holyproj_all_pres');
      if (storedList) {
        const list = JSON.parse(storedList) as Presentation[];
        const updatedList = list.map((p) => (p.id === presentationId ? updatedPresentation : p));
        localStorage.setItem('holyproj_all_pres', JSON.stringify(updatedList));
      }

      localBcRef.current?.postMessage({
        type: 'STATE_UPDATE',
        data: { presentation: updatedPresentation },
      });
    } else {
      // Debounce the DB write per slide: writing on every keystroke triggers the
      // realtime listener to refetch and overwrite the textarea mid-typing, which
      // made the editor feel laggy/stuck. We save ~500ms after typing stops.
      if (saveTimersRef.current[slideId]) {
        clearTimeout(saveTimersRef.current[slideId]);
      }
      saveTimersRef.current[slideId] = setTimeout(() => {
        supabase
          .from('slides')
          .update({
            content,
            translation,
            media_type,
            media_url,
            updated_at: new Date().toISOString()
          })
          .eq('id', slideId)
          .then(({ error }) => {
            if (error) console.error('Error updating slide:', error.message);
          });
      }, 500);
    }
  };

  // Toggle whether the slide's media fills the screen (full brightness, no text)
  const setSlideFill = (slideId: string, fill: boolean) => {
    setPresentation((prev) => ({
      ...prev,
      slides: prev.slides.map((s) => (s.id === slideId ? { ...s, media_fill: fill } : s)),
    }));

    if (isDemoMode) {
      const updatedPresentation = {
        ...presentation,
        slides: presentation.slides.map((s) => (s.id === slideId ? { ...s, media_fill: fill } : s)),
      };
      localStorage.setItem(`holyproj_pres_${presentationId}`, JSON.stringify(updatedPresentation));
      const storedList = localStorage.getItem('holyproj_all_pres');
      if (storedList) {
        const list = JSON.parse(storedList) as Presentation[];
        localStorage.setItem('holyproj_all_pres', JSON.stringify(list.map((p) => (p.id === presentationId ? updatedPresentation : p))));
      }
      localBcRef.current?.postMessage({ type: 'STATE_UPDATE', data: { presentation: updatedPresentation } });
    } else {
      supabase
        .from('slides')
        .update({ media_fill: fill, updated_at: new Date().toISOString() })
        .eq('id', slideId)
        .then(({ error }) => { if (error) console.error('Error updating media fill:', error.message); });
    }
  };

  // Set the slide's audio cue (plays when the slide goes live)
  const setSlideAudio = (slideId: string, audio_url: string | undefined, audio_loop: boolean) => {
    const patch = { audio_url: audio_url || undefined, audio_loop };
    setPresentation((prev) => ({
      ...prev,
      slides: prev.slides.map((s) => (s.id === slideId ? { ...s, ...patch } : s)),
    }));

    if (isDemoMode) {
      const updatedPresentation = {
        ...presentation,
        slides: presentation.slides.map((s) => (s.id === slideId ? { ...s, ...patch } : s)),
      };
      localStorage.setItem(`holyproj_pres_${presentationId}`, JSON.stringify(updatedPresentation));
      const storedList = localStorage.getItem('holyproj_all_pres');
      if (storedList) {
        const list = JSON.parse(storedList) as Presentation[];
        localStorage.setItem('holyproj_all_pres', JSON.stringify(list.map((p) => (p.id === presentationId ? updatedPresentation : p))));
      }
      localBcRef.current?.postMessage({ type: 'STATE_UPDATE', data: { presentation: updatedPresentation } });
    } else {
      supabase
        .from('slides')
        .update({ audio_url: audio_url || null, audio_loop, updated_at: new Date().toISOString() })
        .eq('id', slideId)
        .then(({ error }) => { if (error) console.error('Error updating audio:', error.message); });
    }
  };

  // Slide-triggered action: auto-advance after N seconds (0 = off)
  const setSlideAutoAdvance = (slideId: string, secs: number) => {
    setPresentation((prev) => ({
      ...prev,
      slides: prev.slides.map((s) => (s.id === slideId ? { ...s, auto_advance_secs: secs } : s)),
    }));
    if (isDemoMode) {
      const updatedPresentation = {
        ...presentation,
        slides: presentation.slides.map((s) => (s.id === slideId ? { ...s, auto_advance_secs: secs } : s)),
      };
      localStorage.setItem(`holyproj_pres_${presentationId}`, JSON.stringify(updatedPresentation));
      const storedList = localStorage.getItem('holyproj_all_pres');
      if (storedList) {
        const list = JSON.parse(storedList) as Presentation[];
        localStorage.setItem('holyproj_all_pres', JSON.stringify(list.map((p) => (p.id === presentationId ? updatedPresentation : p))));
      }
      localBcRef.current?.postMessage({ type: 'STATE_UPDATE', data: { presentation: updatedPresentation } });
    } else {
      supabase
        .from('slides')
        .update({ auto_advance_secs: secs, updated_at: new Date().toISOString() })
        .eq('id', slideId)
        .then(({ error }) => { if (error) console.error('Error updating auto-advance:', error.message); });
    }
  };

  // Replace the free-placement elements array for a slide (Phase 2 designer)
  const updateSlideElements = (slideId: string, elements: SlideElement[]) => {
    setPresentation((prev) => ({
      ...prev,
      slides: prev.slides.map((s) => (s.id === slideId ? { ...s, elements } : s)),
    }));

    if (isDemoMode) {
      const updatedPresentation = {
        ...presentation,
        slides: presentation.slides.map((s) => (s.id === slideId ? { ...s, elements } : s)),
      };
      localStorage.setItem(`holyproj_pres_${presentationId}`, JSON.stringify(updatedPresentation));
      const storedList = localStorage.getItem('holyproj_all_pres');
      if (storedList) {
        const list = JSON.parse(storedList) as Presentation[];
        localStorage.setItem('holyproj_all_pres', JSON.stringify(list.map((p) => (p.id === presentationId ? updatedPresentation : p))));
      }
      localBcRef.current?.postMessage({ type: 'STATE_UPDATE', data: { presentation: updatedPresentation } });
    } else {
      if (saveTimersRef.current[`el-${slideId}`]) clearTimeout(saveTimersRef.current[`el-${slideId}`]);
      saveTimersRef.current[`el-${slideId}`] = setTimeout(() => {
        supabase
          .from('slides')
          .update({ elements, updated_at: new Date().toISOString() })
          .eq('id', slideId)
          .then(({ error }) => { if (error) console.error('Error updating elements:', error.message); });
      }, 400);
    }
  };

  // Apply a saved template's design to a slide (regenerates element ids).
  const applyDesign = (slideId: string, design: TemplateData) => {
    const elements: SlideElement[] = (design.elements || []).map((e, i) => ({ ...e, id: `el-${Date.now()}-${i}` }));
    updateSlideElements(slideId, elements);
    if (design.bgColor) updateSlideSettings(slideId, { bgColor: design.bgColor });
    const slide = presentation.slides.find((s) => s.id === slideId);
    if (slide) {
      updateSlideContent(slide.id, slide.content, slide.translation, design.media_type || 'none', design.media_url || undefined);
      if (typeof design.media_fill === 'boolean') setSlideFill(slideId, design.media_fill);
    }
  };

  // Merge per-slide designer settings (e.g. background colour) into the jsonb column
  const updateSlideSettings = (slideId: string, partial: Record<string, unknown>) => {
    setPresentation((prev) => ({
      ...prev,
      slides: prev.slides.map((s) => (s.id === slideId ? { ...s, settings: { ...(s.settings || {}), ...partial } } : s)),
    }));

    const current = presentation.slides.find((s) => s.id === slideId);
    const merged = { ...(current?.settings || {}), ...partial };

    if (isDemoMode) {
      const updatedPresentation = {
        ...presentation,
        slides: presentation.slides.map((s) => (s.id === slideId ? { ...s, settings: merged } : s)),
      };
      localStorage.setItem(`holyproj_pres_${presentationId}`, JSON.stringify(updatedPresentation));
      const storedList = localStorage.getItem('holyproj_all_pres');
      if (storedList) {
        const list = JSON.parse(storedList) as Presentation[];
        localStorage.setItem('holyproj_all_pres', JSON.stringify(list.map((p) => (p.id === presentationId ? updatedPresentation : p))));
      }
      localBcRef.current?.postMessage({ type: 'STATE_UPDATE', data: { presentation: updatedPresentation } });
    } else {
      supabase
        .from('slides')
        .update({ settings: merged, updated_at: new Date().toISOString() })
        .eq('id', slideId)
        .then(({ error }) => { if (error) console.error('Error updating slide settings:', error.message); });
    }
  };

  // Add a new (blank) slide to the end of the presentation
  const addSlide = async () => {
    const nextIndex = presentation.slides.length;

    if (isDemoMode) {
      const newSlide: Slide = { id: `slide-${Date.now()}`, order_index: nextIndex, content: '', translation: '' };
      const updatedPresentation = { ...presentation, slides: [...presentation.slides, newSlide] };
      setPresentation((prev) => ({ ...prev, slides: [...prev.slides, newSlide] }));
      localStorage.setItem(`holyproj_pres_${presentationId}`, JSON.stringify(updatedPresentation));
      const storedList = localStorage.getItem('holyproj_all_pres');
      if (storedList) {
        const list = JSON.parse(storedList) as Presentation[];
        localStorage.setItem('holyproj_all_pres', JSON.stringify(list.map((p) => (p.id === presentationId ? updatedPresentation : p))));
      }
      localBcRef.current?.postMessage({ type: 'STATE_UPDATE', data: { presentation: updatedPresentation } });
      return newSlide.id;
    }

    const { data, error } = await supabase
      .from('slides')
      .insert({ presentation_id: presentationId, order_index: nextIndex, content: '' })
      .select()
      .single();
    if (error || !data) {
      console.error('Error adding slide:', error?.message);
      return null;
    }
    setPresentation((prev) => ({ ...prev, slides: [...prev.slides, data as Slide] }));
    return data.id as string;
  };

  // Duplicate a slide (copies its text, media and design) to the end.
  const duplicateSlide = async (slideId: string) => {
    const src = presentation.slides.find((s) => s.id === slideId);
    if (!src) return null;
    const nextIndex = presentation.slides.length;

    if (isDemoMode) {
      const copy: Slide = { ...src, id: `slide-${Date.now()}`, order_index: nextIndex };
      const updatedPresentation = { ...presentation, slides: [...presentation.slides, copy] };
      setPresentation((prev) => ({ ...prev, slides: [...prev.slides, copy] }));
      localStorage.setItem(`holyproj_pres_${presentationId}`, JSON.stringify(updatedPresentation));
      const storedList = localStorage.getItem('holyproj_all_pres');
      if (storedList) {
        const list = JSON.parse(storedList) as Presentation[];
        localStorage.setItem('holyproj_all_pres', JSON.stringify(list.map((p) => (p.id === presentationId ? updatedPresentation : p))));
      }
      localBcRef.current?.postMessage({ type: 'STATE_UPDATE', data: { presentation: updatedPresentation } });
      return copy.id;
    }

    const { data, error } = await supabase
      .from('slides')
      .insert({
        presentation_id: presentationId,
        order_index: nextIndex,
        content: src.content,
        translation: src.translation,
        media_type: src.media_type,
        media_url: src.media_url,
        media_fill: src.media_fill,
        elements: src.elements || [],
        settings: src.settings || {},
      })
      .select()
      .single();
    if (error || !data) {
      console.error('Error duplicating slide:', error?.message);
      return null;
    }
    setPresentation((prev) => ({ ...prev, slides: [...prev.slides, data as Slide] }));
    return data.id as string;
  };

  // Reorder slides (drag-and-drop running order). `orderedIds` is the new order.
  const reorderSlides = async (orderedIds: string[]) => {
    setPresentation((prev) => {
      const byId = new Map(prev.slides.map((s) => [s.id, s]));
      const reordered = orderedIds
        .map((id, i) => { const s = byId.get(id); return s ? { ...s, order_index: i } : null; })
        .filter(Boolean) as Slide[];
      return { ...prev, slides: reordered };
    });

    if (isDemoMode) {
      const stored = localStorage.getItem(`holyproj_pres_${presentationId}`);
      // Persist via the portal list cache as well
      const list = JSON.parse(localStorage.getItem('holyproj_all_pres') || '[]') as Presentation[];
      const updatedList = list.map((p) => {
        if (p.id !== presentationId) return p;
        const byId = new Map(p.slides.map((s) => [s.id, s]));
        return { ...p, slides: orderedIds.map((id, i) => ({ ...(byId.get(id) as Slide), order_index: i })).filter(Boolean) as Slide[] };
      });
      localStorage.setItem('holyproj_all_pres', JSON.stringify(updatedList));
      const cur = updatedList.find((p) => p.id === presentationId);
      if (cur) localStorage.setItem(`holyproj_pres_${presentationId}`, JSON.stringify(cur));
      void stored;
      localBcRef.current?.postMessage({ type: 'STATE_UPDATE', data: { presentation: { id: presentationId } } });
      return;
    }

    for (let i = 0; i < orderedIds.length; i++) {
      await supabase.from('slides').update({ order_index: i }).eq('id', orderedIds[i]);
    }
  };

  // Delete a slide from the presentation
  const deleteSlide = async (slideId: string) => {
    if (isDemoMode) {
      const updatedPresentation = { ...presentation, slides: presentation.slides.filter((s) => s.id !== slideId) };
      setPresentation((prev) => ({ ...prev, slides: prev.slides.filter((s) => s.id !== slideId) }));
      localStorage.setItem(`holyproj_pres_${presentationId}`, JSON.stringify(updatedPresentation));
      const storedList = localStorage.getItem('holyproj_all_pres');
      if (storedList) {
        const list = JSON.parse(storedList) as Presentation[];
        localStorage.setItem('holyproj_all_pres', JSON.stringify(list.map((p) => (p.id === presentationId ? updatedPresentation : p))));
      }
      localBcRef.current?.postMessage({ type: 'STATE_UPDATE', data: { presentation: updatedPresentation } });
      return true;
    }

    const { error } = await supabase.from('slides').delete().eq('id', slideId);
    if (error) {
      console.error('Error deleting slide:', error.message);
      return false;
    }
    setPresentation((prev) => ({ ...prev, slides: prev.slides.filter((s) => s.id !== slideId) }));
    return true;
  };

  // Sync live slide selection
  const setLiveSlide = (slideId: string | null) => {
    setActiveSlideId(slideId);

    if (isDemoMode) {
      if (slideId) localStorage.setItem(`holyproj_active_${presentationId}`, slideId);
      localBcRef.current?.postMessage({
        type: 'STATE_UPDATE',
        data: { activeSlideId: slideId },
      });
    } else {
      // Update the row; if none exists yet (new presentation), insert one.
      // Without this, the very first "Go Live" updated 0 rows and never reached
      // the projector. select() lets us detect the no-row case reliably.
      supabase
        .from('active_projection')
        .update({ active_slide_id: slideId, updated_at: new Date().toISOString() })
        .eq('presentation_id', presentationId)
        .select()
        .then(({ data, error }) => {
          if (error) {
            console.error('Error updating active slide:', error.message);
            return;
          }
          if (!data || data.length === 0) {
            supabase
              .from('active_projection')
              .insert({ presentation_id: presentationId, active_slide_id: slideId })
              .then(({ error: insertError }) => {
                if (insertError) console.error('Error creating active projection:', insertError.message);
              });
          }
        });
    }
  };

  // Update layout settings
  const updateSettings = (settings: Partial<Presentation['settings']>) => {
    const updatedSettings = { ...presentation.settings, ...settings };
    const updatedPresentation = { ...presentation, settings: updatedSettings };
    // Functional update so concurrent slide edits don't clobber settings.
    setPresentation((prev) => ({ ...prev, settings: { ...prev.settings, ...settings } }));

    if (isDemoMode) {
      localStorage.setItem(`holyproj_pres_${presentationId}`, JSON.stringify(updatedPresentation));
      
      // Update portal list cache
      const storedList = localStorage.getItem('holyproj_all_pres');
      if (storedList) {
        const list = JSON.parse(storedList) as Presentation[];
        const updatedList = list.map((p) => (p.id === presentationId ? updatedPresentation : p));
        localStorage.setItem('holyproj_all_pres', JSON.stringify(updatedList));
      }

      localBcRef.current?.postMessage({
        type: 'STATE_UPDATE',
        data: { presentation: updatedPresentation },
      });
    } else {
      supabase
        .from('presentations')
        .update({ settings: updatedSettings, updated_at: new Date().toISOString() })
        .eq('id', presentationId)
        .then(({ error }) => {
          if (error) console.error('Error updating settings:', error);
        });
    }
  };

  const setBlankMode = (blankMode: 'none' | 'black' | 'clear' | 'logo') => {
    updateSettings({ blankMode });
  };

  const sendPrayerRequest = (name: string, text: string) => {
    const payload = { id: `${Date.now()}-${Math.random()}`, name, text, timestamp: new Date().toISOString() };
    if (isDemoMode) {
      localBcRef.current?.postMessage({
        type: 'PRAYER_REQUEST',
        data: payload
      });
      setPrayerRequests((prev) => [payload, ...prev]);
    } else {
      const channel = channelRef.current?.presenceChannel;
      if (channel) {
        channel.send({
          type: 'broadcast',
          event: 'prayer_request',
          payload
        });
      }
    }
  };

  const clearPrayerRequests = () => {
    setPrayerRequests([]);
  };

  const sendAlert = (message: string, type: LiveAlert['type'] = 'general', position: LiveAlert['position'] = 'bottom') => {
    const payload: LiveAlert = {
      id: `${Date.now()}-${Math.random()}`,
      message,
      type,
      position,
      timestamp: new Date().toISOString()
    };

    setActiveAlert(payload);

    if (isDemoMode) {
      localBcRef.current?.postMessage({
        type: 'LIVE_ALERT',
        data: { activeAlert: payload }
      });
    } else {
      const channel = channelRef.current?.presenceChannel;
      if (channel) {
        channel.send({
          type: 'broadcast',
          event: 'live_alert',
          payload: { activeAlert: payload }
        });
      }
    }
  };

  const clearAlert = () => {
    setActiveAlert(null);

    if (isDemoMode) {
      localBcRef.current?.postMessage({
        type: 'LIVE_ALERT',
        data: { activeAlert: null }
      });
    } else {
      const channel = channelRef.current?.presenceChannel;
      if (channel) {
        channel.send({
          type: 'broadcast',
          event: 'live_alert',
          payload: { activeAlert: null }
        });
      }
    }
  };

  // Live congregation poll (broadcast-based). sendPoll(null) closes it.
  const sendPoll = (poll: Poll | null) => {
    setActivePoll(poll);
    setPollCounts(poll ? new Array(poll.options.length).fill(0) : []);
    channelRef.current?.presenceChannel?.send({ type: 'broadcast', event: 'poll', payload: { poll } });
    localBcRef.current?.postMessage({ type: 'POLL', data: { poll } });
  };

  const votePoll = (option: number) => {
    if (!activePoll) return;
    setPollCounts((prev) => { const n = [...prev]; n[option] = (n[option] || 0) + 1; return n; });
    channelRef.current?.presenceChannel?.send({ type: 'broadcast', event: 'poll_vote', payload: { option } });
    localBcRef.current?.postMessage({ type: 'POLL_VOTE', data: { option } });
  };

  return {
    isDemoMode,
    presentation,
    activeSlideId,
    presenceUsers,
    currentUser,
    activePoll,
    pollCounts,
    sendPoll,
    votePoll,
    loading,
    updateSlideContent,
    updateSlideElements,
    updateSlideSettings,
    setSlideAudio,
    setSlideAutoAdvance,
    applyDesign,
    addSlide,
    duplicateSlide,
    reorderSlides,
    deleteSlide,
    setSlideFill,
    setLiveSlide,
    updateSettings,
    setBlankMode,
    sendPrayerRequest,
    clearPrayerRequests,
    prayerRequests,
    sendAlert,
    clearAlert,
    activeAlert,
  };
}

// ============================================================================
// SETLISTS / SERVICE ORDER PLANNER TYPES & HOOKS
// ============================================================================

export interface SetlistItem {
  id: string;
  setlist_id: string;
  presentation_id: string;
  order_index: number;
  presentation?: Presentation;
}

export interface Setlist {
  id: string;
  title: string;
  settings: {
    active_slide_id?: string | null;
    blankMode?: 'none' | 'black' | 'clear' | 'logo';
  };
  items: SetlistItem[];
  created_at?: string;
}

export function useSetlistsPortal() {
  const [setlists, setSetlists] = useState<Setlist[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDemoMode, setIsDemoMode] = useState(!IS_SUPABASE_CONFIGURED);

  const fetchSetlists = async () => {
    setLoading(true);
    if (!IS_SUPABASE_CONFIGURED) {
      const stored = localStorage.getItem('holyproj_all_setlists');
      if (stored) {
        setSetlists(JSON.parse(stored));
      } else {
        localStorage.setItem('holyproj_all_setlists', JSON.stringify([]));
        setSetlists([]);
      }
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('setlists')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      if (data) {
        const loaded: Setlist[] = [];
        for (const list of data) {
          // Fetch item counts
          const { count } = await supabase
            .from('setlist_items')
            .select('*', { count: 'exact', head: true })
            .eq('setlist_id', list.id);

          loaded.push({
            id: list.id,
            title: list.title,
            settings: list.settings || {},
            items: Array.from({ length: count || 0 }, (_, idx) => ({
              id: `placeholder-${list.id}-${idx}`,
              setlist_id: list.id,
              presentation_id: '',
              order_index: idx,
            })),
            created_at: list.created_at
          });
        }
        setSetlists(loaded);
      }
    } catch (err) {
      console.error('Error fetching setlists:', err);
    }
    setLoading(false);
  };

  const createNewSetlist = async (title: string) => {
    if (!IS_SUPABASE_CONFIGURED) {
      const newSetlist: Setlist = {
        id: `demo-setlist-${Date.now()}`,
        title,
        settings: {},
        items: [],
        created_at: new Date().toISOString()
      };
      const updated = [newSetlist, ...setlists];
      localStorage.setItem('holyproj_all_setlists', JSON.stringify(updated));
      setSetlists(updated);
      return newSetlist.id;
    }

    try {
      const { data: userSession } = await supabase.auth.getSession();
      const userId = userSession?.session?.user?.id || null;

      const { data, error } = await supabase
        .from('setlists')
        .insert({
          title,
          created_by: userId,
          settings: {}
        })
        .select()
        .single();

      if (error) throw error;
      fetchSetlists();
      return data.id;
    } catch (err) {
      console.error('Error creating setlist:', err);
      return null;
    }
  };

  const deleteSetlist = async (id: string) => {
    if (!IS_SUPABASE_CONFIGURED) {
      const updated = setlists.filter((s) => s.id !== id);
      localStorage.setItem('holyproj_all_setlists', JSON.stringify(updated));
      setSetlists(updated);
      return true;
    }

    try {
      await supabase.from('setlist_items').delete().eq('setlist_id', id);
      const { error } = await supabase.from('setlists').delete().eq('id', id);
      if (error) throw error;
      setSetlists((prev) => prev.filter((s) => s.id !== id));
      return true;
    } catch (err: unknown) {
      console.error('Error deleting setlist:', errorMessage(err));
      return false;
    }
  };

  useEffect(() => {
    void Promise.resolve().then(fetchSetlists);
  }, []);

  return {
    setlists,
    loading,
    isDemoMode,
    refresh: fetchSetlists,
    createNewSetlist,
    deleteSetlist
  };
}

export function useRealtimeSetlist(setlistId: string) {
  const [isDemoMode, setIsDemoMode] = useState(!IS_SUPABASE_CONFIGURED);
  const [setlist, setSetlist] = useState<Setlist | null>(null);
  const [activeSlideId, setActiveSlideId] = useState<string | null>(null);
  const [presenceUsers, setPresenceUsers] = useState<PresenceUser[]>([]);
  const [currentUser, setCurrentUser] = useState<{ email: string; displayName: string } | null>(null);
  const [loading, setLoading] = useState(true);

  const localBcRef = useRef<BroadcastChannel | null>(null);
  const channelRef = useRef<RealtimeChannels | null>(null);
  const [prayerRequests, setPrayerRequests] = useState<{ id: string; name: string; text: string; timestamp: string }[]>([]);
  const [activeAlert, setActiveAlert] = useState<LiveAlert | null>(null);

  const fetchSetlistDetails = async () => {
    if (!setlistId) return;
    
    if (!IS_SUPABASE_CONFIGURED) {
      const storedList = localStorage.getItem('holyproj_all_setlists');
      if (storedList) {
        const list = JSON.parse(storedList) as Setlist[];
        const found = list.find((s) => s.id === setlistId);
        if (found) {
          setSetlist(found);
          setActiveSlideId(found.settings?.active_slide_id || null);
        }
      }
      setLoading(false);
      return;
    }

    try {
      // Fetch setlist metadata (maybeSingle: a missing/inaccessible id should
      // resolve loading rather than throw and hang the page on a spinner)
      const { data: listData, error: listError } = await supabase
        .from('setlists')
        .select('*')
        .eq('id', setlistId)
        .maybeSingle();

      if (listError) throw listError;

      if (!listData) {
        setLoading(false);
        return;
      }

      if (listData) {
        // Fetch setlist items joined with presentations and slides
        const { data: itemsData, error: itemsError } = await supabase
          .from('setlist_items')
          .select(`
            id,
            setlist_id,
            presentation_id,
            order_index,
            presentations (
              id,
              title,
              settings,
              slides (
                id,
                order_index,
                content,
                translation,
                media_type,
                media_url
              )
            )
          `)
          .eq('setlist_id', setlistId)
          .order('order_index', { ascending: true });

        if (itemsError) throw itemsError;

        const itemsMapped: SetlistItem[] = (itemsData || []).map((item) => {
          const row = item as unknown as SetlistItemRow;
          return {
            id: row.id,
            setlist_id: row.setlist_id,
            presentation_id: row.presentation_id,
            order_index: row.order_index,
            presentation: row.presentations ? {
              id: row.presentations.id,
              title: row.presentations.title,
              settings: row.presentations.settings,
              slides: row.presentations.slides || []
            } : undefined
          };
        });

        const loadedSetlist: Setlist = {
          id: listData.id,
          title: listData.title,
          settings: listData.settings || {},
          items: itemsMapped
        };

        setSetlist(loadedSetlist);
        setActiveSlideId(loadedSetlist.settings?.active_slide_id || null);
      }
    } catch (err) {
      console.error('Error fetching setlist details:', err);
    }
    setLoading(false);
  };

  useEffect(() => {
    if (!setlistId) return;

    const initSync = async () => {
      setLoading(true);
      let email = 'collaborator@church.org';
      let displayName = 'Presenter';

      if (IS_SUPABASE_CONFIGURED) {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) {
          email = session.user.email || email;
          displayName = session.user.user_metadata?.displayName || session.user.email?.split('@')[0] || displayName;
        } else {
          const savedUser = localStorage.getItem('holyproj_user');
          if (savedUser) {
            const parsed = JSON.parse(savedUser);
            email = parsed.email;
            displayName = parsed.displayName;
          }
        }
      } else {
        const savedUser = localStorage.getItem('holyproj_user');
        if (savedUser) {
          const parsed = JSON.parse(savedUser);
          email = parsed.email;
          displayName = parsed.displayName;
        }
      }

      const userDetails = { email, displayName };
      setCurrentUser(userDetails);

      // --- Offline Demo Sync ---
      if (!IS_SUPABASE_CONFIGURED) {
        const bc = new BroadcastChannel(`holyprojection_setlist_sync_${setlistId}`);
        localBcRef.current = bc;

        await fetchSetlistDetails();

        bc.onmessage = (event) => {
          const { type, data } = event.data;
          if (type === 'STATE_UPDATE') {
            if (data.setlist) setSetlist(data.setlist);
            if (data.activeSlideId !== undefined) setActiveSlideId(data.activeSlideId);
          } else if (type === 'PING_PRESENCE') {
            bc.postMessage({
              type: 'PONG_PRESENCE',
              data: {
                id: userDetails.email,
                email: userDetails.email,
                displayName: userDetails.displayName,
                onlineAt: new Date().toISOString(),
              },
            });
          } else if (type === 'PONG_PRESENCE') {
            setPresenceUsers((prev) => {
              if (prev.some((u) => u.id === data.id)) return prev;
              return [...prev, data];
            });
          } else if (type === 'PRAYER_REQUEST') {
            setPrayerRequests((prev) => [data, ...prev]);
          } else if (type === 'LIVE_ALERT') {
            setActiveAlert(data.activeAlert);
          }
        };

        bc.postMessage({ type: 'PING_PRESENCE' });
        setPresenceUsers([{
          id: userDetails.email,
          email: userDetails.email,
          displayName: userDetails.displayName + ' (You)',
          onlineAt: new Date().toISOString(),
        }]);

        setLoading(false);
        return () => bc.close();
      }

      // --- Supabase Cloud Sync ---
      await fetchSetlistDetails();

      const setlistChannel = supabase
        .channel(`setlist-db-${setlistId}`)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'setlists',
            filter: `id=eq.${setlistId}`,
          },
          (payload) => {
            if (payload.new) {
              const row = payload.new as {
                title?: string;
                settings?: Setlist['settings'];
              };
              setSetlist((prev) => {
                if (!prev) return null;
                return {
                  ...prev,
                  title: row.title || prev.title,
                  settings: row.settings || {},
                };
              });
              if (row.settings && row.settings.active_slide_id !== undefined) {
                setActiveSlideId(row.settings.active_slide_id);
              }
            }
          }
        )
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'setlist_items',
            filter: `setlist_id=eq.${setlistId}`,
          },
          () => {
            fetchSetlistDetails();
          }
        );

      const presenceChannel = supabase.channel(`presence-setlist-${setlistId}`, {
        config: { presence: { key: userDetails.email } },
      });

      presenceChannel
        .on('presence', { event: 'sync' }, () => {
          const state = presenceChannel.presenceState();
          const users: PresenceUser[] = [];
          Object.keys(state).forEach((key) => {
            const userPresences = state[key] as PresenceMeta[] | undefined;
            if (userPresences && userPresences.length > 0) {
              users.push({
                id: key,
                email: key,
                displayName: userPresences[0].displayName || key,
                onlineAt: userPresences[0].onlineAt || new Date().toISOString(),
              });
            }
          });
          setPresenceUsers(users);
        })
        .on('broadcast', { event: 'prayer_request' }, ({ payload }) => {
          if (payload) {
            setPrayerRequests((prev) => {
              if (prev.some((r) => r.id === payload.id)) return prev;
              return [payload, ...prev];
            });
          }
        })
        .on('broadcast', { event: 'live_alert' }, ({ payload }) => {
          if (payload) {
            setActiveAlert(payload.activeAlert);
          }
        })
        // .subscribe() must come AFTER all .on() bindings — bindings added after
        // subscribe are not registered with the realtime server and would be dropped.
        .subscribe(async (status) => {
          if (status === 'SUBSCRIBED') {
            await presenceChannel.track({
              displayName: userDetails.displayName,
              onlineAt: new Date().toISOString(),
            });
          }
        });

      setlistChannel.subscribe();
      channelRef.current = { setlistChannel, presenceChannel };

      return () => {
        supabase.removeChannel(setlistChannel);
        supabase.removeChannel(presenceChannel);
      };
    };

    let cleanupFn: RealtimeCleanup | undefined;
    let cancelled = false;
    initSync().then((fn) => {
      cleanupFn = typeof fn === 'function' ? fn : undefined;
      if (cancelled && typeof fn === 'function') fn();
    });

    return () => {
      cancelled = true;
      if (cleanupFn) cleanupFn();
    };
  }, [setlistId]);

  // Operations
  const setLiveSlide = (slideId: string | null) => {
    setActiveSlideId(slideId);
    if (!setlist) return;

    const updatedSettings = { ...setlist.settings, active_slide_id: slideId };
    const updatedSetlist = { ...setlist, settings: updatedSettings };
    setSetlist(updatedSetlist);

    if (isDemoMode) {
      const stored = localStorage.getItem('holyproj_all_setlists');
      if (stored) {
        const list = JSON.parse(stored) as Setlist[];
        const updatedList = list.map((s) => (s.id === setlistId ? updatedSetlist : s));
        localStorage.setItem('holyproj_all_setlists', JSON.stringify(updatedList));
      }
      localBcRef.current?.postMessage({
        type: 'STATE_UPDATE',
        data: { setlist: updatedSetlist, activeSlideId: slideId },
      });
    } else {
      supabase
        .from('setlists')
        .update({ settings: updatedSettings })
        .eq('id', setlistId)
        .then(({ error }) => {
          if (error) console.error('Error updating live slide:', error);
        });
    }
  };

  const addPresentationToSetlist = async (presentationId: string) => {
    if (!setlist) return;

    if (isDemoMode) {
      const storedPres = localStorage.getItem('holyproj_all_pres');
      let presDetails: Presentation | undefined;
      if (storedPres) {
        const list = JSON.parse(storedPres) as Presentation[];
        presDetails = list.find((p) => p.id === presentationId);
      }

      const newItem: SetlistItem = {
        id: `demo-item-${Date.now()}`,
        setlist_id: setlistId,
        presentation_id: presentationId,
        order_index: setlist.items.length,
        presentation: presDetails
      };

      const updatedItems = [...setlist.items, newItem];
      const updatedSetlist = { ...setlist, items: updatedItems };
      setSetlist(updatedSetlist);

      const stored = localStorage.getItem('holyproj_all_setlists');
      if (stored) {
        const list = JSON.parse(stored) as Setlist[];
        const updatedList = list.map((s) => (s.id === setlistId ? updatedSetlist : s));
        localStorage.setItem('holyproj_all_setlists', JSON.stringify(updatedList));
      }

      localBcRef.current?.postMessage({
        type: 'STATE_UPDATE',
        data: { setlist: updatedSetlist },
      });
      return;
    }

    try {
      const nextIndex = setlist.items.length;
      const { error } = await supabase
        .from('setlist_items')
        .insert({
          setlist_id: setlistId,
          presentation_id: presentationId,
          order_index: nextIndex
        });

      if (error) throw error;
      fetchSetlistDetails();
    } catch (err) {
      console.error('Error adding to setlist:', err);
    }
  };

  const removePresentationFromSetlist = async (itemId: string) => {
    if (!setlist) return;

    if (isDemoMode) {
      const updatedItems = setlist.items
        .filter((item) => item.id !== itemId)
        .map((item, idx) => ({ ...item, order_index: idx }));
      const updatedSetlist = { ...setlist, items: updatedItems };
      setSetlist(updatedSetlist);

      const stored = localStorage.getItem('holyproj_all_setlists');
      if (stored) {
        const list = JSON.parse(stored) as Setlist[];
        const updatedList = list.map((s) => (s.id === setlistId ? updatedSetlist : s));
        localStorage.setItem('holyproj_all_setlists', JSON.stringify(updatedList));
      }

      localBcRef.current?.postMessage({
        type: 'STATE_UPDATE',
        data: { setlist: updatedSetlist },
      });
      return;
    }

    try {
      const { error } = await supabase
        .from('setlist_items')
        .delete()
        .eq('id', itemId);

      if (error) throw error;
      
      const remainingItems = setlist.items.filter((item) => item.id !== itemId);
      for (let i = 0; i < remainingItems.length; i++) {
        if (remainingItems[i].order_index !== i) {
          await supabase
            .from('setlist_items')
            .update({ order_index: i })
            .eq('id', remainingItems[i].id);
        }
      }

      fetchSetlistDetails();
    } catch (err) {
      console.error('Error removing from setlist:', err);
    }
  };

  const reorderSetlistItems = async (itemIdsInOrder: string[]) => {
    if (!setlist) return;

    const updatedItems = itemIdsInOrder.map((id, index) => {
      const found = setlist.items.find((item) => item.id === id);
      return { ...found!, order_index: index };
    });

    const updatedSetlist = { ...setlist, items: updatedItems };
    setSetlist(updatedSetlist);

    if (isDemoMode) {
      const stored = localStorage.getItem('holyproj_all_setlists');
      if (stored) {
        const list = JSON.parse(stored) as Setlist[];
        const updatedList = list.map((s) => (s.id === setlistId ? updatedSetlist : s));
        localStorage.setItem('holyproj_all_setlists', JSON.stringify(updatedList));
      }
      localBcRef.current?.postMessage({
        type: 'STATE_UPDATE',
        data: { setlist: updatedSetlist },
      });
      return;
    }

    try {
      for (let i = 0; i < itemIdsInOrder.length; i++) {
        await supabase
          .from('setlist_items')
          .update({ order_index: i })
          .eq('id', itemIdsInOrder[i]);
      }
      fetchSetlistDetails();
    } catch (err) {
      console.error('Error reordering items:', err);
    }
  };

  const setBlankMode = (blankMode: 'none' | 'black' | 'clear' | 'logo') => {
    if (!setlist) return;

    const updatedSettings = { ...setlist.settings, blankMode };
    const updatedSetlist = { ...setlist, settings: updatedSettings };
    setSetlist(updatedSetlist);

    if (isDemoMode) {
      const stored = localStorage.getItem('holyproj_all_setlists');
      if (stored) {
        const list = JSON.parse(stored) as Setlist[];
        const updatedList = list.map((s) => (s.id === setlistId ? updatedSetlist : s));
        localStorage.setItem('holyproj_all_setlists', JSON.stringify(updatedList));
      }
      localBcRef.current?.postMessage({
        type: 'STATE_UPDATE',
        data: { setlist: updatedSetlist },
      });
    } else {
      supabase
        .from('setlists')
        .update({ settings: updatedSettings })
        .eq('id', setlistId)
        .then(({ error }) => {
          if (error) console.error('Error updating blank mode:', error);
        });
    }
  };

  const sendPrayerRequest = (name: string, text: string) => {
    const payload = { id: `${Date.now()}-${Math.random()}`, name, text, timestamp: new Date().toISOString() };
    if (isDemoMode) {
      localBcRef.current?.postMessage({
        type: 'PRAYER_REQUEST',
        data: payload
      });
      setPrayerRequests((prev) => [payload, ...prev]);
    } else {
      const channel = channelRef.current?.presenceChannel;
      if (channel) {
        channel.send({
          type: 'broadcast',
          event: 'prayer_request',
          payload
        });
      }
    }
  };

  const clearPrayerRequests = () => {
    setPrayerRequests([]);
  };

  const sendAlert = (message: string, type: LiveAlert['type'] = 'general', position: LiveAlert['position'] = 'bottom') => {
    const payload: LiveAlert = {
      id: `${Date.now()}-${Math.random()}`,
      message,
      type,
      position,
      timestamp: new Date().toISOString()
    };

    setActiveAlert(payload);

    if (isDemoMode) {
      localBcRef.current?.postMessage({
        type: 'LIVE_ALERT',
        data: { activeAlert: payload }
      });
    } else {
      const channel = channelRef.current?.presenceChannel;
      if (channel) {
        channel.send({
          type: 'broadcast',
          event: 'live_alert',
          payload: { activeAlert: payload }
        });
      }
    }
  };

  const clearAlert = () => {
    setActiveAlert(null);

    if (isDemoMode) {
      localBcRef.current?.postMessage({
        type: 'LIVE_ALERT',
        data: { activeAlert: null }
      });
    } else {
      const channel = channelRef.current?.presenceChannel;
      if (channel) {
        channel.send({
          type: 'broadcast',
          event: 'live_alert',
          payload: { activeAlert: null }
        });
      }
    }
  };

  return {
    isDemoMode,
    setlist,
    activeSlideId,
    presenceUsers,
    currentUser,
    loading,
    setLiveSlide,
    addPresentationToSetlist,
    removePresentationFromSetlist,
    reorderSetlistItems,
    setBlankMode,
    sendPrayerRequest,
    clearPrayerRequests,
    prayerRequests,
    sendAlert,
    clearAlert,
    activeAlert,
    refresh: fetchSetlistDetails
  };
}

// ============================================================================
// TEMPLATES (Phase 2 — saved slide designs, shared across the church)
// ============================================================================

export function useTemplates() {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchTemplates = async () => {
    setLoading(true);
    if (!IS_SUPABASE_CONFIGURED) {
      const stored = localStorage.getItem('holyproj_templates');
      setTemplates(stored ? JSON.parse(stored) : []);
      setLoading(false);
      return;
    }
    const { data, error } = await supabase
      .from('templates')
      .select('*')
      .order('is_starter', { ascending: false })
      .order('created_at', { ascending: false });
    if (error) console.error('Error loading templates:', error.message);
    setTemplates((data as Template[]) || []);
    setLoading(false);
  };

  const saveTemplate = async (name: string, data: TemplateData): Promise<string | null> => {
    if (!IS_SUPABASE_CONFIGURED) {
      const tpl: Template = { id: `tpl-${Date.now()}`, name, data };
      const updated = [tpl, ...templates];
      localStorage.setItem('holyproj_templates', JSON.stringify(updated));
      setTemplates(updated);
      return tpl.id;
    }
    const { data: sess } = await supabase.auth.getSession();
    const { data: row, error } = await supabase
      .from('templates')
      .insert({ name, created_by: sess?.session?.user?.id || null, data })
      .select()
      .single();
    if (error) { console.error('Error saving template:', error.message); return null; }
    setTemplates((prev) => [row as Template, ...prev]);
    return (row as Template).id;
  };

  const deleteTemplate = async (id: string) => {
    if (!IS_SUPABASE_CONFIGURED) {
      const updated = templates.filter((t) => t.id !== id);
      localStorage.setItem('holyproj_templates', JSON.stringify(updated));
      setTemplates(updated);
      return;
    }
    const { error } = await supabase.from('templates').delete().eq('id', id);
    if (error) { console.error('Error deleting template:', error.message); return; }
    setTemplates((prev) => prev.filter((t) => t.id !== id));
  };

  useEffect(() => { void Promise.resolve().then(fetchTemplates); }, []);

  return { templates, loading, saveTemplate, deleteTemplate, refresh: fetchTemplates };
}
