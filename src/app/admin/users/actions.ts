'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { requireSelectedRole } from '@/lib/auth/require-role';
import { canGrantRole, ROLE_CONFIGS, type UserRole } from '@/lib/auth/roles';
import { adminUrl } from '@/lib/auth/domains';

// ─────────────────────────────────────────────────────────────────────────────
// INVITE USER
// Creates a Supabase auth user via generateLink (type='invite') — never sends
// an email automatically. Returns the one-time setup link to display to the
// admin, who sends it manually. The admin never sees a password.
// ─────────────────────────────────────────────────────────────────────────────
export async function inviteUser(
  formData: FormData,
): Promise<{ error?: string; inviteLink?: string }> {
  const { user: actor, selectedRole } = await requireSelectedRole('users.manage');

  const email = (formData.get('email') as string | null)?.trim().toLowerCase();
  const fullName = (formData.get('full_name') as string | null)?.trim() || null;
  const rolesToGrant = formData.getAll('roles') as UserRole[];

  if (!email) return { error: 'Email kiritilishi shart' };

  // ── Server-side hierarchy check for every role being granted ────────────
  for (const role of rolesToGrant) {
    if (!canGrantRole(selectedRole, role)) {
      return {
        error: `"${ROLE_CONFIGS[selectedRole].label}" roli "${ROLE_CONFIGS[role].label}" rolini bera olmaydi`,
      };
    }
  }

  const adminClient = createAdminClient();

  // ── Generate invite link (also creates the auth user) ───────────────────
  // redirectTo is required by the API but we will not use Supabase's redirect
  // mechanism — we extract the token and build our own direct link instead.
  const { data: linkData, error: linkError } = await adminClient.auth.admin.generateLink({
    type: 'invite',
    email,
    options: {
      data: { full_name: fullName },
      redirectTo: adminUrl('/auth/callback'),
    },
  });

  if (linkError || !linkData.user) {
    return { error: linkError?.message ?? 'Foydalanuvchi yaratishda xatolik' };
  }

  const newUserId = linkData.user.id;

  // ── Build a direct verify link — avoids Supabase redirect whitelist issue ─
  // linkData.properties.email_otp is the RAW one-time token (not hashed).
  // verifyOtp() expects the raw OTP; the action_link URL contains the SHA-256
  // hash of it and is NOT compatible with verifyOtp.
  const inviteLink = adminUrl(
    `/api/auth/verify?token=${encodeURIComponent(linkData.properties.email_otp)}&type=invite&email=${encodeURIComponent(email)}`,
  );

  // ── Mark account inactive until the user sets their password ─────────────
  const supabase = await createClient();
  await (supabase.from('profiles') as any)
    .update({ is_active: false })
    .eq('id', newUserId);

  // ── Grant requested roles ────────────────────────────────────────────────
  for (const role of rolesToGrant) {
    const institutionId = (formData.get(`institution_${role}`) as string | null) || null;
    await (supabase.from('user_roles') as any).insert({
      user_id: newUserId,
      role,
      institution_id: institutionId,
      granted_by: actor.id,
    });
  }

  await writeAuditLog(actor.id, 'invite_user', 'user', newUserId, null, {
    email,
    full_name: fullName,
    roles: rolesToGrant,
  });

  revalidatePath('/admin/users');
  return { inviteLink };
}

// ─────────────────────────────────────────────────────────────────────────────
// GRANT ROLE
// Adds an active role to an existing user.
// Enforces hierarchy: the actor's selected role must be strictly above the
// target role in the hierarchy. Checked on the server — not just in the UI.
// ─────────────────────────────────────────────────────────────────────────────
export async function grantRole(formData: FormData): Promise<{ error?: string }> {
  const { user: actor, selectedRole } = await requireSelectedRole('roles.manage');

  const targetUserId = formData.get('user_id') as string;
  const role = formData.get('role') as UserRole;
  const institutionId = (formData.get('institution_id') as string | null) || null;

  if (!targetUserId || !role) return { error: "Ma'lumotlar to'liq emas" };

  // ── Server-side hierarchy check (authoritative — never trust the UI) ─────
  if (!canGrantRole(selectedRole, role)) {
    return {
      error: `"${ROLE_CONFIGS[selectedRole].label}" roli "${ROLE_CONFIGS[role].label}" rolini bera olmaydi. Faqat o'zingizdan past darajadagi rollarni berishingiz mumkin.`,
    };
  }

  const supabase = await createClient();
  const { error } = await (supabase.from('user_roles') as any).insert({
    user_id: targetUserId,
    role,
    institution_id: institutionId,
    granted_by: actor.id,
  });

  if (error) {
    if (error.code === '23505') return { error: 'Bu rol allaqachon faol' };
    return { error: error.message };
  }

  await writeAuditLog(actor.id, 'role_grant', 'user_role', targetUserId, null, {
    role,
    institution_id: institutionId,
  });

  revalidatePath('/admin/users');
  return {};
}

