import { type NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getUserRoles } from '@/lib/auth/get-user-roles';
import { ROLE_DEFAULT_ROUTE, type UserRole } from '@/lib/auth/roles';

export async function POST(request: NextRequest) {
  const origin = new URL(request.url).origin;

  const formData = await request.formData();
  const role = formData.get('role') as UserRole | null;
  const next = (formData.get('next') as string | null) || null;

  if (!role) {
    return NextResponse.redirect(`${origin}/select-role`, { status: 303 });
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.redirect(`${origin}/login`, { status: 303 });
  }

  // Verify the submitted role is actually assigned to this user in the DB.
  const validRoles = await getUserRoles(user.id);
  if (!validRoles.includes(role)) {
    return NextResponse.redirect(`${origin}/select-role?error=unauthorized_role`, { status: 303 });
  }

  const destination = next && next.startsWith('/') ? next : ROLE_DEFAULT_ROUTE[role];

  const isProduction = process.env.NODE_ENV === 'production';

  const response = NextResponse.redirect(`${origin}${destination}`, { status: 303 });
  response.cookies.set('selected_role', role, {
    path: '/',
    httpOnly: false,
    sameSite: 'lax',
    secure: isProduction,
  });

  return response;
}
