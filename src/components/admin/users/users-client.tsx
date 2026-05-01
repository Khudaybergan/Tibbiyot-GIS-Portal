'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import {
  UserPlus, Search, ShieldPlus, UserX, UserCheck,
  MoreHorizontal, X, Crown, Shield, CheckSquare, Building,
  UserCircle, Eye, AlertTriangle, Copy, Check, KeyRound,
  Clock, Users, ShieldOff, Ban, Activity,
} from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { cn } from '@/lib/utils';
import { ROLE_CONFIGS, grantableRoles, type UserRole } from '@/lib/auth/roles';
import type { UserRow, InstitutionOption, PasswordResetRequest } from '@/app/admin/users/page';
import {
  inviteUser, grantRole, revokeRole, setUserActive,
  generatePasswordResetLink, rejectPasswordResetRequest,
  generateDirectResetLink,
} from '@/app/admin/users/actions';

const ROLE_ICONS: Record<UserRole, React.ElementType> = {
  super_admin: Crown, admin: Shield, moderator: CheckSquare,
  operator: UserCircle, institution_director: Building, viewer: Eye,
};

// Role badge colors — richer palette, distinct per role
const ROLE_BADGE: Record<UserRole, string> = {
  super_admin:          'bg-rose-100 text-rose-700 border-rose-200',
  admin:                'bg-blue-100 text-blue-700 border-blue-200',
  moderator:            'bg-violet-100 text-violet-700 border-violet-200',
  operator:             'bg-amber-100 text-amber-700 border-amber-200',
  institution_director: 'bg-teal-100 text-teal-700 border-teal-200',
  viewer:               'bg-slate-100 text-slate-600 border-slate-200',
};

interface Props {
  users: UserRow[];
  institutions: InstitutionOption[];
  resetRequests: PasswordResetRequest[];
  stats: { total: number; active: number; blocked: number; withRoles: number; pendingResets: number };
  currentRole: UserRole;
}

function relativeTime(dateStr: string | null): string {
  if (!dateStr) return 'Hech qachon';
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Hozirgina';
  if (mins < 60) return `${mins} daqiqa oldin`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours} soat oldin`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days} kun oldin`;
  const months = Math.floor(days / 30);
  return `${months} oy oldin`;
}

