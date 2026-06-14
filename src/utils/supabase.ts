import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder-project-id.supabase.co';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder-anon-key';

if (
  (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) ||
  process.env.NEXT_PUBLIC_SUPABASE_URL === 'https://your-project-id.supabase.co'
) {
  if (typeof window !== 'undefined') {
    console.warn(
      'Supabase URL or Anon Key is missing! Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY in your .env.local file.'
    );
  }
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
