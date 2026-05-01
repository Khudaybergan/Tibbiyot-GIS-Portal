import { redirect } from 'next/navigation';
import { Crown, Shield, CheckSquare, Building, UserCircle, Eye, MapPin, Syringe } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { createClient } from '@/lib/supabase/server';
import { ROLE_CONFIGS, UserRole } from '@/lib/auth/roles';
import { getUserRoles } from '@/lib/auth/get-user-roles';
import { cn } from '@/lib/utils';

const ROLE_ICONS: Record<UserRole, React.ElementType> = {
  super_admin:          Crown,
  admin:                Shield,
  moderator:            CheckSquare,
  operator:             UserCircle,
  institution_director: Building,
  viewer:               Eye,
};

export default async function SelectRolePage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const { next } = await searchParams;

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect('/login');

  const roles = await getUserRoles(user.id);

  if (roles.length === 0) {
    await supabase.auth.signOut();
    redirect('/login?error=Sizga%20hech%20qanday%20rol%20biriktirilmagan');
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 p-4">
      <div className="w-full max-w-5xl">
        <div className="mb-12 flex flex-col items-center text-center">
          <div className="mb-6 flex items-center justify-center gap-2 text-blue-600 bg-white p-4 rounded-3xl shadow-sm border border-slate-100">
            <Syringe className="h-8 w-8" />
            <div className="h-6 w-px bg-slate-200 mx-1" />
            <MapPin className="h-8 w-8" />
          </div>
          <h1 className="text-4xl font-black text-slate-900 tracking-tight">Rolni tanlang</h1>
          <p className="text-slate-500 mt-3 text-lg">
            Davom etish uchun mavjud rollardan birini tanlang.
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {roles.map((roleId) => {
            const config = ROLE_CONFIGS[roleId];
            const Icon = ROLE_ICONS[roleId];
            return (
              <form key={roleId} action="/api/auth/select-role" method="POST">
                <input type="hidden" name="role" value={roleId} />
                {next && <input type="hidden" name="next" value={next} />}
                <button
                  type="submit"
                  className="group w-full text-left transition-all hover:-translate-y-1"
                >
                  <Card className="h-full border-slate-200 group-hover:border-blue-500 group-hover:shadow-xl group-hover:shadow-blue-900/5 transition-all overflow-hidden relative">
                    <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                      <Icon className="h-24 w-24 -mr-8 -mt-8 rotate-12" />
                    </div>
                    <CardHeader className="relative z-10">
                      <div className={cn(
                        'mb-4 flex h-12 w-12 items-center justify-center rounded-2xl transition-colors',
                        'bg-slate-100 text-slate-600 group-hover:bg-blue-600 group-hover:text-white',
                      )}>
                        <Icon className="h-6 w-6" />
                      </div>
                      <CardTitle className="text-xl font-bold group-hover:text-blue-600 transition-colors">
                        {config.label}
                      </CardTitle>
                      <CardDescription className="mt-2 leading-relaxed">
                        {config.description}
                      </CardDescription>
                    </CardHeader>
                  </Card>
                </button>
              </form>
            );
          })}
        </div>

        <div className="mt-12 text-center">
          <p className="text-sm text-slate-400">
            Muammo yuzaga kelsa, texnik qo&apos;llab-quvvatlash xizmatiga murojaat qiling.
          </p>
        </div>
      </div>
    </div>
  );
}
