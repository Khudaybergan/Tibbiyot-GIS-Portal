import 'server-only';
import { createClient } from '@/lib/supabase/server';

/**
 * Returns the medical_object IDs that a user is authorized to manage
 * as institution_director (active assignments only).
 *
 * An empty array means the director has no assigned institutions yet —
 * they can log in but cannot access any institution data until assigned.
 *
 * Used by institution routes to scope all queries, and can also be used
 * in Server Actions to verify that an update targets an allowed institution.
 */
export async function getDirectorInstitutions(userId: string): Promise<string[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('user_roles')
    .select('institution_id')
    .eq('user_id', userId)
    .eq('role', 'institution_director')
    .is('revoked_at', null)
    .not('institution_id', 'is', null) as {
      data: { institution_id: string }[] | null;
      error: unknown;
    };

  if (error || !data) return [];
  return data.map((r) => r.institution_id);
}
