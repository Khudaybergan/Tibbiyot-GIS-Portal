import { NextResponse, type NextRequest } from 'next/server';

/**
 * GET /api/auth/verify?token=...&type=invite|recovery&email=...
 *
 * Passes the OTP params through to /set-password WITHOUT verifying immediately.
 * Verification happens on form submit (client-side verifyOtp) so that
 * link-preview bots (Slack, Telegram, email clients) cannot consume the
 * one-time token before the user actually opens the link.
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const token = searchParams.get('token');
  const type  = searchParams.get('type');
  const email = searchParams.get('email');
  const origin = new URL(request.url).origin;

  if (!token || !type || !email) {
    return NextResponse.redirect(
      `${origin}/login?error=${encodeURIComponent("Havola parametrlari noto'g'ri")}`,
    );
  }

  const dest = new URL(`${origin}/set-password`);
  dest.searchParams.set('token', token);
  dest.searchParams.set('type', type);
  dest.searchParams.set('email', email);
  return NextResponse.redirect(dest);
}