// ─────────────────────────────────────────────────────────────────────────────
// REVOKE ROLE
// Soft-revoke: sets revoked_at, preserving audit history.
// Hierarchy check: actor cannot revoke a role equal to or above their own level.
// ─────────────────────────────────────────────────────────────────────────────
export async function revokeRole(formData: FormData): Promise<{ error?: string }> {
  const { user: actor, selectedRole } = await requireSelectedRole('roles.manage');

  const roleRowId = formData.get('role_row_id') as string;
  const reason = (formData.get('reason') as string | null) || null;

  if (!roleRowId) return { error: "role_row_id yo'q" };

  const supabase = await createClient();

  // Read the row to check hierarchy
  const { data: row } = await supabase
    .from('user_roles')
    .select('user_id, role')
    .eq('id', roleRowId)
    .single() as { data: { user_id: string; role: string } | null; error: unknown };

  if (!row) return { error: "Rol topilmadi" };

  // Hierarchy check: cannot revoke a role at the same level or above your own
  if (!canGrantRole(selectedRole, row.role as UserRole)) {
    return {
      error: `"${ROLE_CONFIGS[selectedRole].label}" roli "${ROLE_CONFIGS[row.role as UserRole].label}" rolini olib tasha olmaydi`,
    };
  }

  const { error } = await (supabase.from('user_roles') as any)
    .update({ revoked_at: new Date().toISOString(), revoke_reason: reason })
    .eq('id', roleRowId)
    .is('revoked_at', null);

  if (error) return { error: error.message };

  await writeAuditLog(actor.id, 'role_revoke', 'user_role', row.user_id, {
    role: row.role,
    reason,
  }, null);

  revalidatePath('/admin/users');
  return {};
}

// ─────────────────────────────────────────────────────────────────────────────
// SET USER ACTIVE / BLOCKED
// Blocking also terminates all active sessions immediately.
// Actor cannot block themselves.
// ─────────────────────────────────────────────────────────────────────────────
export async function setUserActive(formData: FormData): Promise<{ error?: string }> {
  const { user: actor } = await requireSelectedRole('users.manage');

  const targetUserId = formData.get('user_id') as string;
  const makeActive = formData.get('make_active') === 'true';

  if (!targetUserId) return { error: "user_id yo'q" };
  if (targetUserId === actor.id) return { error: "O'z hisobingizni bloklashingiz mumkin emas" };

  // Terminate all active sessions immediately when blocking
  if (!makeActive) {
    const adminClient = createAdminClient();
    await adminClient.auth.admin.signOut(targetUserId);
  }

  const supabase = await createClient();
  const { error } = await (supabase.from('profiles') as any)
    .update({ is_active: makeActive })
    .eq('id', targetUserId);

  if (error) return { error: error.message };

  await writeAuditLog(
    actor.id,
    makeActive ? 'user_unblock' : 'user_block',
    'user',
    targetUserId,
    { is_active: !makeActive },
    { is_active: makeActive },
  );

  revalidatePath('/admin/users');
  return {};
}

// ─────────────────────────────────────────────────────────────────────────────
// FORGOT PASSWORD — CREATE REQUEST
// Called from the unauthenticated /forgot-password page.
// Always responds with success to prevent email enumeration.
// ─────────────────────────────────────────────────────────────────────────────
export async function createPasswordResetRequest(
  formData: FormData,
): Promise<{ error?: string; success?: boolean }> {
  const email = (formData.get('email') as string | null)?.trim().toLowerCase();
  if (!email) return { error: 'Email kiritilishi shart' };

  const adminClient = createAdminClient();

  // Look up user by email via listUsers filter
  // Even if user not found, respond with success (prevent enumeration)
  const { data: { users: matchedUsers } } = await adminClient.auth.admin.listUsers({ perPage: 1000 });
  const foundUser = matchedUsers.find((u) => u.email?.toLowerCase() === email);

  if (!foundUser) {
    return { success: true };
  }

  const userId = foundUser.id;

  // Check for existing pending request
  const existingCheck = await (adminClient.from('password_reset_requests') as any)
    .select('id')
    .eq('email', email)
    .eq('status', 'pending')
    .maybeSingle();

  if (!existingCheck.error && existingCheck.data) {
    // Already has a pending request — silently succeed (don't reveal state)
    return { success: true };
  }

  // Create the request
  await (adminClient.from('password_reset_requests') as any).insert({
    user_id: userId,
    email,
  });

  return { success: true };
}

