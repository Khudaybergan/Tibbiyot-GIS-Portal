import { SetPasswordClient } from './set-password-client';

export default async function SetPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string; type?: string; email?: string }>;
}) {
  const { token, type, email } = await searchParams;
  return <SetPasswordClient token={token} email={email} otpType={type} />;
}
