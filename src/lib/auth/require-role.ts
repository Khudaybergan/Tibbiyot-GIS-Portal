import 'server-only';
import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';
import type { User } from '@supabase/supabase-js';
import { createClient } from '@/lib/supabase/server';
import { getUserRoles } from './get-user-roles';
import type { UserRole, Permission } from './roles';
import { hasPermission } from './roles';

export interface AuthContext {
  /** Authenticated Supabase user (never null — function redirects if missing). */
  user: User;
  /** The role the user explicitly selected this session. */
  selectedRole: UserRole;
}

/**
 * Central guard for Server Actions, Route Handlers, and Server Components
 * that need to enforce role-based authorization.
 *
 * Checks (in order):
 *  1. User is authenticated (valid Supabase session)
 *  2. User's profile is active (not blocked by admin)
 *  3. selected_role cookie is present
 *  4. The selected role is still active in user_roles (not revoked)
 *  5. Optional: the selected role has the required permission
 *
 * On any failure this function calls redirect(), which throws Next.js's
 * internal NEXT_REDIRECT error — safe to call from Server Actions and
 * Server Components alike.
 *
 * Usage in a Server Action:
 *   export async function createObject(formData: FormData) {
 *     const { user, selectedRole } = await requireSelectedRole('objects.create');
 *     // ... proceed knowing user is authed, role is valid, permission is granted
 *   }
 *
 * Usage without a specific permission (just auth + role):
 *   const { user, selectedRole } = await requireSelectedRole();
 */
export async function requireSelectedRole(permission?: Permission): Promise<AuthContext> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect('/login');

  // ── Check is_active (blocked user guard) ──────────────────────────────────
  // We read is_active directly rather than relying solely on the middleware
  // check — Server Actions bypass middleware, so this must be re-verified here.
  const { data: profile } = await supabase
    .from('profiles')
    .select('is_active')
    .eq('id', user.id)
    .single() as { data: { is_active: boolean } | null; error: unknown };

  if (profile?.is_active === false) {
    await supabase.auth.signOut();
    redirect('/login?error=Sizning%20hisobingiz%20bloklangan');
  }

  // ── Validate selected_role cookie ─────────────────────────────────────────
  const cookieStore = await cookies();
  const selectedRole = cookieStore.get('selected_role')?.value as UserRole | undefined;

  if (!selectedRole) redirect('/select-role');

  // ── Verify role is still active in DB (tamper / revocation guard) ─────────
  // The cookie is not HttpOnly so it could theoretically be forged. Even if it
  // weren't, a super_admin may have revoked the role since the cookie was set.
  const userRoles = await getUserRoles(user.id);

  if (!userRoles.includes(selectedRole)) {
    // Role was revoked — clear stale cookie and force re-selection
    cookieStore.delete('selected_role');
    redirect('/select-role');
  }

  // ── Optional permission check ─────────────────────────────────────────────
  if (permission !== undefined && !hasPermission(selectedRole, permission)) {
    redirect('/admin/access-denied');
  }

  return { user, selectedRole };
}
