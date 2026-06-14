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

export interface SyncState {
  activePresentationId: string | null;
  activeSlideId: string | null;
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
  cursor?: string; // e.g. 'dashboard' or 'projector'
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

export function useRealtimePresentation(presentationId: string = 'demo-presentation-1') {
  const [isDemoMode, setIsDemoMode] = useState(!IS_SUPABASE_CONFIGURED);
  const [presentation, setPresentation] = useState<Presentation>(DEFAULT_PRESENTATION);
  const [activeSlideId, setActiveSlideId] = useState<string | null>('slide-1');
  const [presenceUsers, setPresenceUsers] = useState<PresenceUser[]>([]);
  const [currentUser, setCurrentUser] = useState<{ email: string; displayName: string } | null>(null);

  const channelRef = useRef<any>(null);
  const localBcRef = useRef<BroadcastChannel | null>(null);

  // Load initial profile/session
  useEffect(() => {
    // Generate simple local user identity
    const savedUser = localStorage.getItem('holyproj_user');
    let user = savedUser ? JSON.parse(savedUser) : null;
    if (!user) {
      const randId = Math.floor(Math.random() * 1000);
      user = {
        email: `collaborator${randId}@church.org`,
        displayName: `Collaborator ${randId}`,
      };
      localStorage.setItem('holyproj_user', JSON.stringify(user));
    }
    setCurrentUser(user);

    if (!IS_SUPABASE_CONFIGURED) {
      // Setup BroadcastChannel for multi-tab demo sync
      const bc = new BroadcastChannel('holyprojection_sync');
      localBcRef.current = bc;

      // Load initial state from localStorage
      const cachedPres = localStorage.getItem(`holyproj_pres_${presentationId}`);
      if (cachedPres) {
        setPresentation(JSON.parse(cachedPres));
      }
      const cachedActive = localStorage.getItem(`holyproj_active_${presentationId}`);
      if (cachedActive) {
        setActiveSlideId(cachedActive);
      }

      // Handle incoming messages
      bc.onmessage = (event) => {
        const { type, data } = event.data;
        if (type === 'STATE_UPDATE') {
          if (data.presentation) setPresentation(data.presentation);
          if (data.activeSlideId !== undefined) setActiveSlideId(data.activeSlideId);
        } else if (type === 'PING_PRESENCE') {
          // Respond to pings with our user info
          bc.postMessage({
            type: 'PONG_PRESENCE',
            data: {
              id: user.email,
              email: user.email,
              displayName: user.displayName,
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

      // Broadcast entry ping
      bc.postMessage({ type: 'PING_PRESENCE' });
      // Add ourselves to presence immediately
      setPresenceUsers([{
        id: user.email,
        email: user.email,
        displayName: user.displayName + ' (You)',
        onlineAt: new Date().toISOString(),
      }]);

      return () => {
        bc.close();
      };
    } else {
      // --- Supabase Realtime Integration ---
      // Fetch initial presentation data from Supabase
      const fetchInitial = async () => {
        const { data: presData, error: presError } = await supabase
          .from('presentations')
          .select('*')
          .eq('id', presentationId)
          .single();

        if (presData) {
          // Fetch slides
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
        }

        // Fetch active projection
        const { data: activeData } = await supabase
          .from('active_projection')
          .select('active_slide_id')
          .eq('presentation_id', presentationId)
          .single();

        if (activeData) {
          setActiveSlideId(activeData.active_slide_id);
        }
      };

      fetchInitial();

      // Subscribe to changes in active_projection, slides, presentations
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
            // Re-fetch slides on change
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
        config: {
          presence: {
            key: user.email,
          },
        },
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
              displayName: user.displayName,
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
    }
  }, [presentationId]);

  // Sync state update function
  const updateSlideContent = (slideId: string, content: string, translation?: string) => {
    const updatedSlides = presentation.slides.map((s) => {
      if (s.id === slideId) {
        return { ...s, content, translation };
      }
      return s;
    });

    const updatedPresentation = { ...presentation, slides: updatedSlides };
    setPresentation(updatedPresentation);

    if (isDemoMode) {
      localStorage.setItem(`holyproj_pres_${presentationId}`, JSON.stringify(updatedPresentation));
      localBcRef.current?.postMessage({
        type: 'STATE_UPDATE',
        data: { presentation: updatedPresentation },
      });
    } else {
      supabase
        .from('slides')
        .update({ content, translation, updated_at: new Date().toISOString() })
        .eq('id', slideId)
        .then(({ error }) => {
          if (error) console.error('Error updating slide:', error);
        });
    }
  };

  // Sync slide change
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
    updateSlideContent,
    setLiveSlide,
    updateSettings,
  };
}
