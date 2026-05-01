-- Migration 007: Password reset request workflow
--
-- Instead of automatic email-based password resets, this system requires
-- admin approval. Users submit a request; admin generates a one-time link
-- which they copy and send manually. The link is never stored in the DB
-- (it lives only in Supabase auth's token store + is shown once in the UI).

-- ──────────────────────────────────────────────────────────────────────────��──
-- TABLE
-- ─────────────────────────────────────────────────────────────────────────────
create table if not exists public.password_reset_requests (
  id              uuid primary key default gen_random_uuid(),

  -- The requesting user (null if the email doesn't match any account — we still
  -- record the attempt for audit purposes without leaking account existence).
  user_id         uuid references auth.users(id) on delete set null,
  email           text not null,

  requested_at    timestamptz not null default now(),

  -- pending  → waiting for admin action
  -- fulfilled → admin generated + sent the reset link
  -- rejected  → admin declined (e.g., duplicate request, suspected abuse)
  -- expired   → request was never acted on within 72 hours
  status          text not null default 'pending'
    check (status in ('pending', 'fulfilled', 'rejected', 'expired')),

  handled_by      uuid references auth.users(id) on delete set null,
  handled_at      timestamptz,
  admin_note      text,   -- optional note visible only to admins

  -- Rate-limiting: prevent spam (1 pending request per email at a time)
  constraint uq_pending_reset_per_email
    exclude using btree (email with =) where (status = 'pending')
);

comment on table public.password_reset_requests is
  'User-submitted password reset requests awaiting admin approval.
   Admin generates a one-time recovery link via auth.admin.generateLink.
   The link itself is never stored here — shown once in the admin UI.
   Complies with the rule: admins never see or set passwords.';

create index if not exists pwd_reset_status_idx
  on public.password_reset_requests(status, requested_at desc)
  where status = 'pending';

create index if not exists pwd_reset_user_id_idx
  on public.password_reset_requests(user_id);

-- ─────────────────────────────────────────────────────────────────────────────
-- RLS
-- ─────────────────────────────────────────────────────────────────────────────
alter table public.password_reset_requests enable row level security;

-- Admin / super_admin can read all requests
create policy "pwd_reset_admin_read" on public.password_reset_requests
  for select
  to authenticated
  using (
    public.is_active_user()
    and public.has_any_role(array['super_admin', 'admin']::public.user_role[])
  );

-- All writes (insert / update) go through service-role Server Actions only.
-- No direct client write policies — RLS blocks everything from the anon/user key.

-- ─────────────────────────────────────────────────────────────────────────────
-- Auto-expire old pending requests (TTL = 72 hours)
-- Run via pg_cron or a scheduled Edge Function if available.
-- If not, the expiry check is also done in the Server Action before generating
-- the link so expired requests cannot be fulfilled.
-- ─────────────────────────────────────────────────────────────────────────────
create or replace function public.expire_password_reset_requests()
returns void
language sql
security definer set search_path = public
as $$
  update public.password_reset_requests
  set status = 'expired'
  where status = 'pending'
    and requested_at < now() - interval '72 hours';
$$;