// ─────────────────────────────────────────────────────────────────────────────
// GENERATE PASSWORD RESET LINK
// Admin/super_admin clicks this for a pending request.
// Generates a one-time recovery link and marks the request as fulfilled.
// The link is returned to the admin's browser — never stored in the DB.
// ─────────────────────────────────────────────────────────────────────────────
export async function generatePasswordResetLink(
  formData: FormData,
): Promise<{ error?: string; resetLink?: string }> {
  const { user: actor } = await requireSelectedRole('users.manage');

  const requestId = formData.get('request_id') as string;
  if (!requestId) return { error: "request_id yo'q" };

  const adminClient = createAdminClient();

  // Load the request
  const { data: req, error: reqError } = await (adminClient.from('password_reset_requests') as any)
    .select('id, user_id, email, status, requested_at')
    .eq('id', requestId)
    .single();

  if (reqError || !req) return { error: "So'rov topilmadi" };
  if (req.status !== 'pending') return { error: `So'rov allaqachon ${req.status}` };

  // Check TTL (72 hours)
  const requestedAt = new Date(req.requested_at);
  if (Date.now() - requestedAt.getTime() > 72 * 60 * 60 * 1000) {
    await (adminClient.from('password_reset_requests') as any)
      .update({ status: 'expired' })
      .eq('id', requestId);
    return { error: "So'rov muddati tugagan (72 soat)" };
  }

  // Generate one-time recovery link (1 hour expiry from Supabase)
  const { data: linkData, error: linkError } = await adminClient.auth.admin.generateLink({
    type: 'recovery',
    email: req.email,
    options: { redirectTo: adminUrl('/auth/callback') },
  });

  if (linkError) return { error: linkError.message };

  // Build a direct verify link — same approach as invite links.
  // Use email_otp (raw OTP), not the hashed token from action_link URL.
  const resetLink = adminUrl(
    `/api/auth/verify?token=${encodeURIComponent(linkData.properties.email_otp)}&type=recovery&email=${encodeURIComponent(req.email)}`,
  );

  // Mark request fulfilled
  await (adminClient.from('password_reset_requests') as any)
    .update({
      status: 'fulfilled',
      handled_by: actor.id,
      handled_at: new Date().toISOString(),
    })
    .eq('id', requestId);

  await writeAuditLog(actor.id, 'password_reset_link_generated', 'password_reset_request', requestId, { email: req.email }, { status: 'fulfilled' });

  revalidatePath('/admin/users');
  return { resetLink };
}

// ─────────────────────────────────────────────────────────────────────────────
// REJECT PASSWORD RESET REQUEST
// ─────────────────────────────────────────────────────────────────────────────
export async function rejectPasswordResetRequest(
  formData: FormData,
): Promise<{ error?: string }> {
  const { user: actor } = await requireSelectedRole('users.manage');

  const requestId = formData.get('request_id') as string;
  const note = (formData.get('note') as string | null) || null;

  const adminClient = createAdminClient();
  const { error } = await (adminClient.from('password_reset_requests') as any)
    .update({
      status: 'rejected',
      handled_by: actor.id,
      handled_at: new Date().toISOString(),
      admin_note: note,
    })
    .eq('id', requestId)
    .eq('status', 'pending');

  if (error) return { error: error.message };

  await writeAuditLog(actor.id, 'password_reset_rejected', 'password_reset_request', requestId, null, { status: 'rejected', note });

  revalidatePath('/admin/users');
  return {};
}

// ─────────────────────────────────────────────────────────────────────────────
// GENERATE DIRECT RESET LINK
// Admin initiates a password reset for any user without waiting for the user
// to submit a request. Useful when the user has no access to their email or
// the forgot-password flow is unavailable.
// ─────────────────────────────────────────────────────────────────────────────
export async function generateDirectResetLink(
  formData: FormData,
): Promise<{ error?: string; resetLink?: string }> {
  const { user: actor } = await requireSelectedRole('users.manage');

  const targetUserId = formData.get('user_id') as string;
  const email        = formData.get('email') as string;

  if (!targetUserId || !email) return { error: "Ma'lumotlar to'liq emas" };

  const adminClient = createAdminClient();

  const { data: linkData, error: linkError } = await adminClient.auth.admin.generateLink({
    type: 'recovery',
    email,
    options: { redirectTo: adminUrl('/auth/callback') },
  });

  if (linkError) return { error: linkError.message };

  const resetLink = adminUrl(
    `/api/auth/verify?token=${encodeURIComponent(linkData.properties.email_otp)}&type=recovery&email=${encodeURIComponent(email)}`,
  );

  await writeAuditLog(actor.id, 'direct_reset_link_generated', 'user', targetUserId, null, { email });

  return { resetLink };
}

// ─────────────────────────────────────────────────────────────────────────────
// Internal: write to audit_logs via service role (bypasses RLS insert restriction)
// ─────────────────────────────────────────────────────────────────────────────
async function writeAuditLog(
  userId: string,
  action: string,
  entityType: string,
  entityId: string,
  oldData: object | null,
  newData: object | null,
) {
  try {
    const adminClient = createAdminClient();
    await (adminClient.from('audit_logs') as any).insert({
      user_id: userId,
      action,
      entity_type: entityType,
      entity_id: entityId,
      old_data: oldData ?? null,
      new_data: newData ?? null,
    });
  } catch {
    // Audit log failure must never break the primary operation
  }
}
