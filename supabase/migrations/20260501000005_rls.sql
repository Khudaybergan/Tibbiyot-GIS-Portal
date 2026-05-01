-- Migration 005: Row-Level Security policies
-- All tables are protected. Public portal reads medical_objects anonymously.
-- All admin writes require authenticated users with appropriate roles.

-- ============================================================
-- Enable RLS on all tables
-- ============================================================
alter table public.regions              enable row level security;
alter table public.districts            enable row level security;
alter table public.mahallas             enable row level security;
alter table public.airports             enable row level security;
alter table public.object_types         enable row level security;
alter table public.medical_objects      enable row level security;
alter table public.profiles             enable row level security;
alter table public.user_roles           enable row level security;
alter table public.moderation_requests  enable row level security;
alter table public.audit_logs           enable row level security;

-- ============================================================
-- GEOGRAPHY TABLES — public read, admin write
-- ============================================================
create policy "geography_public_read" on public.regions
  for select using (true);

create policy "geography_public_read" on public.districts
  for select using (true);

create policy "geography_public_read" on public.mahallas
  for select using (true);

create policy "geography_public_read" on public.airports
  for select using (true);

create policy "geography_public_read" on public.object_types
  for select using (true);

-- Only super_admin can modify reference geography
create policy "geography_admin_write" on public.regions
  for all using (public.has_role('super_admin'));

create policy "geography_admin_write" on public.districts
  for all using (public.has_role('super_admin'));

create policy "geography_admin_write" on public.mahallas
  for all using (public.has_role('super_admin'));

create policy "geography_admin_write" on public.airports
  for all using (public.has_any_role(array['super_admin', 'admin']::public.user_role[]));

-- ============================================================
-- MEDICAL_OBJECTS
-- Public: read approved+active only
-- Operators/moderators: read all, create/update drafts
-- Admin/super_admin: full access
-- institution_director: read+update their own institution
-- ============================================================

-- Anon/public portal: only approved, active records
create policy "objects_public_read" on public.medical_objects
  for select
  using (
    moderation_status = 'approved'
    and activity_status = 'active'
  );

-- Authenticated admin staff: read everything
create policy "objects_staff_read" on public.medical_objects
  for select
  to authenticated
  using (
    public.has_any_role(array['super_admin', 'admin', 'moderator', 'operator', 'viewer']::public.user_role[])
  );

-- institution_director: read their own institution only
create policy "objects_director_read" on public.medical_objects
  for select
  to authenticated
  using (
    exists (
      select 1 from public.user_roles ur
      where ur.user_id = auth.uid()
        and ur.role = 'institution_director'
        and ur.institution_id = medical_objects.id
        and ur.revoked_at is null
    )
  );

-- Operators/moderators: create and update (creates drafts, submits for review)
create policy "objects_operator_insert" on public.medical_objects
  for insert
  to authenticated
  with check (
    public.has_any_role(array['super_admin', 'admin', 'moderator', 'operator']::public.user_role[])
  );

create policy "objects_operator_update" on public.medical_objects
  for update
  to authenticated
  using (
    public.has_any_role(array['super_admin', 'admin', 'moderator', 'operator']::public.user_role[])
  );

-- institution_director: update their own institution
create policy "objects_director_update" on public.medical_objects
  for update
  to authenticated
  using (
    exists (
      select 1 from public.user_roles ur
      where ur.user_id = auth.uid()
        and ur.role = 'institution_director'
        and ur.institution_id = medical_objects.id
        and ur.revoked_at is null
    )
  );

-- Hard delete disabled for all — use activity_status soft-delete
-- (no DELETE policy = nobody can hard-delete via API)

-- ============================================================
-- PROFILES
-- ============================================================
create policy "profiles_self_read" on public.profiles
  for select
  to authenticated
  using (id = auth.uid());

create policy "profiles_admin_read" on public.profiles
  for select
  to authenticated
  using (public.has_any_role(array['super_admin', 'admin']::public.user_role[]));

create policy "profiles_self_update" on public.profiles
  for update
  to authenticated
  using (id = auth.uid())
  with check (id = auth.uid());

create policy "profiles_admin_update" on public.profiles
  for update
  to authenticated
  using (public.has_role('super_admin'));

-- ============================================================
-- USER_ROLES
-- ============================================================
create policy "user_roles_self_read" on public.user_roles
  for select
  to authenticated
  using (user_id = auth.uid());

create policy "user_roles_admin_read" on public.user_roles
  for select
  to authenticated
  using (public.has_any_role(array['super_admin', 'admin']::public.user_role[]));

-- Only super_admin can grant/revoke roles
create policy "user_roles_super_admin_write" on public.user_roles
  for all
  to authenticated
  using (public.has_role('super_admin'));

-- ============================================================
-- MODERATION_REQUESTS
-- ============================================================

-- Staff can read all pending requests
create policy "mod_requests_staff_read" on public.moderation_requests
  for select
  to authenticated
  using (
    public.has_any_role(array['super_admin', 'admin', 'moderator', 'operator']::public.user_role[])
  );

-- Operator/moderator can create requests
create policy "mod_requests_create" on public.moderation_requests
  for insert
  to authenticated
  with check (
    public.has_any_role(array['super_admin', 'admin', 'moderator', 'operator']::public.user_role[])
    and requested_by = auth.uid()
  );

-- Admin/super_admin can update (approve/reject)
create policy "mod_requests_admin_update" on public.moderation_requests
  for update
  to authenticated
  using (
    public.has_any_role(array['super_admin', 'admin']::public.user_role[])
  );

-- ============================================================
-- AUDIT_LOGS — read by admin+, never writable via API
-- (writes only via triggers and service-role server actions)
-- ============================================================
create policy "audit_logs_admin_read" on public.audit_logs
  for select
  to authenticated
  using (
    public.has_any_role(array['super_admin', 'admin']::public.user_role[])
  );

-- No INSERT/UPDATE/DELETE policies — only written by triggers + service role
