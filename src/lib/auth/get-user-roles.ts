import 'server-only';
import { createClient } from '@/lib/supabase/server';
import type { UserRole } from './roles';

/**
 * Returns all active (non-revoked) roles for a user from the DB.
 *
 * Deduplicates with Set: an institution_director assigned to multiple
 * institutions has one user_roles row per institution, all with the same
 * role value. Without dedup, the array would contain duplicates.
 *
 * Server-only — never import in Client Components or files that touch the bundle.
 */
export async function getUserRoles(userId: string): Promise<UserRole[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('user_roles')
    .select('role')
    .eq('user_id', userId)
    .is('revoked_at', null) as { data: { role: string }[] | null; error: unknown };

  if (error || !data) return [];
  return [...new Set(data.map((r) => r.role as UserRole))];
}
