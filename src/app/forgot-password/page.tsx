import { redirect } from 'next/navigation';
import Link from 'next/link';
import { Mail, Syringe, MapPin, ArrowLeft, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { createPasswordResetRequest } from '@/app/admin/users/actions';

/**
 * Unauthenticated page. The user enters their email and submits a password
 * reset request. An admin reviews it and generates a one-time reset link,
 * which they send to the user manually.
 *
 * We never reveal whether the email exists (prevents enumeration).
 */
export default async function ForgotPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ submitted?: string }>;
}) {
  const { submitted } = await searchParams;

  async function submitRequest(formData: FormData) {
    'use server';
    // Always returns success (even if email doesn't exist) to prevent enumeration
    await createPasswordResetRequest(formData);
    redirect('/forgot-password?submitted=1');
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 p-4">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="mb-8 flex flex-col items-center text-center">
          <div className="mb-4 flex items-center justify-center gap-2 text-blue-600 bg-white p-4 rounded-3xl shadow-sm border border-slate-100">
            <Syringe className="h-7 w-7" />
            <div className="h-5 w-px bg-slate-200 mx-1" />
            <MapPin className="h-7 w-7" />
          </div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">Parolni unutdim</h1>
          <p className="text-slate-500 mt-2 text-sm">
            {submitted
              ? "So'rovingiz qabul qilindi"
              : 'Emailingizni kiriting — administrator parol tiklash havolasini yuboradi'}
          </p>
        </div>

        {submitted ? (
          // Success state
          <div className="space-y-6">
            <div className="rounded-2xl border border-blue-100 bg-blue-50 p-6 text-center space-y-3">
              <Clock className="h-10 w-10 text-blue-500 mx-auto" />
              <h2 className="font-bold text-slate-900">So&apos;rov yuborildi</h2>
              <p className="text-sm text-slate-600 leading-relaxed">
                Agar emailingiz tizimda ro&apos;yxatdan o&apos;tgan bo&apos;lsa, administrator
                72 soat ichida parol tiklash havolasini yuboradi.
              </p>
              <p className="text-xs text-slate-400">
                Havola bir marta ishlaydi va muddati tugagandan keyin yaroqsiz bo&apos;ladi.
              </p>
            </div>

            <Link href="/login">
              <Button variant="outline" className="w-full gap-2">
                <ArrowLeft className="h-4 w-4" />
                Kirish sahifasiga qaytish
              </Button>
            </Link>
          </div>
        ) : (
          // Request form
          <form action={submitRequest} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <Input
                  id="email"
                  name="email"
                  type="email"
                  placeholder="sizning@email.com"
                  className="pl-9"
                  required
                  autoFocus
                />
              </div>
            </div>

            <div className="rounded-lg border border-amber-100 bg-amber-50 px-4 py-3 text-xs text-amber-700 leading-relaxed">
              Parol tiklash avtomatik emas. Administrator so&apos;rovingizni ko&apos;rib
              chiqib, 72 soat ichida bir martalik havola yuboradi.
            </div>

            <Button type="submit" className="w-full">
              So&apos;rov yuborish
            </Button>

            <div className="text-center">
              <Link
                href="/login"
                className="text-sm text-slate-500 hover:text-slate-700 inline-flex items-center gap-1 transition-colors"
              >
                <ArrowLeft className="h-3.5 w-3.5" />
                Kirishga qaytish
              </Link>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
