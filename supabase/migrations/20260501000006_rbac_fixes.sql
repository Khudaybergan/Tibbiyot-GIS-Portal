-- Migration 006: RBAC correctness fixes
-- 1. NULL-safe uniqueness for user_roles
-- 2. DISTINCT roles in get_user_roles (deduplicate institution_director rows)
-- 3. get_director_institutions helper
-- 4. is_active_user() helper for RLS
-- 5. Tighten RLS: blocked users cannot read/write even with valid roles

-- ─────────────────────────────────────────────────────────────────────────────
-- 1. Fix unique constraint for NULL institution_id
--
-- PostgreSQL evaluates NULL != NULL, so the original composite unique constraint
-- (user_id, role, institution_id) does NOT prevent two rows like:
--   (user_A, 'moderator', NULL) and (user_A, 'moderator', NULL)
-- Drop it and replace with partial unique indexes that handle NULL correctly.
-- ─────────────────────────────────────────────────────────────────────────────
alter table public.user_roles
  drop constraint if exists uq_user_role_institution;

-- For unscoped roles (institution_id IS NULL): one active row per (user, role)
create unique index if not exists uq_user_role_no_institution
  on public.user_roles(user_id, role)
  where institution_id is null
    and revoked_at is null;

-- For institution-scoped roles: one active row per (user, role, institution)
create unique index if not exists uq_user_role_with_institution
  on public.user_roles(user_id, role, institution_id)
  where institution_id is not null
    and revoked_at is null;

-- ─────────────────────────────────────────────────────────────────────────────
-- 2. Fix get_user_roles: use DISTINCT
--
-- An institution_director assigned to 3 institutions has 3 user_roles rows,
-- all with role = 'institution_director'. Without DISTINCT the function returns
-- ['institution_director', 'institution_director', 'institution_director'].
-- ─────────────────────────────────────────────────────────────────────────────
create or replace function public.get_user_roles(p_user_id uuid)
returns public.user_role[]
language sql
stable
security definer set search_path = public
as $$
  select array_agg(distinct role order by role)
  from public.user_roles
  where user_id = p_user_id
    and revoked_at is null;
$$;

-- ─────────────────────────────────────────────────────────────────────────────
-- 3. get_director_institutions: institution IDs for a director
--
-- Returns the set of medical_object IDs the user is authorized to manage
-- as institution_director. Used by application-level scope checks and RLS.
-- ─────────────────────────────────────────────────────────────────────────────
create or replace function public.get_director_institutions(p_user_id uuid)
returns uuid[]
language sql
stable
security definer set search_path = public
as $$
  select coalesce(array_agg(institution_id), '{}')
  from public.user_roles
  where user_id = p_user_id
    and role = 'institution_director'
    and institution_id is not null
    and revoked_at is null;
$$;

-- ─────────────────────────────────────────────────────────────────────────────
-- 4. is_active_user(): blocked-user guard for RLS
--
-- Returns false when the current user's profile has is_active = false.
-- This means suspended accounts cannot read or write data even if they have
-- a valid Supabase session (e.g., the session was already issued before suspension).
-- ─────────────────────────────────────────────────────────────────────────────
create or replace function public.is_active_user()
returns boolean
language sql
stable
security definer set search_path = public
as $$
  select coalesce(
    (select is_active from public.profiles where id = auth.uid()),
    false
  );
$$;

-- ─────────────────────────────────────────────────────────────────────────────
-- 5. Tighten RLS policies to also require is_active_user()
--
-- Previously a blocked user with an active session could still query tables.
-- Now every staff-facing policy requires both role AND active status.
-- ─────────────────────────────────────────────────────────────────────────────

-- medical_objects: staff read
drop policy if exists "objects_staff_read" on public.medical_objects;
create policy "objects_staff_read" on public.medical_objects
  for select
  to authenticated
  using (
    public.is_active_user()
    and public.has_any_role(array['super_admin','admin','moderator','operator','viewer']::public.user_role[])
  );

