-- Migration 001: Enable PostGIS and create reference geography tables
-- regions → districts → mahallas (administrative hierarchy of Uzbekistan)

-- PostGIS is already enabled via Supabase dashboard, but ensure it exists
create extension if not exists postgis with schema extensions;

-- ============================================================
-- REGIONS (Viloyatlar) — 14 regions + Tashkent city
-- ============================================================
create table if not exists public.regions (
  id          serial primary key,
  name        text not null,          -- Toshkent viloyati
  name_en     text,                   -- Tashkent Region
  code        text unique,            -- TK, AN, BU, etc.
  geom        geometry(MultiPolygon, 4326),
  created_at  timestamptz not null default now()
);

comment on table public.regions is 'Uzbekistan administrative regions (viloyatlar). 14 regions + Tashkent city.';

-- ============================================================
-- DISTRICTS (Tumanlar) — ~200 districts
-- ============================================================
create table if not exists public.districts (
  id          serial primary key,
  region_id   int not null references public.regions(id) on delete cascade,
  name        text not null,
  name_en     text,
  code        text,
  geom        geometry(MultiPolygon, 4326),
  created_at  timestamptz not null default now()
);

comment on table public.districts is 'Administrative districts (tumanlar) within regions.';

-- ============================================================
-- MAHALLAS — neighbourhood-level boundaries
-- ============================================================
create table if not exists public.mahallas (
  id          serial primary key,
  district_id int not null references public.districts(id) on delete cascade,
  region_id   int not null references public.regions(id) on delete cascade,
  name        text not null,
  geom        geometry(MultiPolygon, 4326),
  created_at  timestamptz not null default now()
);

comment on table public.mahallas is 'Mahalla-level boundaries (finest administrative granularity).';

-- ============================================================
-- AIRPORTS — for proximity search on public portal
-- ============================================================
create table if not exists public.airports (
  id          serial primary key,
  name        text not null,
  name_en     text,
  iata_code   text unique,
  region_id   int references public.regions(id),
  geom        geometry(Point, 4326) not null,
  created_at  timestamptz not null default now()
);

comment on table public.airports is 'Commercial and regional airports for proximity distance calculation.';

-- ============================================================
-- SPATIAL INDEXES
-- ============================================================
create index if not exists regions_geom_idx    on public.regions    using gist(geom);
create index if not exists districts_geom_idx  on public.districts  using gist(geom);
create index if not exists mahallas_geom_idx   on public.mahallas   using gist(geom);
create index if not exists airports_geom_idx   on public.airports   using gist(geom);

-- FK indexes
create index if not exists districts_region_id_idx on public.districts(region_id);
create index if not exists mahallas_district_id_idx on public.mahallas(district_id);
create index if not exists mahallas_region_id_idx   on public.mahallas(region_id);
-- Migration 002: Core medical_objects table
-- Central entity of the portal — clinics, pharmacies, hospitals, labs, etc.

-- ============================================================
-- ENUM TYPES
-- ============================================================
create type public.ownership_type as enum (
  'Davlat',     -- State
  'Xususiy',    -- Private
  'Aralash',    -- Mixed
  'Noma''lum'   -- Unknown
);

create type public.coordinate_status as enum (
  'valid',
  'missing',
  'invalid',
  'outside_uzbekistan',
  'unconfirmed'
);

create type public.moderation_status as enum (
  'draft',
  'pending_review',
  'approved',
  'rejected',
  'needs_changes'
);

create type public.activity_status as enum (
  'active',
  'archived',
  'pending_delete',
  'rejected_delete'
);

-- ============================================================
-- OBJECT TYPES lookup
-- ============================================================
create table if not exists public.object_types (
  id          serial primary key,
  name        text not null unique,   -- Poliklinika, Dorixona, Shifoxona, etc.
  name_en     text,
  icon        text,                   -- lucide icon name for UI
  color       text,                   -- hex for map marker
  layer_key   text unique             -- matches Layer type in src/lib/types.ts
);

comment on table public.object_types is 'Medical facility types. Drives layer keys and map markers.';

