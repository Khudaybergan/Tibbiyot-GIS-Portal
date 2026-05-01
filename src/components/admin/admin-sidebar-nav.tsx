'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  SidebarHeader,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarContent,
  SidebarFooter,
} from '@/components/ui/sidebar';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import {
  MapPin,
  Syringe,
  LayoutGrid,
  FileUp,
  Settings,
  LogOut,
  ExternalLink,
  Users,
  CheckSquare,
  History,
  Building2,
  ShieldCheck
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { UserRole, canAccessRoute } from '@/lib/auth/roles';
import { logout } from '@/app/admin/actions';

const allLinks = [
  { href: '/admin/dashboard', label: 'Boshqaruv paneli', icon: LayoutGrid },
  { href: '/admin/objects', label: 'Muassasalar', icon: Syringe },
  { href: '/admin/import', label: 'Import', icon: FileUp },
  { href: '/admin/moderation', label: 'Moderatsiya', icon: CheckSquare },
  { href: '/admin/audit-log', label: 'Audit tarixi', icon: History },
  { href: '/admin/users', label: 'Foydalanuvchilar', icon: Users },
  { href: '/institution', label: 'Mening muassasam', icon: Building2 },
];

export function AdminSidebarNav() {
  const pathname = usePathname();
  const [currentRole, setCurrentRole] = useState<UserRole | null>(null);

  useEffect(() => {
    const role = document.cookie
      .split('; ')
      .find(row => row.startsWith('selected_role='))
      ?.split('=')[1] as UserRole;
    setCurrentRole(role || null);
  }, []);

  const filteredLinks = allLinks.filter(link => {
    if (!currentRole) return false;
    return canAccessRoute(link.href, currentRole);
  });

  const handleLogout = () => logout();

  return (
    <>
      <SidebarHeader className="h-16 flex justify-center border-b bg-white">
        <div className="flex items-center gap-2.5 px-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-600 text-white shadow-lg shadow-blue-200">
            <MapPin className="h-5 w-5" />
          </div>
          <div className="flex flex-col">
            <span className="text-sm font-black text-slate-900 leading-none">TIBBIYOT GIS</span>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter mt-1">Admin Panel</span>
          </div>
        </div>
      </SidebarHeader>

      <SidebarContent className="bg-white px-2 pt-4">
        <SidebarMenu>
          {filteredLinks.map((link) => (
            <SidebarMenuItem key={link.href}>
              <Link href={link.href}>
                <SidebarMenuButton
                  isActive={pathname.startsWith(link.href)}
                  tooltip={link.label}
                  className="rounded-xl h-11 px-3 data-[active=true]:bg-blue-50 data-[active=true]:text-blue-700 hover:bg-slate-50 transition-colors"
                >
                  <link.icon className={pathname.startsWith(link.href) ? "text-blue-600" : "text-slate-400"} />
                  <span className="font-semibold text-[13px]">{link.label}</span>
                </SidebarMenuButton>
              </Link>
            </SidebarMenuItem>
          ))}
        </SidebarMenu>
      </SidebarContent>

      <SidebarFooter className="bg-white p-4 border-t gap-4">
        <SidebarMenu>
          {currentRole === 'super_admin' && (
            <SidebarMenuItem>
              <Link href="/admin/settings">
                <SidebarMenuButton 
                  isActive={pathname === '/admin/settings'} 
                  tooltip="Sozlamalar"
                  className="rounded-xl h-10 px-3 data-[active=true]:bg-slate-100 hover:bg-slate-50"
                >
                  <Settings className="text-slate-400" />
                  <span className="font-semibold text-[13px]">Sozlamalar</span>
                </SidebarMenuButton>
              </Link>
            </SidebarMenuItem>
          )}
          <SidebarMenuItem>
            <SidebarMenuButton
              onClick={handleLogout}
              tooltip="Chiqish"
              className="rounded-xl h-10 px-3 text-red-500 hover:bg-red-50 hover:text-red-600 transition-colors"
            >
              <LogOut />
              <span className="font-semibold text-[13px]">Tizimdan chiqish</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
        
        <Separator className="bg-slate-100" />
        
        <Button variant="outline" asChild className="w-full rounded-xl border-slate-200 text-[11px] font-bold uppercase tracking-wider h-11 hover:bg-slate-50">
          <Link href="/">
            Jamoat portali
            <ExternalLink className="ml-2 h-3.5 w-3.5" />
          </Link>
        </Button>
      </SidebarFooter>
    </>
  );
}
