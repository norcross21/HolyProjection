import { supabase } from './supabase';

/**
 * Whether a real Supabase backend is wired up (vs. the offline localStorage demo).
 */
export const IS_SUPABASE_CONFIGURED =
  Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL) &&
  Boolean(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) &&
  process.env.NEXT_PUBLIC_SUPABASE_URL !== 'https://your-project-id.supabase.co' &&
  process.env.NEXT_PUBLIC_SUPABASE_URL !== 'https://placeholder-project-id.supabase.co';

export interface AuthIdentity {
  email: string;
  displayName: string;
}

/**
 * Resolve the current presenter identity, or null if not authenticated.
 *
 * In Supabase (cloud) mode a real authenticated session is REQUIRED — the legacy
 * `holyproj_user` localStorage flag is intentionally NOT accepted here, since anyone
 * could set it from the browser console to slip past the redirect. In offline demo
 * mode (no Supabase configured) the localStorage profile is accepted as before.
 */
export async function resolveAuth(): Promise<AuthIdentity | null> {
  if (IS_SUPABASE_CONFIGURED) {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) return null;
    return {
      email: session.user.email || '',
      displayName:
        session.user.user_metadata?.displayName ||
        session.user.email?.split('@')[0] ||
        'Presenter',
    };
  }

  const saved = typeof window !== 'undefined' ? localStorage.getItem('holyproj_user') : null;
  return saved ? (JSON.parse(saved) as AuthIdentity) : null;
}

/**
 * Clear any local profile and end the Supabase session.
 */
export async function signOut(): Promise<void> {
  localStorage.removeItem('holyproj_user');
  await supabase.auth.signOut();
}