insert into public.object_types (name, name_en, icon, color, layer_key) values
  ('Poliklinika (Davlat)',  'State Clinic',       'building-2',    '#2563EB', 'state-clinics'),
  ('Poliklinika (Xususiy)', 'Private Clinic',     'building',      '#7C3AED', 'private-clinics'),
  ('Dorixona',              'Pharmacy',           'pill',          '#16A34A', 'pharmacies'),
  ('Kasalxona',             'Hospital',           'hospital',      '#DC2626', 'hospitals'),
  ('Laboratoriya',          'Laboratory',         'flask-conical', '#EA580C', 'labs'),
  ('Tez yordam',            'Emergency Center',   'ambulance',     '#B91C1C', 'emergency'),
  ('Stomatologiya',         'Dental Clinic',      'smile',         '#0891B2', 'dental'),
  ('Sanatoriy',             'Sanatorium',         'trees',         '#15803D', 'sanatoriums')
on conflict (name) do nothing;

-- ============================================================
-- MEDICAL OBJECTS
-- ============================================================
create table if not exists public.medical_objects (
  id                       uuid primary key default gen_random_uuid(),

  -- Identity
  name                     text not null,
  type                     text not null,                    -- FK-like to object_types.name (kept as text for flexibility)
  ownership                public.ownership_type not null default 'Noma''lum',
  inn                      text,                             -- Taxpayer ID — used as natural dedup key on import

  -- Geography (FKs)
  region_id                int references public.regions(id),
  district_id              int references public.districts(id),
  mahalla_id               int references public.mahallas(id),
  address                  text not null default '',

  -- PostGIS geometry
  geom                     geometry(Point, 4326),
  coordinate_status        public.coordinate_status not null default 'missing',
  coordinate_confirmed_at  timestamptz,
  coordinate_confirmed_by  uuid references auth.users(id),

  -- Status
  moderation_status        public.moderation_status not null default 'draft',
  activity_status          public.activity_status not null default 'active',

  -- Contact / operational details
  license_number           text,
  phone                    text,
  email                    text,
  website                  text,
  postal_code              text,
  work_hours               text,
  director_name            text,
  responsible_person       text,
  notes                    text,
  tags                     text[],
  source                   text,                             -- 'manual' | 'import:filename.csv' | 'bulk-paste'

  -- Flexible extra fields (for import columns that don't map to fixed columns)
  properties_json          jsonb,

  -- Audit timestamps
  created_at               timestamptz not null default now(),
  updated_at               timestamptz not null default now(),
  created_by               uuid references auth.users(id),
  updated_by               uuid references auth.users(id),

  -- Constraints
  constraint chk_confirmed_requires_geom
    check (
      coordinate_status != 'valid' or geom is not null
    ),
  constraint chk_pending_review_requires_coords
    check (
      moderation_status = 'draft'
      or coordinate_status in ('valid', 'unconfirmed')
      -- Objects cannot be submitted for review without coordinates attempted
    )
);

comment on table public.medical_objects is
  'Core registry of all medical institutions and facilities across Uzbekistan.
   Soft-delete via activity_status — never hard delete.
   Coordinates confirmed via coordinate_confirmed_at; required before final approval.';

comment on column public.medical_objects.inn is
  'Taxpayer Identification Number (INN). Natural dedup key during bulk import.';

comment on column public.medical_objects.properties_json is
  'Overflow JSONB for import columns that do not map to fixed schema columns.';

-- ============================================================
-- SPATIAL + QUERY INDEXES
-- ============================================================
create index if not exists medical_objects_geom_idx
  on public.medical_objects using gist(geom);

create index if not exists medical_objects_region_id_idx
  on public.medical_objects(region_id);

create index if not exists medical_objects_district_id_idx
  on public.medical_objects(district_id);

create index if not exists medical_objects_moderation_status_idx
  on public.medical_objects(moderation_status)
  where moderation_status = 'pending_review';

create index if not exists medical_objects_activity_status_idx
  on public.medical_objects(activity_status)
  where activity_status = 'active';

create index if not exists medical_objects_inn_idx
  on public.medical_objects(inn)
  where inn is not null;

create index if not exists medical_objects_type_idx
  on public.medical_objects(type);
-- Migration 003: Auth profiles and multi-role RBAC
-- Users can hold multiple roles. Never rely on a single profiles.role column.

-- ============================================================
-- ROLE ENUM
-- ============================================================
create type public.user_role as enum (
  'super_admin',          -- Full system control, user management
  'admin',                -- Registry management, moderation approval
  'moderator',            -- Data review, change request creation
  'institution_director', -- Read/update their own institution only
  'operator',             -- Data entry, draft management
  'viewer'                -- Read-only access
);

-- ============================================================
-- PROFILES — extends auth.users with display metadata
-- ============================================================
create table if not exists public.profiles (
  id           uuid primary key references auth.users(id) on delete cascade,
  full_name    text,
  phone        text,
  avatar_url   text,
  is_active    boolean not null default true,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

comment on table public.profiles is
  'Public-facing user metadata. Extends auth.users (1:1).
   Do not store role here — use user_roles table for multi-role support.';

-- ============================================================
-- USER_ROLES — many roles per user, optional institution scope
-- ============================================================
create table if not exists public.user_roles (
  id               uuid primary key default gen_random_uuid(),
  user_id          uuid not null references auth.users(id) on delete cascade,
  role             public.user_role not null,
  -- Optional: scope role to a specific institution (for institution_director)
  institution_id   uuid references public.medical_objects(id) on delete set null,
  granted_at       timestamptz not null default now(),
  granted_by       uuid references auth.users(id),
  revoked_at       timestamptz,
  revoke_reason    text,

  -- A user cannot hold the same role for the same institution twice
  constraint uq_user_role_institution unique (user_id, role, institution_id)
);

comment on table public.user_roles is
  'Multi-role assignments. A user can be both operator and viewer.
   institution_director roles are scoped to institution_id.
   Soft-revoke via revoked_at rather than deleting rows (audit trail).';

create index if not exists user_roles_user_id_idx
  on public.user_roles(user_id)
  where revoked_at is null;

create index if not exists user_roles_role_idx
  on public.user_roles(role)
  where revoked_at is null;

-- ============================================================
-- TRIGGER: auto-create profile on new auth user
-- ============================================================
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, avatar_url)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)),
    new.raw_user_meta_data->>'avatar_url'
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

