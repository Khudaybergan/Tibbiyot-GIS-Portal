import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { updateSession } from '@/lib/supabase/middleware';
import { canAccessRoute, UserRole } from '@/lib/auth/roles';
import { getUserRoles } from '@/lib/auth/get-user-roles';
import { isAdminHost, adminUrl } from '@/lib/auth/domains';

// ─────────────────────────────────────────────────────────────────────────────
// Session expiry constants
// ─────────────────────────────────────────────────────────────────────────────
const INACTIVITY_MS = 30 * 60 * 1000;
const ABSOLUTE_SESSION_MS = 8 * 60 * 60 * 1000;
const IS_PROD = process.env.NODE_ENV === 'production';

const SESSION_ACTIVITY_COOKIE = {
  name: 'session_last_activity',
  options: { path: '/', httpOnly: false, sameSite: 'lax' as const, secure: IS_PROD, maxAge: 28800 },
};
const SESSION_EXPIRES_COOKIE = {
  name: 'session_expires_at',
  options: { path: '/', httpOnly: true, sameSite: 'lax' as const, secure: IS_PROD, maxAge: 28800 },
};

export async function middleware(request: NextRequest) {
  const host     = request.headers.get('host') ?? '';
  const pathname = request.nextUrl.pathname;

  return isAdminHost(host)
    ? handleAdminSubdomain(request, pathname)
    : handlePublicDomain(request, pathname);
}

// ─────────────────────────────────────────────────────────────────────────────
// PUBLIC DOMAIN  (medicalsdi.uz)
// Serve public GIS portal.  Block every admin/auth path — redirect to admin
// subdomain so there is no ambiguity about which app owns those routes.
// ─────────────────────────────────────────────────────────────────────────────
function handlePublicDomain(request: NextRequest, pathname: string): NextResponse {
  const ADMIN_PATHS = ['/admin', '/institution', '/login', '/select-role', '/set-password', '/forgot-password', '/auth'];
  const shouldRedirectToAdmin = ADMIN_PATHS.some(p => pathname === p || pathname.startsWith(`${p}/`));

  if (shouldRedirectToAdmin) {
    // Hard redirect — preserve pathname + query so deep links work
    const dest = new URL(adminUrl(pathname));
    dest.search = request.nextUrl.search;
    return NextResponse.redirect(dest, { status: 308 }); // permanent
  }

  return NextResponse.next();
}

// ─────────────────────────────────────────────────────────────────────────────
// ADMIN SUBDOMAIN  (admin.medicalsdi.uz)
// Full auth chain.  updateSession is only called here, never on public domain.
// ─────────────────────────────────────────────────────────────────────────────
const AUTH_FREE_PATHS = [
  '/login',
  '/select-role',
  '/admin/access-denied',
  '/set-password',
  '/forgot-password',
  '/auth/callback',         // PKCE code exchange — must be reachable without a prior session
  '/api/auth/select-role',  // Route Handler that sets selected_role cookie + issues 303
  '/api/auth/verify',       // One-time token verification for invite + recovery links
  '/api/auth/logout',       // Logout endpoint, must be reachable even with expired session
];

function isAuthFree(pathname: string) {
  return AUTH_FREE_PATHS.some(p => pathname === p || pathname.startsWith(`${p}/`));
}

async function handleAdminSubdomain(
  request: NextRequest,
  pathname: string,
): Promise<NextResponse> {
  const url = request.nextUrl.clone();

  // Always refresh the session. updateSession() returns user=null immediately
  // when no valid session exists — no need for a cookie pre-check fast path.
  // (Pre-checking by cookie name breaks when @supabase/ssr chunks the token
  // into sb-ref-auth-token.0 / .1 cookies that don't match a simple suffix check.)
  const { response, user } = await updateSession(request);

  // ── Root → dashboard (authenticated) or login (session expired) ──────
  if (pathname === '/') {
    url.pathname = user ? '/admin/dashboard' : '/login';
    return NextResponse.redirect(url);
  }

  // ── Auth-free paths ────────────────────────────────────────────────
  if (isAuthFree(pathname)) {
    const isServerAction = request.headers.get('next-action') !== null;
    // Authenticated user navigating (not submitting a form) to /login → dashboard
    if (user && pathname === '/login' && !isServerAction) {
      url.pathname = '/admin/dashboard';
      return NextResponse.redirect(url);
    }
    return response;
  }

  // ── 1. Must be authenticated ─────────────────────────────────────────
  if (!user) {
    url.pathname = '/login';
    url.searchParams.set('next', pathname);
    return NextResponse.redirect(url);
  }

  // ── Session expiry checks ────────────────────────────────────────────────────
  const now = Date.now();
  const isApiRoute = pathname.startsWith('/api/');

  // Helper: build a response that forces logout (redirect for pages, 401 for API)
  const forceLogout = (reason: string): NextResponse => {
    if (isApiRoute) {
      return NextResponse.json({ error: 'session_expired' }, { status: 401 });
    }
    const dest = url.clone();
    dest.pathname = '/api/auth/logout';
    dest.searchParams.set('reason', reason);
    return NextResponse.redirect(dest);
  };

  // 1. Absolute session lifetime
  const expiresAt = request.cookies.get('session_expires_at')?.value;
  if (expiresAt && now > parseInt(expiresAt, 10)) {
    return forceLogout('expired');
  }

  // 2. Inactivity
  const lastActivityVal = request.cookies.get('session_last_activity')?.value;
  if (lastActivityVal) {
    const lastActivityMs = parseInt(lastActivityVal, 10);
    if (!isNaN(lastActivityMs) && now - lastActivityMs > INACTIVITY_MS) {
      return forceLogout('inactivity');
    }
  }

  // Update session_last_activity on the updateSession response (non-API page navigations)
  response.cookies.set(SESSION_ACTIVITY_COOKIE.name, now.toString(), SESSION_ACTIVITY_COOKIE.options);

  // Set absolute expiry on first authenticated request (only if not already set)
  if (!expiresAt) {
    response.cookies.set(
      SESSION_EXPIRES_COOKIE.name,
      (now + ABSOLUTE_SESSION_MS).toString(),
      SESSION_EXPIRES_COOKIE.options,
    );
  }
  // ─────────────────────────────────────────────────────────────────────────────

  // ── 2. Must have an active role selected ─────────────────────────────
  const selectedRole = request.cookies.get('selected_role')?.value as UserRole | undefined;

  if (!selectedRole) {
    url.pathname = '/select-role';
    url.searchParams.set('next', pathname);
    return NextResponse.redirect(url);
  }

  // ── 3. Validate role belongs to this user (skip on prefetch) ─────────
  const isPrefetch =
    request.headers.get('next-router-prefetch') === '1' ||
    request.headers.get('purpose') === 'prefetch';

  if (!isPrefetch) {
    const userRoles = await getUserRoles(user.id);

    if (!userRoles.includes(selectedRole)) {
      url.pathname = '/select-role';
      const res = NextResponse.redirect(url);
      res.cookies.delete('selected_role');
      return res;
    }

    // ── 4. Route-level permission ─────────────────────────────────────
    if (!canAccessRoute(pathname, selectedRole)) {
      url.pathname = '/admin/access-denied';
      return NextResponse.redirect(url);
    }
  }

  return response;
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|geo).*)'],
};
