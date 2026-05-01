import { NextResponse, type NextRequest } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

/**
 * Handles Supabase auth redirects:
 *   - Invite links  (?type=invite)  → redirect to /set-password
 *   - Recovery links(?type=recovery)→ redirect to /set-password
 *   - Email confirm (?type=signup)  → redirect to /admin/dashboard
 *
 * Supabase uses PKCE for security: the one-time `code` param is exchanged
 * server-side for a session, which is then stored in HttpOnly cookies.
 * After exchange, this handler redirects to the appropriate page.
 *
 * This route must be added to Supabase's "Allowed Redirect URLs" in:
 *   Dashboard → Authentication → URL Configuration → Redirect URLs
 *   Add: https://admin.medicalsdi.uz/auth/callback
 *   (and http://admin.localhost:9003/auth/callback for development)
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  const type = searchParams.get('type'); // 'invite' | 'recovery' | 'signup'

  if (code) {
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

    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (error) {
      // Expired or already-used link — send to login with an error message
      return NextResponse.redirect(
        `${origin}/login?error=${encodeURIComponent('Havola yaroqsiz yoki muddati tugagan')}`,
      );
    }
  }

  // For invite / recovery flows → must set a password
  if (type === 'invite' || type === 'recovery') {
    return NextResponse.redirect(`${origin}/set-password`);
  }

  // Default: go to dashboard (handles post-email-confirm flows)
  return NextResponse.redirect(`${origin}/admin/dashboard`);
}
