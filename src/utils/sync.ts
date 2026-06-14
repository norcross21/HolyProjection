import { useEffect, useState, useRef } from 'react';
import { supabase } from './supabase';

export interface Slide {
  id: string;
  order_index: number;
  content: string;
  translation?: string;
  media_type?: 'none' | 'color' | 'video' | 'camera';
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
  };
}

export interface PresenceUser {
  id: string;
  email: string;
  displayName: string;
  onlineAt: string;
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

  const createNewPresentation = async (title: string) => {
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
        slides: [
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

      // Create initial slide
      const { error: slideErr } = await supabase
        .from('slides')
        .insert({
          presentation_id: presData.id,
          order_index: 0,
          content: 'Amazing grace! How sweet the sound...',
          translation: 'يا للنعمة المذهلة! ما أحلى الصوت...',
        });

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
        // 1. Fetch initial presentation
        const { data: presData, error: presError } = await supabase
          .from('presentations')
          .select('*')
          .eq('id', presentationId)
          .single();

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

          // 2. Fetch active projection
          const { data: activeData } = await supabase
            .from('active_projection')
            .select('active_slide_id')
            .eq('presentation_id', presentationId)
            .single();

          if (activeData) {
            setActiveSlideId(activeData.active_slide_id);
          } else if (slidesData && slidesData.length > 0) {
            setActiveSlideId(slidesData[0].id);
          }
        }
      } catch (err) {
        console.error('Error loading presentation sync:', err);
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
      supabase
        .from('active_projection')
        .update({ active_slide_id: slideId, updated_at: new Date().toISOString() })
        .eq('presentation_id', presentationId)
        .then(({ error }) => {
          if (error) console.error('Error updating active slide:', error);
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
  };
}