create or replace trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ============================================================
-- HELPER: get active roles for a user (used in RLS)
-- ============================================================
create or replace function public.get_user_roles(p_user_id uuid)
returns public.user_role[]
language sql
stable
security definer set search_path = public
as $$
  select array_agg(role)
  from public.user_roles
  where user_id = p_user_id
    and revoked_at is null;
$$;

-- ============================================================
-- HELPER: check if current user has a given role
-- ============================================================
create or replace function public.has_role(p_role public.user_role)
returns boolean
language sql
stable
security definer set search_path = public
as $$
  select exists (
    select 1 from public.user_roles
    where user_id = auth.uid()
      and role = p_role
      and revoked_at is null
  );
$$;

-- ============================================================
-- HELPER: check if current user has any of the given roles
-- ============================================================
create or replace function public.has_any_role(p_roles public.user_role[])
returns boolean
language sql
stable
security definer set search_path = public
as $$
  select exists (
    select 1 from public.user_roles
    where user_id = auth.uid()
      and role = any(p_roles)
      and revoked_at is null
  );
$$;
-- Migration 004: Moderation workflow and audit logs

-- ============================================================
-- ENUMS
-- ============================================================
create type public.moderation_request_type as enum (
  'update',
  'delete',
  'archive',
  'restore'
);

create type public.moderation_request_status as enum (
  'pending',
  'approved',
  'rejected'
);

-- ============================================================
-- MODERATION REQUESTS
-- Moderators/operators cannot directly mutate approved objects.
-- They create a request; admin/super_admin approves or rejects.
-- ============================================================
create table if not exists public.moderation_requests (
  id               uuid primary key default gen_random_uuid(),
  object_id        uuid not null references public.medical_objects(id) on delete cascade,
  request_type     public.moderation_request_type not null,
  status           public.moderation_request_status not null default 'pending',

  -- Who/when
  requested_by     uuid not null references auth.users(id),
  requested_at     timestamptz not null default now(),
  reviewed_by      uuid references auth.users(id),
  reviewed_at      timestamptz,

  -- What changed (field-level diff for the diff viewer UI)
  -- old_data: snapshot of object at request time
  -- new_data: proposed new values (null for delete/archive requests)
  old_data         jsonb,
  new_data         jsonb,

  comment          text,           -- Reviewer rejection reason / approval note
  internal_note    text            -- Internal notes not visible to requester
);