-- medical_objects: director read (own institution)
drop policy if exists "objects_director_read" on public.medical_objects;
create policy "objects_director_read" on public.medical_objects
  for select
  to authenticated
  using (
    public.is_active_user()
    and exists (
      select 1 from public.user_roles ur
      where ur.user_id = auth.uid()
        and ur.role = 'institution_director'
        and ur.institution_id = medical_objects.id
        and ur.revoked_at is null
    )
  );

-- medical_objects: insert
drop policy if exists "objects_operator_insert" on public.medical_objects;
create policy "objects_operator_insert" on public.medical_objects
  for insert
  to authenticated
  with check (
    public.is_active_user()
    and public.has_any_role(array['super_admin','admin','moderator','operator']::public.user_role[])
  );

-- medical_objects: update (staff)
drop policy if exists "objects_operator_update" on public.medical_objects;
create policy "objects_operator_update" on public.medical_objects
  for update
  to authenticated
  using (
    public.is_active_user()
    and public.has_any_role(array['super_admin','admin','moderator','operator']::public.user_role[])
  );

-- medical_objects: update (director, own institution only)
drop policy if exists "objects_director_update" on public.medical_objects;
create policy "objects_director_update" on public.medical_objects
  for update
  to authenticated
  using (
    public.is_active_user()
    and exists (
      select 1 from public.user_roles ur
      where ur.user_id = auth.uid()
        and ur.role = 'institution_director'
        and ur.institution_id = medical_objects.id
        and ur.revoked_at is null
    )
  );

-- profiles: self read/update
drop policy if exists "profiles_self_read" on public.profiles;
create policy "profiles_self_read" on public.profiles
  for select
  to authenticated
  using (id = auth.uid());

drop policy if exists "profiles_admin_read" on public.profiles;
create policy "profiles_admin_read" on public.profiles
  for select
  to authenticated
  using (
    public.is_active_user()
    and public.has_any_role(array['super_admin','admin']::public.user_role[])
  );

drop policy if exists "profiles_admin_update" on public.profiles;
create policy "profiles_admin_update" on public.profiles
  for update
  to authenticated
  using (
    public.is_active_user()
    and public.has_role('super_admin')
  );

-- user_roles: super_admin write
drop policy if exists "user_roles_super_admin_write" on public.user_roles;
create policy "user_roles_super_admin_write" on public.user_roles
  for all
  to authenticated
  using (
    public.is_active_user()
    and public.has_role('super_admin')
  );

-- user_roles: admin read (for user management pages)
drop policy if exists "user_roles_admin_read" on public.user_roles;
create policy "user_roles_admin_read" on public.user_roles
  for select
  to authenticated
  using (
    public.is_active_user()
    and public.has_any_role(array['super_admin','admin']::public.user_role[])
  );

-- moderation_requests: staff read
drop policy if exists "mod_requests_staff_read" on public.moderation_requests;
create policy "mod_requests_staff_read" on public.moderation_requests
  for select
  to authenticated
  using (
    public.is_active_user()
    and public.has_any_role(array['super_admin','admin','moderator','operator']::public.user_role[])
  );

-- moderation_requests: create
drop policy if exists "mod_requests_create" on public.moderation_requests;
create policy "mod_requests_create" on public.moderation_requests
  for insert
  to authenticated
  with check (
    public.is_active_user()
    and public.has_any_role(array['super_admin','admin','moderator','operator']::public.user_role[])
    and requested_by = auth.uid()
  );

-- moderation_requests: review (approve/reject)
drop policy if exists "mod_requests_admin_update" on public.moderation_requests;
create policy "mod_requests_admin_update" on public.moderation_requests
  for update
  to authenticated
  using (
    public.is_active_user()
    and public.has_any_role(array['super_admin','admin','moderator']::public.user_role[])
  );

-- audit_logs: read
drop policy if exists "audit_logs_admin_read" on public.audit_logs;
create policy "audit_logs_admin_read" on public.audit_logs
  for select
  to authenticated
  using (
    public.is_active_user()
    and public.has_any_role(array['super_admin','admin','moderator','operator','institution_director']::public.user_role[])
  );
