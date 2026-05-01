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