comment on table public.moderation_requests is
  'Change/delete/archive requests that require admin approval.
   diff viewer uses old_data vs new_data.
   Approved requests are applied transactionally by the approval handler.';

create index if not exists moderation_requests_object_id_idx
  on public.moderation_requests(object_id);

create index if not exists moderation_requests_pending_idx
  on public.moderation_requests(status, requested_at desc)
  where status = 'pending';

create index if not exists moderation_requests_requested_by_idx
  on public.moderation_requests(requested_by);

-- ============================================================
-- AUDIT LOGS — immutable, append-only
-- Written by DB triggers AND app-level server actions.
-- Never UPDATE or DELETE rows from this table.
-- ============================================================
create table if not exists public.audit_logs (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid references auth.users(id) on delete set null,
  user_email    text,           -- denormalized snapshot (user may be deleted)
  role_used     public.user_role,

  -- What happened
  action        text not null,  -- 'create' | 'update' | 'delete_request' | 'approve' |
                                --  'reject' | 'import' | 'bulk_paste' | 'login' |
                                --  'role_grant' | 'role_revoke' | 'export'
  entity_type   text not null,  -- 'medical_object' | 'moderation_request' | 'user_role' | etc.
  entity_id     text,           -- UUID or numeric id (text for flexibility)

  -- State snapshot for diff display
  old_data      jsonb,
  new_data      jsonb,

  -- Request metadata
  ip_address    inet,
  user_agent    text,

  created_at    timestamptz not null default now()
);

comment on table public.audit_logs is
  'Immutable activity log. Never update or delete rows.
   Captures who, what, when, from-where for every important action.
   old_data/new_data enable field-level diff in audit detail drawer.';

-- Index for the audit log page (admin view: latest first, filterable by entity/user/action)
create index if not exists audit_logs_created_at_idx
  on public.audit_logs(created_at desc);

create index if not exists audit_logs_user_id_idx
  on public.audit_logs(user_id);

create index if not exists audit_logs_entity_idx
  on public.audit_logs(entity_type, entity_id);

create index if not exists audit_logs_action_idx
  on public.audit_logs(action);

-- ============================================================
-- TRIGGER: auto-audit medical_objects changes
-- Fires on INSERT/UPDATE/DELETE — writes to audit_logs.
-- App-level actions (login, import, role change) write directly.
-- ============================================================
create or replace function public.audit_medical_objects()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  v_action     text;
  v_old_data   jsonb := null;
  v_new_data   jsonb := null;
  v_entity_id  text;
begin
  if tg_op = 'INSERT' then
    v_action    := 'create';
    v_new_data  := to_jsonb(new);
    v_entity_id := new.id::text;
  elsif tg_op = 'UPDATE' then
    v_action    := 'update';
    v_old_data  := to_jsonb(old);
    v_new_data  := to_jsonb(new);
    v_entity_id := new.id::text;
  elsif tg_op = 'DELETE' then
    v_action    := 'delete';
    v_old_data  := to_jsonb(old);
    v_entity_id := old.id::text;
  end if;

  insert into public.audit_logs (
    user_id, action, entity_type, entity_id, old_data, new_data
  ) values (
    auth.uid(), v_action, 'medical_object', v_entity_id, v_old_data, v_new_data
  );

  return coalesce(new, old);
end;
$$;

create or replace trigger trg_audit_medical_objects
  after insert or update or delete on public.medical_objects
  for each row execute procedure public.audit_medical_objects();

-- ============================================================
-- TRIGGER: updated_at auto-maintenance
-- ============================================================
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create or replace trigger trg_medical_objects_updated_at
  before update on public.medical_objects
  for each row execute procedure public.set_updated_at();

create or replace trigger trg_profiles_updated_at
  before update on public.profiles
  for each row execute procedure public.set_updated_at();
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
-- EOF
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
