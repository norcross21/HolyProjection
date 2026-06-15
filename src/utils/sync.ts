import { useEffect, useState, useRef } from 'react';
import { supabase } from './supabase';

export interface Slide {
  id: string;
  order_index: number;
  content: string;
  translation?: string;
  media_type?: 'none' | 'color' | 'video' | 'camera' | 'image';
  media_url?: string;
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

  useEffect(() => {
    fetchPresentations();
  }, []);

  return {
    presentations,
    loading,
    isDemoMode,
    refresh: fetchPresentations,
    createNewPresentation,
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

  const channelRef = useRef<any>(null);
  const localBcRef = useRef<BroadcastChannel | null>(null);
  const [prayerRequests, setPrayerRequests] = useState<{ id: string; name: string; text: string; timestamp: string }[]>([]);
  const [activeAlert, setActiveAlert] = useState<LiveAlert | null>(null);

  // Load profile and run synchronization
  useEffect(() => {
    if (!presentationId) return;
    setLoading(true);

    const initSessionAndSync = async () => {
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

          setPresentation({
            id: presData.id,
            title: presData.title,
            settings: presData.settings,
            slides: slidesData || [],
          });

          // 2. Fetch active projection (maybeSingle: no row yet is normal for a
          // freshly created presentation, and should not throw)
          const { data: activeData } = await supabase
            .from('active_projection')
            .select('active_slide_id')
            .eq('presentation_id', presentationId)
            .maybeSingle();

          if (activeData) {
            setActiveSlideId(activeData.active_slide_id);
          } else if (slidesData && slidesData.length > 0) {
            setActiveSlideId(slidesData[0].id);
          }
        }
      } catch (err: any) {
        console.error('Error loading presentation sync:', err?.message || err);
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
          (payload: any) => {
            if (payload.new) {
              setActiveSlideId(payload.new.active_slide_id);
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
          (payload: any) => {
            if (payload.new) {
              setPresentation((prev) => ({
                ...prev,
                title: payload.new.title,
                settings: payload.new.settings,
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
            const userPresences = state[key] as any;
            if (userPresences && userPresences.length > 0) {
              users.push({
                id: key,
                email: key,
                displayName: userPresences[0].displayName || key,
                onlineAt: userPresences[0].onlineAt,
              });
            }
          });
          setPresenceUsers(users);
        })
        .subscribe(async (status) => {
          if (status === 'SUBSCRIBED') {
            await presenceChannel.track({
              displayName: userDetails.displayName,
              onlineAt: new Date().toISOString(),
            });
          }
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
        });

      activeProjChannel.subscribe();
      channelRef.current = { activeProjChannel, presenceChannel };

      return () => {
        supabase.removeChannel(activeProjChannel);
        supabase.removeChannel(presenceChannel);
      };
    };

    let cleanupFn: any = null;
    initSessionAndSync().then(fn => {
      cleanupFn = fn;
    });

    return () => {
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

    const updatedPresentation = { ...presentation, slides: updatedSlides };
    setPresentation(updatedPresentation);

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
          if (error) console.error('Error updating slide:', error);
        });
    }
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
    setPresentation(updatedPresentation);

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

  return {
    isDemoMode,
    presentation,
    activeSlideId,
    presenceUsers,
    currentUser,
    loading,
    updateSlideContent,
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
            items: Array(count || 0).fill({} as any), // Placeholder items to represent count
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

  useEffect(() => {
    fetchSetlists();
  }, []);

  return {
    setlists,
    loading,
    isDemoMode,
    refresh: fetchSetlists,
    createNewSetlist
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
  const channelRef = useRef<any>(null);
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

        const itemsMapped: SetlistItem[] = (itemsData || []).map((item: any) => ({
          id: item.id,
          setlist_id: item.setlist_id,
          presentation_id: item.presentation_id,
          order_index: item.order_index,
          presentation: item.presentations ? {
            id: item.presentations.id,
            title: item.presentations.title,
            settings: item.presentations.settings,
            slides: item.presentations.slides || []
          } : undefined
        }));

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
    setLoading(true);

    const initSync = async () => {
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
          (payload: any) => {
            if (payload.new) {
              setSetlist((prev) => {
                if (!prev) return null;
                return {
                  ...prev,
                  title: payload.new.title,
                  settings: payload.new.settings || {},
                };
              });
              if (payload.new.settings && payload.new.settings.active_slide_id !== undefined) {
                setActiveSlideId(payload.new.settings.active_slide_id);
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
            const userPresences = state[key] as any;
            if (userPresences && userPresences.length > 0) {
              users.push({
                id: key,
                email: key,
                displayName: userPresences[0].displayName || key,
                onlineAt: userPresences[0].onlineAt,
              });
            }
          });
          setPresenceUsers(users);
        })
        .subscribe(async (status) => {
          if (status === 'SUBSCRIBED') {
            await presenceChannel.track({
              displayName: userDetails.displayName,
              onlineAt: new Date().toISOString(),
            });
          }
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
        });

      setlistChannel.subscribe();
      channelRef.current = { setlistChannel, presenceChannel };

      return () => {
        supabase.removeChannel(setlistChannel);
        supabase.removeChannel(presenceChannel);
      };
    };

    let cleanupFn: any = null;
    initSync().then((fn) => {
      cleanupFn = fn;
    });

    return () => {
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
