'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Eye, EyeOff, KeyRound, Syringe, MapPin, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { createClient } from '@/lib/supabase/client';
import { cn } from '@/lib/utils';
import { activateCurrentUser } from './actions';

/**
 * Password setup page — reached after opening an invite or recovery link.
 * The /auth/callback route handler already exchanged the one-time code for
 * a session via cookies. Here the user just sets their new password.
 *
 * Security rules enforced here:
 *  - Admin never sets or sees the password
 *  - Password is set directly by the user via supabase.auth.updateUser()
 *  - After success, session is signed out — user must log in normally
 */
export default function SetPasswordPage() {
  const router = useRouter();
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const passwordStrength = getPasswordStrength(password);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (password.length < 8) {
      setError("Parol kamida 8 ta belgidan iborat bo'lishi kerak");
      return;
    }
    if (password !== confirm) {
      setError('Parollar mos kelmadi');
      return;
    }
    if (passwordStrength === 'weak') {
      setError('Parol juda oddiy. Harf, raqam va belgilar qo\'shing');
      return;
    }

    setLoading(true);
    const supabase = createClient();
    const { error: updateError } = await supabase.auth.updateUser({ password });

    if (updateError) {
      // Common case: session expired (link used twice or too much time passed)
      if (updateError.message.includes('session') || updateError.message.includes('token')) {
        setError('Sessiya yaroqsiz yoki muddati tugagan. Administrator bilan bog\'laning.');
      } else {
        setError(updateError.message);
      }
      setLoading(false);
      return;
    }

    // Activate the account (was set inactive at invite creation time)
    await activateCurrentUser();

    // Sign out the temp session — user must log in with the new password
    await supabase.auth.signOut();
    setDone(true);

    setTimeout(() => {
      router.push('/login?success=Parol+muvaffaqiyatli+o%27rnatildi');
    }, 2000);
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
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">
            {done ? 'Bajarildi!' : 'Parol o\'rnatish'}
          </h1>
          <p className="text-slate-500 mt-2 text-sm">
            {done
              ? 'Parolingiz o\'rnatildi. Kirish sahifasiga yo\'naltirilmoqda…'
              : 'Akkauntingiz uchun yangi parol yarating'}
          </p>
        </div>

        {done ? (
          <div className="flex flex-col items-center gap-3 text-emerald-600">
            <CheckCircle2 className="h-16 w-16" />
            <p className="text-sm font-semibold text-center text-emerald-700">
              Muvaffaqiyatli! Kirish sahifasiga o&apos;tmoqda…
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Password */}
            <div className="space-y-2">
              <Label htmlFor="password">Yangi parol</Label>
              <div className="relative">
                <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Kamida 8 ta belgi"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pl-9 pr-10"
                  required
                  autoFocus
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {/* Strength indicator */}
              {password.length > 0 && (
                <div className="space-y-1">
                  <div className="flex gap-1">
                    {(['weak', 'fair', 'strong'] as const).map((level, i) => (
                      <div
                        key={level}
                        className={cn(
                          'h-1.5 flex-1 rounded-full transition-colors',
                          strengthIndex(passwordStrength) > i
                            ? strengthColor(passwordStrength)
                            : 'bg-slate-100',
                        )}
                      />
                    ))}
                  </div>
                  <p className={cn('text-xs font-medium', strengthTextColor(passwordStrength))}>
                    {strengthLabel(passwordStrength)}
                  </p>
                </div>
              )}
            </div>

            {/* Confirm */}
            <div className="space-y-2">
              <Label htmlFor="confirm">Parolni tasdiqlang</Label>
              <div className="relative">
                <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <Input
                  id="confirm"
                  type={showConfirm ? 'text' : 'password'}
                  placeholder="Parolni qayta kiriting"
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  className={cn(
                    'pl-9 pr-10',
                    confirm.length > 0 && confirm !== password && 'border-red-300 focus-visible:ring-red-300',
                    confirm.length > 0 && confirm === password && 'border-emerald-300 focus-visible:ring-emerald-300',
                  )}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowConfirm((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  {showConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {confirm.length > 0 && confirm !== password && (
                <p className="text-xs text-red-500">Parollar mos kelmadi</p>
              )}
            </div>

            {error && (
              <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
                {error}
              </div>
            )}

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? 'Saqlanmoqda…' : 'Parolni saqlash'}
            </Button>
          </form>
        )}
      </div>
    </div>
  );
}

// ── Helpers ───────────────────────────────────────────────────────────────────

type Strength = 'weak' | 'fair' | 'strong';

function getPasswordStrength(password: string): Strength {
  if (password.length < 6) return 'weak';
  const hasLower = /[a-z]/.test(password);
  const hasUpper = /[A-Z]/.test(password);
  const hasDigit = /\d/.test(password);
  const hasSpecial = /[^a-zA-Z0-9]/.test(password);
  const score = [hasLower, hasUpper, hasDigit, hasSpecial, password.length >= 12].filter(Boolean).length;
  if (score >= 4) return 'strong';
  if (score >= 2) return 'fair';
  return 'weak';
}

function strengthIndex(s: Strength) { return { weak: 1, fair: 2, strong: 3 }[s]; }
function strengthColor(s: Strength) { return { weak: 'bg-red-400', fair: 'bg-amber-400', strong: 'bg-emerald-500' }[s]; }
function strengthTextColor(s: Strength) { return { weak: 'text-red-500', fair: 'text-amber-600', strong: 'text-emerald-600' }[s]; }
function strengthLabel(s: Strength) { return { weak: 'Zaif parol', fair: "O'rtacha parol", strong: 'Kuchli parol' }[s]; }
