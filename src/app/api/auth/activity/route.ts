import { NextResponse, type NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';

const INACTIVITY_MS = 30 * 60 * 1000;

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const now = Date.now();

  const lastActivityVal = request.cookies.get('session_last_activity')?.value;
  if (lastActivityVal) {
    const lastActivityMs = parseInt(lastActivityVal, 10);
    if (!isNaN(lastActivityMs) && now - lastActivityMs > INACTIVITY_MS) {
      return NextResponse.json({ error: 'session_expired' }, { status: 401 });
    }
  }

  const expiresAtVal = request.cookies.get('session_expires_at')?.value;
  if (expiresAtVal) {
    const expiresAt = parseInt(expiresAtVal, 10);
    if (!isNaN(expiresAt) && now > expiresAt) {
      return NextResponse.json({ error: 'session_expired' }, { status: 401 });
    }
  }

  const response = NextResponse.json({ ok: true });
  response.cookies.set('session_last_activity', now.toString(), {
    path: '/',
    httpOnly: false,
    sameSite: 'lax',
    maxAge: 28800,
  });

  return response;
}
