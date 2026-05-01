import type { ReactNode } from 'react';
import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';
import { Building, LogOut, User } from 'lucide-react';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { createClient } from '@/lib/supabase/server';
import { getUserRoles } from '@/lib/auth/get-user-roles';
import { getDirectorInstitutions } from '@/lib/auth/get-director-institutions';
import { UserRole } from '@/lib/auth/roles';
import { logout } from '@/app/admin/actions';

export default async function InstitutionLayout({ children }: { children: ReactNode }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect('/login');

  // ── Verify selected role ──────────────────────────────────────────────────
  const cookieStore = await cookies();
  const selectedRole = cookieStore.get('selected_role')?.value as UserRole | undefined;

  if (!selectedRole) redirect('/select-role');

  const userRoles = await getUserRoles(user.id);

  if (!userRoles.includes(selectedRole)) {
    cookieStore.delete('selected_role');
    redirect('/select-role');
  }

  if (selectedRole !== 'institution_director') {
    redirect('/admin/access-denied');
  }

  // ── Check is_active ───────────────────────────────────────────────────────
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

  // ── Load assigned institutions ────────────────────────────────────────────
  const institutionIds = await getDirectorInstitutions(user.id);

  if (institutionIds.length === 0) {
    // Authenticated institution_director but no institution assigned yet.
    // Show an informative page rather than crashing or looping.
    redirect('/admin/access-denied?reason=no_institution');
  }

  const userName = profile?.full_name ?? user.email?.split('@')[0] ?? 'Director';
  const initials = userName.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2);

  return (
    <div className="flex min-h-screen w-full flex-col bg-slate-50">
      <header className="sticky top-0 z-10 flex h-16 items-center gap-4 border-b bg-white px-6 shadow-sm">
        <div className="flex items-center gap-2 font-semibold text-slate-900">
          <Building className="h-5 w-5 text-purple-600" />
          <span>Muassasa Kabineti</span>
        </div>

        <div className="flex-1" />

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              className="relative h-10 w-10 rounded-full ring-2 ring-slate-100 overflow-hidden p-0"
            >
              <Avatar className="h-full w-full">
                {profile?.avatar_url && (
                  <AvatarImage src={profile.avatar_url} alt={userName} />
                )}
                <AvatarFallback>{initials}</AvatarFallback>
              </Avatar>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel className="font-normal">
              <div className="flex flex-col space-y-1">
                <p className="text-sm font-bold text-slate-900">{userName}</p>
                <p className="text-xs text-slate-500">{user.email}</p>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem>
              <User className="mr-2 h-4 w-4" />
              Profil
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <form action={logout}>
              <DropdownMenuItem asChild>
                <button
                  type="submit"
                  className="w-full flex items-center text-red-600 focus:text-red-600 focus:bg-red-50"
                >
                  <LogOut className="mr-2 h-4 w-4" />
                  Chiqish
                </button>
              </DropdownMenuItem>
            </form>
          </DropdownMenuContent>
        </DropdownMenu>
      </header>

      <main className="flex-1 p-4 md:p-6 lg:p-8">
        {children}
      </main>
    </div>
  );
}
