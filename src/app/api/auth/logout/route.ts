import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';
import { cookies } from 'next/headers';

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const reason = searchParams.get('reason') ?? 'manual';

  const cookieStore = await cookies();

  const redirectUrl = new URL('/login', request.url);

  if (reason === 'inactivity') {
    redirectUrl.searchParams.set(
      'error',
      'Faollik kuzatilmadi. Xavfsizlik sababli tizimdan chiqdingiz.',
    );
  } else if (reason === 'expired') {
    redirectUrl.searchParams.set('error', 'Sessiya muddati tugadi. Qayta kiring.');
  }
  // 'manual' → no error param

  const response = NextResponse.redirect(redirectUrl);

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
            response.cookies.set(name, value, options);
          });
        },
      },
    },
  );

  await supabase.auth.signOut();

  response.cookies.delete('selected_role');
  response.cookies.delete('session_last_activity');
  response.cookies.delete('session_expires_at');

  return response;
}
