import { createBrowserClient } from '@supabase/ssr';
import type { Database } from './types';

/**
 * Supabase browser client. Use in Client Components.
 * Reads NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY from env.
 *
 * Usage:
 *   const supabase = createClient();
 *   const { data } = await supabase.from('medical_objects').select();
 */
export function createClient() {
  return createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
