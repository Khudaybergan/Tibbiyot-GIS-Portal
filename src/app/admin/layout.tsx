import type { ReactNode } from 'react';
import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';
import { SidebarProvider, Sidebar, SidebarInset } from '@/components/ui/sidebar';
import { AdminSidebarNav } from '@/components/admin/admin-sidebar-nav';
import { AdminHeader } from '@/components/admin/admin-header';
import { createClient } from '@/lib/supabase/server';
import { UserRole } from '@/lib/auth/roles';
import { getUserRoles } from '@/lib/auth/get-user-roles';
import { SessionGuard } from '@/components/admin/session-guard';

export default async function AdminLayout({ children }: { children: ReactNode }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect('/login');

  const cookieStore = await cookies();
  const selectedRole = cookieStore.get('selected_role')?.value as UserRole | undefined;

  if (!selectedRole) redirect('/select-role');

  // Verify the selected role is still valid for this user
  const roles = await getUserRoles(user.id);
  if (!roles.includes(selectedRole)) redirect('/select-role');

  // Fetch profile — also check is_active to block suspended users
  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name, avatar_url, is_active')
    .eq('id', user.id)
    .single() as {
      data: { full_name: string | null; avatar_url: string | null; is_active: boolean } | null;
      error: unknown;
    };

  if (profile?.is_active === false) {
    await supabase.auth.signOut();
    redirect('/login?error=Sizning%20hisobingiz%20bloklangan');
  }

  return (
    <SidebarProvider>
      <Sidebar collapsible="icon" className="border-r border-slate-100 shadow-xl shadow-slate-900/5">
        <AdminSidebarNav />
      </Sidebar>
      <SidebarInset className="flex flex-col bg-slate-50/50">
        <AdminHeader
          userEmail={user.email ?? ''}
          userName={profile?.full_name ?? user.email?.split('@')[0] ?? 'Admin'}
          avatarUrl={profile?.avatar_url ?? null}
          currentRole={selectedRole}
          availableRoles={roles}
        />
        <main className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-10 max-w-[1600px] mx-auto w-full animate-in fade-in duration-500">
          {children}
        </main>
        <SessionGuard />
      </SidebarInset>
    </SidebarProvider>
  );
}
