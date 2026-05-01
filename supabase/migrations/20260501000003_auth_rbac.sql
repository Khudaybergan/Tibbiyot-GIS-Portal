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
