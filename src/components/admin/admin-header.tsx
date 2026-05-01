'use client';

import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { SidebarTrigger } from '../ui/sidebar';
import Link from 'next/link';
import { LogOut, User, Settings, SwitchCamera, ShieldCheck } from 'lucide-react';
import { useIsMobile } from '@/hooks/use-mobile';
import { UserRole, ROLE_CONFIGS } from '@/lib/auth/roles';
import { Badge } from '../ui/badge';
import { cn } from '@/lib/utils';
import { logout } from '@/app/admin/actions';

interface AdminHeaderProps {
  userEmail: string;
  userName: string;
  avatarUrl: string | null;
  currentRole: UserRole;
  availableRoles: UserRole[];
}

export function AdminHeader({
  userEmail,
  userName,
  avatarUrl,
  currentRole,
  availableRoles,
}: AdminHeaderProps) {
  const isMobile = useIsMobile();
  const roleConfig = ROLE_CONFIGS[currentRole];

  const initials = userName
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  const handleLogout = () => logout();

  return (
    <header className="sticky top-0 z-40 flex h-16 items-center gap-4 border-b bg-white/80 backdrop-blur-md px-4 sm:px-6 shadow-sm">
      <div className="flex items-center gap-4">
        {isMobile && <SidebarTrigger />}
        <div className="hidden sm:flex items-center gap-2">
          <Badge
            variant="outline"
            className={cn(
              'px-3 py-1 rounded-lg font-bold border-none shadow-none uppercase text-[10px]',
              roleConfig.color,
            )}
          >
            <ShieldCheck className="mr-1.5 h-3.5 w-3.5" />
            {roleConfig.label}
          </Badge>
        </div>
      </div>

      <div className="flex-1" />

      <div className="flex items-center gap-2">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              className="relative h-10 w-10 rounded-full ring-2 ring-slate-100 overflow-hidden p-0"
            >
              <Avatar className="h-full w-full">
                {avatarUrl && <AvatarImage src={avatarUrl} alt={userName} />}
                <AvatarFallback>{initials}</AvatarFallback>
              </Avatar>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56 mt-2">
            <DropdownMenuLabel className="font-normal">
              <div className="flex flex-col space-y-1">
                <p className="text-sm font-bold leading-none text-slate-900">{userName}</p>
                <p className="text-xs leading-none text-slate-500">{userEmail}</p>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem>
              <User className="mr-2 h-4 w-4" />
              Profil sozlamalari
            </DropdownMenuItem>
            {availableRoles.length > 1 && (
              <DropdownMenuItem asChild>
                <Link href="/select-role">
                  <SwitchCamera className="mr-2 h-4 w-4" />
                  Rolni almashtirish
                </Link>
              </DropdownMenuItem>
            )}
            {currentRole === 'super_admin' && (
              <DropdownMenuItem asChild>
                <Link href="/admin/settings">
                  <Settings className="mr-2 h-4 w-4" />
                  Tizim sozlamalari
                </Link>
              </DropdownMenuItem>
            )}
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={handleLogout}
              className="text-red-600 focus:text-red-600 focus:bg-red-50"
            >
              <LogOut className="mr-2 h-4 w-4" />
              Chiqish
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
