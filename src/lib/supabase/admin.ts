import { createClient } from '@supabase/supabase-js';
import type { Database } from './types';

/**
 * Supabase admin client. SERVER-ONLY. Bypasses RLS via service role key.
 *
 * Use ONLY for:
 *   - Bulk imports (after server-side authorization check)
 *   - Audit log writes
 *   - System-level operations triggered by trusted code paths
 *
 * NEVER import this from a Client Component or expose its results to the browser
 * without filtering. Always re-check the caller's role before using.
 */
export function createAdminClient() {
  if (typeof window !== 'undefined') {
    throw new Error('createAdminClient must never be called from the browser.');
  }

  return createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  );
}
