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
