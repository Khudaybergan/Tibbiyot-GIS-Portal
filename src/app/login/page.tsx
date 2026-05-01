import Link from 'next/link';
import { redirect } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { MapPin, Syringe } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import { getUserRoles } from '@/lib/auth/get-user-roles';
import { getPublicBaseUrl } from '@/lib/auth/domains';

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; error?: string; success?: string }>;
}) {
  const { next, error, success } = await searchParams;

  async function login(formData: FormData) {
    'use server';
    const email = formData.get('email') as string;
    const password = formData.get('password') as string;

    const supabase = await createClient();
    const { data, error: authError } = await supabase.auth.signInWithPassword({ email, password });

    if (authError || !data.user) {
      redirect(`/login?error=${encodeURIComponent(authError?.message ?? 'Kirish amalga oshmadi')}`);
    }

    const roles = await getUserRoles(data.user.id);

    if (roles.length === 0) {
      await supabase.auth.signOut();
      redirect('/login?error=Sizga%20hech%20qanday%20rol%20biriktirilmagan');
    }

    // Always go through role selection — even single-role users must confirm
    redirect(next ? `/select-role?next=${encodeURIComponent(next)}` : '/select-role');
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <div className="w-full max-w-md">
        <div className="mb-8 flex flex-col items-center text-center">
          <div className="mb-4 flex items-center justify-center gap-2 text-primary">
            <Syringe className="h-8 w-8" />
            <MapPin className="h-8 w-8" />
          </div>
          <h1 className="text-3xl font-bold text-foreground">Tibbiyot GIS Portal</h1>
          <p className="text-muted-foreground">Boshqaruv paneliga xush kelibsiz</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Kirish</CardTitle>
            <CardDescription>Tizimga kirish uchun ma&apos;lumotlaringizni kiriting.</CardDescription>
          </CardHeader>
          <CardContent>
            <form action={login} className="space-y-4">
              {success && (
                <div className="rounded-md bg-emerald-50 border border-emerald-200 px-4 py-3 text-sm text-emerald-700">
                  {decodeURIComponent(success)}
                </div>
              )}
              {error && (
                <div className="rounded-md bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
                  {decodeURIComponent(error)}
                </div>
              )}
              <div className="space-y-2">
                <Label htmlFor="email">Elektron pochta</Label>
                <Input id="email" name="email" type="email" placeholder="admin@gis.uz" required />
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="password">Parol</Label>
                  <Link
                    href="/forgot-password"
                    className="text-xs text-slate-500 hover:text-blue-600 transition-colors"
                  >
                    Parolni unutdim
                  </Link>
                </div>
                <Input id="password" name="password" type="password" required />
              </div>
              <Button type="submit" className="w-full">
                Kirish
              </Button>
            </form>
          </CardContent>
        </Card>

        <div className="mt-4 text-center text-sm">
          <a href={getPublicBaseUrl()} className="underline text-muted-foreground hover:text-primary">
            Jamoat xaritasiga qaytish
          </a>
        </div>
      </div>
    </div>
  );
}
