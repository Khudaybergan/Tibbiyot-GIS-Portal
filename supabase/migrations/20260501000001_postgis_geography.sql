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
