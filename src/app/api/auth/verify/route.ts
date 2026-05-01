import { NextResponse, type NextRequest } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import type { EmailOtpType } from '@supabase/supabase-js';

/**
 * GET /api/auth/verify?token=...&type=invite|recovery&email=...
 *
 * Used instead of Supabase's own redirect mechanism (which requires the
 * redirect URL to be whitelisted in the Supabase dashboard).
 * The admin copies this link and sends it to the user manually.
 *
 * Flow:
 *   1. User clicks the link → this handler is called
 *   2. We call supabase.auth.verifyOtp() to validate the one-time token
 *   3. Supabase creates a session and sets it in HttpOnly cookies
 *   4. We redirect the user to /set-password
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const token = searchParams.get('token');
  const type  = searchParams.get('type') as EmailOtpType | null;
  const email = searchParams.get('email');
  const origin = new URL(request.url).origin;

  const toLoginError = (msg: string) =>
    NextResponse.redirect(`${origin}/login?error=${encodeURIComponent(msg)}`);

  if (!token || !type || !email) {
    return toLoginError("Havola parametrlari noto'g'ri");
  }

  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options);
          });
        },
      },
    },
  );

  const { error } = await supabase.auth.verifyOtp({ email, token, type });

  if (error) {
    return toLoginError("Havola yaroqsiz yoki muddati tugagan. Administrator bilan bog'laning.");
  }

  // Both invite and recovery flows need the user to set a new password.
  return NextResponse.redirect(`${origin}/set-password`);
}
