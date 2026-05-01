'use server';

import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { cookies } from 'next/headers';

export async function logout() {
  const supabase = await createClient();
  await supabase.auth.signOut(); // clears HttpOnly session cookies server-side

  const cookieStore = await cookies();
  cookieStore.delete('selected_role');
  cookieStore.delete('session_last_activity');
  cookieStore.delete('session_expires_at');

  redirect('/login');
}