export function UsersClient({ users, institutions, resetRequests, stats, currentRole }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [search, setSearch] = useState('');
  const [tab, setTab] = useState<'all' | 'active' | 'blocked'>('all');
  const [globalError, setGlobalError] = useState<string | null>(null);

  // Invite dialog
  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteRoles, setInviteRoles] = useState<UserRole[]>([]);
  const [inviteInstitution, setInviteInstitution] = useState<Record<string, string>>({});
  const [inviteLink, setInviteLink] = useState<string | null>(null);
  const [inviteError, setInviteError] = useState<string | null>(null);
  const [linkCopied, setLinkCopied] = useState(false);

  // Grant role dialog
  const [grantTarget, setGrantTarget] = useState<UserRow | null>(null);
  const [grantRoleVal, setGrantRoleVal] = useState<UserRole>('viewer');
  const [grantInstitution, setGrantInstitution] = useState('');
  const [grantError, setGrantError] = useState<string | null>(null);

  // Block dialog
  const [blockTarget, setBlockTarget] = useState<UserRow | null>(null);

  // Reset link dialog
  const [resetLinkResult, setResetLinkResult] = useState<string | null>(null);
  const [resetLinkCopied, setResetLinkCopied] = useState(false);

  const canGrant = grantableRoles(currentRole);
  const refresh = () => startTransition(() => router.refresh());

  const copyToClipboard = async (text: string, onCopied: (v: boolean) => void) => {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      // Fallback for browsers that block clipboard outside user gesture
      const el = document.createElement('textarea');
      el.value = text;
      el.style.position = 'fixed';
      el.style.opacity = '0';
      document.body.appendChild(el);
      el.select();
      document.execCommand('copy');
      document.body.removeChild(el);
    }
    onCopied(true);
    setTimeout(() => onCopied(false), 2000);
  };

  const filtered = users.filter((u) => {
    if (tab === 'active' && !u.is_active) return false;
    if (tab === 'blocked' && u.is_active) return false;
    if (search) {
      const q = search.toLowerCase();
      return u.email.toLowerCase().includes(q) || (u.full_name?.toLowerCase().includes(q) ?? false);
    }
    return true;
  });

  async function handleInvite(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setInviteError(null);
    const fd = new FormData(e.currentTarget);
    inviteRoles.forEach((r) => fd.append('roles', r));
    Object.entries(inviteInstitution).forEach(([role, instId]) => {
      fd.set(`institution_${role}`, instId);
    });
    const res = await inviteUser(fd);
    if (res.error) { setInviteError(res.error); return; }
    const link = res.inviteLink ?? null;
    setInviteLink(link);
    if (link) await copyToClipboard(link, setLinkCopied);
    refresh();
  }

  function closeInviteDialog() {
    setInviteOpen(false);
    setInviteLink(null);
    setInviteError(null);
    setInviteRoles([]);
    setInviteInstitution({});
    setLinkCopied(false);
  }

  async function handleGrantRole(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setGrantError(null);
    if (!grantTarget) return;
    const fd = new FormData(e.currentTarget);
    fd.set('user_id', grantTarget.id);
    const res = await grantRole(fd);
    if (res.error) { setGrantError(res.error); return; }
    setGrantTarget(null);
    refresh();
  }

  async function handleRevoke(roleRowId: string) {
    const fd = new FormData();
    fd.set('role_row_id', roleRowId);
    const res = await revokeRole(fd);
    if (res.error) setGlobalError(res.error);
    else refresh();
  }

  async function handleToggleActive(user: UserRow, makeActive: boolean) {
    setBlockTarget(null);
    const fd = new FormData();
    fd.set('user_id', user.id);
    fd.set('make_active', String(makeActive));
    const res = await setUserActive(fd);
    if (res.error) setGlobalError(res.error);
    else refresh();
  }

  async function handleGenerateResetLink(requestId: string) {
    const fd = new FormData();
    fd.set('request_id', requestId);
    const res = await generatePasswordResetLink(fd);
    if (res.error) { setGlobalError(res.error); return; }
    const link = res.resetLink ?? null;
    setResetLinkResult(link);
    if (link) await copyToClipboard(link, setResetLinkCopied);
    refresh();
  }

  async function handleDirectResetLink(user: UserRow) {
    const fd = new FormData();
    fd.set('user_id', user.id);
    fd.set('email', user.email);
    const res = await generateDirectResetLink(fd);
    if (res.error) { setGlobalError(res.error); return; }
    const link = res.resetLink ?? null;
    setResetLinkResult(link);
    if (link) await copyToClipboard(link, setResetLinkCopied);
  }

  async function handleRejectResetRequest(requestId: string) {
    const fd = new FormData();
    fd.set('request_id', requestId);
    const res = await rejectPasswordResetRequest(fd);
    if (res.error) setGlobalError(res.error);
    else refresh();
  }

  const pendingResets = resetRequests.filter((r) => r.status === 'pending');

  return (
    <>
      {/* ── Stats ──────────────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        <StatCard
          icon={<Users className="h-5 w-5" />}
          label="Jami foydalanuvchi"
          value={stats.total}
          iconBg="bg-slate-100"
          iconColor="text-slate-600"
          valueColor="text-slate-800"
        />
        <StatCard
          icon={<Activity className="h-5 w-5" />}
          label="Faol"
          value={stats.active}
          iconBg="bg-emerald-100"
          iconColor="text-emerald-600"
          valueColor="text-emerald-700"
        />
        <StatCard
          icon={<Ban className="h-5 w-5" />}
          label="Bloklangan"
          value={stats.blocked}
          iconBg="bg-red-100"
          iconColor="text-red-600"
          valueColor="text-red-700"
        />
        <StatCard
          icon={<ShieldOff className="h-5 w-5" />}
          label="Rol berilgan"
          value={stats.withRoles}
          iconBg="bg-blue-100"
          iconColor="text-blue-600"
          valueColor="text-blue-700"
        />
        <StatCard
          icon={<KeyRound className="h-5 w-5" />}
          label="Parol so'rovi"
          value={stats.pendingResets}
          iconBg="bg-amber-100"
          iconColor="text-amber-600"
          valueColor={stats.pendingResets > 0 ? 'text-amber-700' : 'text-slate-400'}
          highlight={stats.pendingResets > 0}
        />
      </div>

      {/* ── Password Reset Requests ────────────────────────────────────────────── */}
      {pendingResets.length > 0 && (
        <Card className="border-amber-200 bg-gradient-to-br from-amber-50 to-orange-50/40">
          <CardHeader className="pb-3 pt-5 px-5">
            <div className="flex items-center gap-2.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-100">
                <KeyRound className="h-4 w-4 text-amber-600" />
              </div>
              <div>
                <CardTitle className="text-sm font-bold text-amber-900">
                  Kutilayotgan parol tiklash so&apos;rovlari — {pendingResets.length} ta
                </CardTitle>
                <CardDescription className="text-xs text-amber-700 mt-0.5">
                  Havola yarating va foydalanuvchiga yuboring. Tizim email yubormaydi.
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="px-5 pb-5">
            <div className="space-y-2">
              {pendingResets.map((req) => (
                <div
                  key={req.id}
                  className="flex items-center justify-between gap-4 rounded-xl bg-white border border-amber-100 shadow-sm px-4 py-3"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-amber-100 text-amber-700 text-xs font-bold">
                      {req.email[0].toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-slate-800 truncate">{req.email}</p>
                      <p className="text-xs text-slate-400 flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {relativeTime(req.requested_at)} so&apos;rov yuborilgan
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Button
                      size="sm"
                      className="h-8 text-xs gap-1.5 bg-blue-600 hover:bg-blue-700 text-white shadow-sm"
                      onClick={() => handleGenerateResetLink(req.id)}
                      disabled={isPending}
                    >
                      <KeyRound className="h-3.5 w-3.5" />
                      Havola yaratish
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-8 text-xs border-red-300 text-red-600 hover:bg-red-50 hover:border-red-400 bg-white"
                      onClick={() => handleRejectResetRequest(req.id)}
                      disabled={isPending}
                    >
                      Rad etish
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* ── Global error ───────────────────────────────────────────────────────── */}
      {globalError && (
        <div className="flex items-center gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          <span className="flex-1">{globalError}</span>
          <button onClick={() => setGlobalError(null)} className="shrink-0 rounded hover:bg-red-100 p-0.5">
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* ── Toolbar ────────────────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
        <div className="flex gap-3 flex-1 flex-wrap items-center">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input
              placeholder="Ism yoki email bo'yicha qidiring…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 w-72 bg-white border-slate-200"
            />
          </div>
          <Tabs value={tab} onValueChange={(v) => setTab(v as typeof tab)}>
            <TabsList className="h-9 bg-slate-100">
              <TabsTrigger value="all" className="text-xs px-3">
                Barchasi <span className="ml-1 rounded-full bg-white px-1.5 py-0.5 text-[10px] font-bold text-slate-600 shadow-sm">{stats.total}</span>
              </TabsTrigger>
              <TabsTrigger value="active" className="text-xs px-3">
                Faol <span className="ml-1 rounded-full bg-white px-1.5 py-0.5 text-[10px] font-bold text-emerald-600 shadow-sm">{stats.active}</span>
              </TabsTrigger>
              <TabsTrigger value="blocked" className="text-xs px-3">
                Bloklangan <span className="ml-1 rounded-full bg-white px-1.5 py-0.5 text-[10px] font-bold text-red-500 shadow-sm">{stats.blocked}</span>
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
        {canGrant.length > 0 && (
          <Button onClick={() => setInviteOpen(true)} className="gap-2 shrink-0 shadow-sm">
            <UserPlus className="h-4 w-4" />
            Foydalanuvchi qo&apos;shish
          </Button>
        )}
      </div>

      {/* ── Users Table ────────────────────────────────────────────────────────── */}
      <Card className="border-slate-200 shadow-sm overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-slate-50/80 hover:bg-slate-50/80 border-b border-slate-200">
              <TableHead className="w-[280px] pl-5 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
                Foydalanuvchi
              </TableHead>
              <TableHead className="py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
                Rollar
              </TableHead>
              <TableHead className="w-40 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
                So&apos;nggi kirish
              </TableHead>
              <TableHead className="w-28 text-center py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
                Holat
              </TableHead>
              <TableHead className="w-10 pr-4" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="py-20 text-center">
                  <div className="flex flex-col items-center gap-3 text-slate-400">
                    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-slate-100">
                      <Users className="h-6 w-6" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-slate-500">
                        {search ? 'Foydalanuvchilar topilmadi' : 'Foydalanuvchilar yo\'q'}
                      </p>
                      <p className="text-xs text-slate-400 mt-0.5">
                        {search ? 'Boshqa kalit so\'z bilan qidiring' : 'Yangi foydalanuvchi qo\'shish uchun yuqoridagi tugmani bosing'}
                      </p>
                    </div>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((user) => (
                <UserTableRow
                  key={user.id}
                  user={user}
                  currentRole={currentRole}
                  isPending={isPending}
                  canGrant={canGrant}
                  onGrantRole={() => {
                    setGrantRoleVal(canGrant[0] ?? 'viewer');
                    setGrantInstitution('');
                    setGrantError(null);
                    setGrantTarget(user);
                  }}
                  onRevokeRole={handleRevoke}
                  onBlock={() => setBlockTarget(user)}
                  onUnblock={() => handleToggleActive(user, true)}
                  onDirectResetLink={() => handleDirectResetLink(user)}
                />
              ))
            )}
          </TableBody>
        </Table>
      </Card>

      {/* ── Invite Dialog ──────────────────────────────────────────────────────── */}
      <Dialog open={inviteOpen} onOpenChange={(o) => { if (!o) closeInviteDialog(); }}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <UserPlus className="h-5 w-5 text-blue-600" />
              Yangi foydalanuvchi qo&apos;shish
            </DialogTitle>
            <DialogDescription>
              Akkaunt yaratiladi va bir martalik parol o&apos;rnatish havolasi siz tomondan yubori­ladi — tizim email junatmaydi.
            </DialogDescription>
          </DialogHeader>

          {inviteLink ? (
            <div className="space-y-4">
              <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 space-y-1.5">
                <div className="flex items-center gap-2">
                  <div className="h-5 w-5 rounded-full bg-emerald-500 flex items-center justify-center">
                    <Check className="h-3 w-3 text-white" />
                  </div>
                  <p className="text-sm font-semibold text-emerald-800">Akkaunt yaratildi — havola nusxalandi!</p>
                </div>
                <p className="text-xs text-emerald-700 pl-7">
                  Havola buferga <strong>avtomatik nusxalandi</strong>. Foydalanuvchiga yuboring. Havola <strong>bir marta</strong> ishlatiladi va 24 soatdan keyin eskiradi.
                </p>
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-semibold text-slate-600 uppercase tracking-wide">
                  Bir martalik parol o&apos;rnatish havolasi
                </Label>
                <div className="flex gap-2">
                  <Input
                    value={inviteLink}
                    readOnly
                    className="text-xs font-mono bg-slate-50 border-slate-200"
                    onClick={(e) => (e.target as HTMLInputElement).select()}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    onClick={() => copyToClipboard(inviteLink, setLinkCopied)}
                    className="shrink-0"
                  >
                    {linkCopied ? <Check className="h-4 w-4 text-emerald-600" /> : <Copy className="h-4 w-4" />}
                  </Button>
                </div>
                <p className="text-xs text-amber-600 font-medium">
                  ⚠ Bu havola faqat bir marta ko&apos;rsatiladi. Nusxa oling va foydalanuvchiga yuboring.
                </p>
              </div>
              <DialogFooter>
                <Button onClick={closeInviteDialog} className="w-full">
                  Yopish
                </Button>
              </DialogFooter>
            </div>
          ) : (
            <form onSubmit={handleInvite} className="space-y-5">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="full_name" className="text-xs font-semibold">Ism Familiya</Label>
                  <Input id="full_name" name="full_name" placeholder="Alisher Navoiy" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email" className="text-xs font-semibold">
                    Email <span className="text-red-500">*</span>
                  </Label>
                  <Input id="email" name="email" type="email" placeholder="user@example.com" required />
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-xs font-semibold">Rollar (birdan ko&apos;p tanlash mumkin)</Label>
                <div className="space-y-1.5 rounded-xl border border-slate-200 p-3 bg-slate-50/60">
                  {canGrant.map((role) => {
                    const Icon = ROLE_ICONS[role];
                    const cfg = ROLE_CONFIGS[role];
                    const checked = inviteRoles.includes(role);
                    return (
                      <div key={role} className="space-y-2">
                        <label
                          htmlFor={`invite_role_${role}`}
                          className={cn(
                            'flex items-center gap-3 cursor-pointer rounded-lg px-3 py-2 transition-colors',
                            checked ? 'bg-blue-50 border border-blue-200' : 'hover:bg-white border border-transparent',
                          )}
                        >
                          <Checkbox
                            id={`invite_role_${role}`}
                            checked={checked}
                            onCheckedChange={(v) => {
                              setInviteRoles((prev) =>
                                v ? [...prev, role] : prev.filter((r) => r !== role),
                              );
                              if (!v) {
                                setInviteInstitution((prev) => {
                                  const n = { ...prev };
                                  delete n[role];
                                  return n;
                                });
                              }
                            }}
                          />
                          <span className={cn(
                            'flex items-center gap-1.5 text-[11px] font-bold px-2 py-0.5 rounded-md border',
                            ROLE_BADGE[role],
                          )}>
                            <Icon className="h-3 w-3" />
                            {cfg.label}
                          </span>
                          <span className="text-xs text-slate-400 flex-1">{cfg.description}</span>
                        </label>
                        {checked && role === 'institution_director' && (
                          <div className="ml-10 pr-3">
                            <Select
                              value={inviteInstitution[role] ?? ''}
                              onValueChange={(v) =>
                                setInviteInstitution((prev) => ({ ...prev, [role]: v }))
                              }
                            >
                              <SelectTrigger className="h-8 text-xs">
                                <SelectValue placeholder="Muassasani tanlang…" />
                              </SelectTrigger>
                              <SelectContent className="max-h-48">
                                {institutions.map((inst) => (
                                  <SelectItem key={inst.id} value={inst.id} className="text-xs">
                                    {inst.name}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
                <p className="text-xs text-slate-400">Faqat o&apos;zingizdan past darajadagi rollar ko&apos;rsatilmoqda.</p>
              </div>

              {inviteError && (
                <div className="rounded-lg bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-700">
                  {inviteError}
                </div>
              )}

              <DialogFooter>
                <Button type="button" variant="outline" onClick={closeInviteDialog}>Bekor</Button>
                <Button type="submit" disabled={isPending}>
                  <UserPlus className="mr-2 h-4 w-4" />
                  Yaratish va havola olish
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>

      {/* ── Grant Role Dialog ──────────────────────────────────────────────────── */}
      <Dialog open={!!grantTarget} onOpenChange={(o) => !o && setGrantTarget(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ShieldPlus className="h-5 w-5 text-blue-600" />
              Rol berish
            </DialogTitle>
            <DialogDescription>
              <strong>{grantTarget?.full_name ?? grantTarget?.email}</strong> foydalanuvchisiga yangi rol qo&apos;shing.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleGrantRole} className="space-y-4">
            <div className="space-y-2">
              <Label className="text-xs font-semibold">Rol</Label>
              <Select name="role" value={grantRoleVal} onValueChange={(v) => {
                setGrantRoleVal(v as UserRole);
                setGrantInstitution('');
              }}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {canGrant.map((r) => {
                    const Icon = ROLE_ICONS[r];
                    return (
                      <SelectItem key={r} value={r}>
                        <div className="flex items-center gap-2">
                          <Icon className="h-4 w-4" />
                          <span>{ROLE_CONFIGS[r].label}</span>
                        </div>
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
              <p className="text-xs text-slate-400">{ROLE_CONFIGS[grantRoleVal]?.description}</p>
            </div>

            {grantRoleVal === 'institution_director' && (
              <div className="space-y-2">
                <Label className="text-xs font-semibold">
                  Muassasa <span className="text-red-500">*</span>
                </Label>
                <Select
                  name="institution_id"
                  value={grantInstitution}
                  onValueChange={setGrantInstitution}
                  required
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Muassasani tanlang…" />
                  </SelectTrigger>
                  <SelectContent className="max-h-60">
                    {institutions.map((inst) => (
                      <SelectItem key={inst.id} value={inst.id}>{inst.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {grantError && (
              <div className="rounded-lg bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-700">
                {grantError}
              </div>
            )}

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setGrantTarget(null)}>Bekor</Button>
              <Button
                type="submit"
                disabled={isPending || (grantRoleVal === 'institution_director' && !grantInstitution)}
              >
                <ShieldPlus className="mr-2 h-4 w-4" />
                Berish
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ── Block Confirm ──────────────────────────────────────────────────────── */}
      <AlertDialog open={!!blockTarget} onOpenChange={(o) => !o && setBlockTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-red-700">
              <Ban className="h-5 w-5" />
              Foydalanuvchini bloklash
            </AlertDialogTitle>
            <AlertDialogDescription>
              <strong>{blockTarget?.full_name ?? blockTarget?.email}</strong> tizimdan chiqariladi va barcha aktiv sessiyalari <strong>darhol</strong> tugatiladi.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Bekor</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 hover:bg-red-700 focus:ring-red-600"
              onClick={() => blockTarget && handleToggleActive(blockTarget, false)}
            >
              <Ban className="mr-2 h-4 w-4" />
              Bloklash
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* ── Reset Link Result Dialog ───────────────────────────────────────────── */}
      <Dialog open={!!resetLinkResult} onOpenChange={(o) => { if (!o) { setResetLinkResult(null); setResetLinkCopied(false); } }}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <KeyRound className="h-5 w-5 text-amber-600" />
              Parol tiklash havolasi tayyor — nusxalandi!
            </DialogTitle>
            <DialogDescription>
              Havola buferga <strong>avtomatik nusxalandi</strong>. Foydalanuvchiga yuboring. Havola <strong>bir marta</strong> ishlatiladi va 1 soatdan keyin eskiradi.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="flex gap-2">
              <Input
                value={resetLinkResult ?? ''}
                readOnly
                className="text-xs font-mono bg-slate-50"
                onClick={(e) => (e.target as HTMLInputElement).select()}
              />
              <Button
                type="button"
                variant="outline"
                size="icon"
                className="shrink-0"
                onClick={() => resetLinkResult && copyToClipboard(resetLinkResult, setResetLinkCopied)}
              >
                {resetLinkCopied ? <Check className="h-4 w-4 text-emerald-600" /> : <Copy className="h-4 w-4" />}
              </Button>
            </div>
            <p className="text-xs text-slate-500 flex items-center gap-1.5">
              <Clock className="h-3.5 w-3.5 shrink-0" />
              Havola 1 soat ichida yaroqsiz bo&apos;ladi. Foydalanuvchiga imkon qadar tezroq yuboring.
            </p>
          </div>
          <DialogFooter>
            <Button className="w-full" onClick={() => { setResetLinkResult(null); setResetLinkCopied(false); }}>
              Yopish
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

// ─────────────────────────────────────────────────────────────────────────────

interface StatCardProps {
  icon: React.ReactNode;
  label: string;
  value: number;
  iconBg: string;
  iconColor: string;
  valueColor: string;
  highlight?: boolean;
}

function StatCard({ icon, label, value, iconBg, iconColor, valueColor, highlight }: StatCardProps) {
  return (
    <Card className={cn(
      'border transition-shadow hover:shadow-md',
      highlight ? 'border-amber-200 bg-amber-50/30' : 'border-slate-200',
    )}>
      <CardContent className="px-4 py-4">
        <div className="flex items-start justify-between gap-2">
          <div className={cn('flex h-9 w-9 shrink-0 items-center justify-center rounded-lg', iconBg, iconColor)}>
            {icon}
          </div>
          <span className={cn('text-3xl font-black tabular-nums leading-none mt-0.5', valueColor)}>
            {value}
          </span>
        </div>
        <p className="mt-2 text-xs font-medium text-slate-500 leading-tight">{label}</p>
      </CardContent>
    </Card>
  );
}

// ─────────────────────────────────────────────────────────────────────────────

interface RowProps {
  user: UserRow;
  currentRole: UserRole;
  canGrant: UserRole[];
  isPending: boolean;
  onGrantRole: () => void;
  onRevokeRole: (id: string) => void;
  onBlock: () => void;
  onUnblock: () => void;
  onDirectResetLink: () => void;
}

function UserTableRow({ user, canGrant, isPending, onGrantRole, onRevokeRole, onBlock, onUnblock, onDirectResetLink }: RowProps) {
  const initials = (user.full_name ?? user.email)
    .split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2);

  return (
    <TableRow className={cn(
      'group border-b border-slate-100 transition-colors',
      !user.is_active && 'bg-red-50/30 hover:bg-red-50/50',
    )}>
      {/* User info */}
      <TableCell className="pl-5 py-3.5">
        <div className="flex items-center gap-3">
          <div className="relative shrink-0">
            <Avatar className="h-9 w-9">
              {user.avatar_url && <AvatarImage src={user.avatar_url} alt={user.full_name ?? ''} />}
              <AvatarFallback className={cn(
                'text-xs font-bold',
                user.is_active ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-400',
              )}>
                {initials}
              </AvatarFallback>
            </Avatar>
            {/* Status dot */}
            <span className={cn(
              'absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-white',
              user.is_active ? 'bg-emerald-500' : 'bg-red-400',
            )} />
          </div>
          <div className="min-w-0">
            <p className={cn(
              'text-sm font-semibold truncate',
              user.is_active ? 'text-slate-900' : 'text-slate-400',
            )}>
              {user.full_name ?? <span className="font-normal italic text-slate-400">Ism yo&apos;q</span>}
            </p>
            <p className="text-xs text-slate-400 truncate">{user.email}</p>
          </div>
        </div>
      </TableCell>

      {/* Roles */}
      <TableCell className="py-3.5">
        <div className="flex flex-wrap gap-1.5 items-center">
          {user.roles.length === 0 ? (
            <span className="text-xs text-slate-300 italic">Rol yo&apos;q</span>
          ) : (
            user.roles.map((ra) => {
              const Icon = ROLE_ICONS[ra.role];
              const canRevoke = canGrant.includes(ra.role);
              return (
                <span
                  key={ra.id}
                  className={cn(
                    'inline-flex items-center gap-1 pl-2 pr-1 py-0.5 rounded-md text-[11px] font-semibold border',
                    ROLE_BADGE[ra.role],
                  )}
                >
                  <Icon className="h-3 w-3 shrink-0" />
                  {ROLE_CONFIGS[ra.role].label}
                  {ra.institution_name && (
                    <span className="opacity-60 font-normal ml-0.5">({ra.institution_name})</span>
                  )}
                  {canRevoke && (
                    <button
                      onClick={() => onRevokeRole(ra.id)}
                      disabled={isPending}
                      title="Rolni olib tashlash"
                      className="ml-0.5 rounded-sm hover:bg-black/10 p-0.5 transition-colors disabled:opacity-50"
                    >
                      <X className="h-2.5 w-2.5" />
                    </button>
                  )}
                </span>
              );
            })
          )}
          {canGrant.length > 0 && (
            <button
              onClick={onGrantRole}
              disabled={isPending}
              title="Yangi rol berish"
              className="inline-flex items-center justify-center h-5 w-5 rounded-md border border-dashed border-slate-300 text-slate-400 hover:border-blue-500 hover:text-blue-600 hover:bg-blue-50 transition-colors disabled:opacity-50"
            >
              <ShieldPlus className="h-3 w-3" />
            </button>
          )}
        </div>
      </TableCell>

      {/* Last sign in */}
      <TableCell className="py-3.5">
        <span className="text-xs text-slate-400">{relativeTime(user.last_sign_in_at)}</span>
      </TableCell>

      {/* Status */}
      <TableCell className="text-center py-3.5">
        <Badge
          variant="outline"
          className={cn(
            'text-[10px] font-bold uppercase tracking-wide border-none px-2',
            user.is_active
              ? 'bg-emerald-100 text-emerald-700'
              : 'bg-red-100 text-red-600',
          )}
        >
          {user.is_active ? 'Faol' : 'Bloklangan'}
        </Badge>
      </TableCell>

      {/* Actions */}
      <TableCell className="pr-4 py-3.5">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity"
            >
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-52">
            {canGrant.length > 0 && (
              <DropdownMenuItem onClick={onGrantRole}>
                <ShieldPlus className="mr-2 h-4 w-4 text-blue-600" />
                Rol berish
              </DropdownMenuItem>
            )}
            <DropdownMenuItem onClick={onDirectResetLink} disabled={isPending}>
              <KeyRound className="mr-2 h-4 w-4 text-amber-600" />
              Parol tiklash havolasi
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            {user.is_active ? (
              <DropdownMenuItem
                onClick={onBlock}
                className="text-red-600 focus:text-red-600 focus:bg-red-50"
              >
                <Ban className="mr-2 h-4 w-4" />
                Bloklash
              </DropdownMenuItem>
            ) : (
              <DropdownMenuItem
                onClick={onUnblock}
                className="text-emerald-600 focus:text-emerald-600 focus:bg-emerald-50"
              >
                <UserCheck className="mr-2 h-4 w-4" />
                Blokdan chiqarish
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </TableCell>
    </TableRow>
  );
}
