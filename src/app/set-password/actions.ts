'use server';

import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

/**
 * Called from the set-password client component after the user successfully
 * sets their password via supabase.auth.updateUser().
 * Marks the profile as active — the account is only considered live once
 * the user has actually set a password and confirmed the invite.
 */
export async function activateCurrentUser(): Promise<void> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;

  const adminClient = createAdminClient();
  await (adminClient.from('profiles') as any)
    .update({ is_active: true })
    .eq('id', user.id);
}
