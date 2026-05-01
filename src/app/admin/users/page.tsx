import { cookies } from 'next/headers';
import { requireSelectedRole } from '@/lib/auth/require-role';
import { createAdminClient } from '@/lib/supabase/admin';
import { createClient } from '@/lib/supabase/server';
import type { UserRole } from '@/lib/auth/roles';
import { UsersClient } from '@/components/admin/users/users-client';

export const dynamic = 'force-dynamic';

export type RoleAssignment = {
  id: string;
  role: UserRole;
  institution_id: string | null;
  institution_name: string | null;
  granted_at: string;
};

export type UserRow = {
  id: string;
  email: string;
  full_name: string | null;
  avatar_url: string | null;
  is_active: boolean;
  created_at: string;
  last_sign_in_at: string | null;
  roles: RoleAssignment[];
};

export type InstitutionOption = {
  id: string;
  name: string;
};

export type PasswordResetRequest = {
  id: string;
  user_id: string | null;
  email: string;
  requested_at: string;
  status: 'pending' | 'fulfilled' | 'rejected' | 'expired';
  admin_note: string | null;
};

export default async function UsersPage() {
  const { selectedRole } = await requireSelectedRole('users.read');

  const adminClient = createAdminClient();
  const supabase = await createClient();

  // ── Fetch auth users ──────────────────────────────────────────────────────
  const { data: { users: authUsers } } = await adminClient.auth.admin.listUsers({
    perPage: 1000,
  });

  // ── Fetch profiles ────────────────────────────────────────────────────────
  const { data: profiles } = await supabase
    .from('profiles')
    .select('id, full_name, avatar_url, is_active, created_at') as {
      data: {
        id: string; full_name: string | null; avatar_url: string | null;
        is_active: boolean; created_at: string;
      }[] | null;
      error: unknown;
    };

  const profileMap = new Map((profiles ?? []).map((p) => [p.id, p]));

  // ── Fetch all active role assignments ─────────────────────────────────────
  const { data: roleRows } = await supabase
    .from('user_roles')
    .select('id, user_id, role, institution_id, granted_at')
    .is('revoked_at', null)
    .order('granted_at', { ascending: true }) as {
      data: {
        id: string; user_id: string; role: string;
        institution_id: string | null; granted_at: string;
      }[] | null;
      error: unknown;
    };

  // ── Fetch institution names for assigned directors ─────────────────────
  const institutionIds = [...new Set(
    (roleRows ?? []).map((r) => r.institution_id).filter((id): id is string => id !== null),
  )];

  let institutionNames = new Map<string, string>();
  if (institutionIds.length > 0) {
    const { data: insts } = await supabase
      .from('medical_objects')
      .select('id, name')
      .in('id', institutionIds) as { data: { id: string; name: string }[] | null; error: unknown };
    institutionNames = new Map((insts ?? []).map((i) => [i.id, i.name]));
  }

  // ── All institutions for the grant-role dialog picker ────────────────────
  const { data: allInstitutions } = await supabase
    .from('medical_objects')
    .select('id, name')
    .eq('activity_status', 'active')
    .order('name', { ascending: true })
    .limit(500) as { data: { id: string; name: string }[] | null; error: unknown };

  // ── Build role map per user ───────────────────────────────────────────────
  const rolesMap = new Map<string, RoleAssignment[]>();
  for (const row of roleRows ?? []) {
    if (!rolesMap.has(row.user_id)) rolesMap.set(row.user_id, []);
    rolesMap.get(row.user_id)!.push({
      id: row.id,
      role: row.role as UserRole,
      institution_id: row.institution_id,
      institution_name: row.institution_id ? (institutionNames.get(row.institution_id) ?? null) : null,
      granted_at: row.granted_at,
    });
  }

  // ── Merge into UserRow[] ──────────────────────────────────────────────────
  const allUsers: UserRow[] = authUsers.map((au) => {
    const profile = profileMap.get(au.id);
    return {
      id: au.id,
      email: au.email ?? '',
      full_name: profile?.full_name ?? null,
      avatar_url: profile?.avatar_url ?? null,
      is_active: profile?.is_active ?? true,
      created_at: au.created_at,
      last_sign_in_at: au.last_sign_in_at ?? null,
      roles: rolesMap.get(au.id) ?? [],
    };
  });

  allUsers.sort((a, b) => {
    if (a.is_active !== b.is_active) return a.is_active ? -1 : 1;
    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
  });

  // Super admins are only visible to other super admins.
  const users = selectedRole === 'super_admin'
    ? allUsers
    : allUsers.filter((u) => !u.roles.some((r) => r.role === 'super_admin'));

  // ── Password reset requests (pending only, for the admin review section) ─
  const { data: resetRequests } = await (adminClient.from('password_reset_requests') as any)
    .select('id, user_id, email, requested_at, status, admin_note')
    .order('requested_at', { ascending: false })
    .limit(50) as { data: PasswordResetRequest[] | null; error: unknown };

  const stats = {
    total: users.length,
    active: users.filter((u) => u.is_active).length,
    blocked: users.filter((u) => !u.is_active).length,
    withRoles: users.filter((u) => u.roles.length > 0).length,
    pendingResets: (resetRequests ?? []).filter((r) => r.status === 'pending').length,
  };

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col gap-1">
        <h1 className="text-3xl font-bold tracking-tight">Foydalanuvchilar</h1>
        <p className="text-muted-foreground">
          Foydalanuvchilar, rollar va kirish huquqlarini boshqarish.
        </p>
      </div>

      <UsersClient
        users={users}
        institutions={allInstitutions ?? []}
        resetRequests={resetRequests ?? []}
        stats={stats}
        currentRole={selectedRole}
      />
    </div>
  );
}
