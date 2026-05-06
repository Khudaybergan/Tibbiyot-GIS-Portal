// Data loaders — each function fetches one GeoJSON/JSON file, normalises
// coordinates and properties, and returns:
//   fc       — a standard WGS84 GeoJSON FeatureCollection for MapLibre rendering
//   features — a normalised GeoFeature[] array for the details panel / lookups
//
// Future: replace fetchJson() calls with Supabase / PostGIS API calls.
// The rest of the map code (map-view, details panel) uses GeoFeature and never
// touches the raw file format, so the switch is a one-file change.

import type { Feature, FeatureCollection } from 'geojson';
import type { GeoFeature, GeoLayerType } from './types';
import { reprojectPoints, esriToGeoJSON, isMercatorCrs } from './convert';

const EMPTY: { fc: FeatureCollection; features: GeoFeature[] } = {
  fc: { type: 'FeatureCollection', features: [] },
  features: [],
};

async function fetchJson(url: string): Promise<unknown> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status} — ${url}`);
  return res.json();
}

// Helper: find a property by key suffix (handles dynamic prefixed field names
// like "klinikalar_0804 — Лист1_Field2" by matching just "Field2").
function getProp(props: Record<string, unknown>, suffix: string): string {
  const key = Object.keys(props).find(k => k.endsWith(suffix));
  return key ? String(props[key] ?? '').trim() : '';
}

// Remove surrounding quotes added by some export tools: '"CLINIC NAME"' → 'CLINIC NAME'
function unquote(s: string): string {
  return s.replace(/^["']+|["']+$/g, '').trim();
}

// ── State clinics (davlat_tibbiyot.json) ──────────────────────────────────────
// WGS84 Points · fields: FID, _uid_, viloyat, tuman, nomi, manzil
export async function loadDavlatTibbiyot() {
  try {
    const raw = await fetchJson('/geo/data/davlat_tibbiyot.json');
    const fc = raw as FeatureCollection;

    const features: GeoFeature[] = [];
    const geoJsonFeatures: Feature[] = [];

    fc.features.forEach((f: Feature, i: number) => {
      if (f.geometry?.type !== 'Point') return;
      const coords = (f.geometry as any).coordinates as number[];
      if (!coords || coords.length < 2 || !coords[0] || !coords[1]) return;

      const p = f.properties ?? {};
      features.push({
        id: i,
        layerType: 'state-clinics' as GeoLayerType,
        geometryKind: 'point',
        name: (p.nomi as string) || `Davlat muassasasi ${i + 1}`,
        region: p.viloyat as string,
        district: p.tuman as string,
        address: p.manzil as string,
        coordinates: [coords[0], coords[1]],
        raw: p as Record<string, unknown>,
      });
      geoJsonFeatures.push({ ...f, id: i });
    });

    return { fc: { type: 'FeatureCollection' as const, features: geoJsonFeatures }, features };
  } catch (err) {
    console.warn('[geo] loadDavlatTibbiyot failed:', err);
    return EMPTY;
  }
}

// ── Private clinics (klinikalar_0804.geojson) ─────────────────────────────────
// EPSG:3857 Points · 28 fields including prefixed "Field2/5/8" for name/address/services
export async function loadKlinikalar() {
  try {
    const raw = await fetchJson('/geo/data/klinikalar_0804.geojson');
    const mercator = isMercatorCrs(raw);
    const base = mercator ? reprojectPoints(raw as FeatureCollection) : (raw as FeatureCollection);

    const features: GeoFeature[] = [];
    const geoJsonFeatures: Feature[] = [];

    base.features.forEach((f: Feature, i: number) => {
      if (f.geometry?.type !== 'Point') return;
      const p = (f.properties ?? {}) as Record<string, unknown>;
      const [lng, lat] = (f.geometry as any).coordinates as number[];

      const name = unquote(getProp(p, 'Field2')) || (p.Obyekt_nom as string) || `Xususiy klinika ${i + 1}`;
      const address = getProp(p, 'Field5') || (p.Manzili__V as string) || '';
      const rawServices = getProp(p, 'Field8');

      features.push({
        id: i,
        layerType: 'private-clinics' as GeoLayerType,
        geometryKind: 'point',
        name,
        region: (p.region_nam as string) || getProp(p, 'Field6'),
        district: (p.district_n as string) || getProp(p, 'Field7'),
        mahalla: p.mahalla_na as string,
        address,
        inn: (p.INN as string) || getProp(p, 'Field4'),
        services: rawServices || undefined,
        coordinates: [lng, lat],
        raw: p,
      });
      geoJsonFeatures.push({ ...f, id: i });
    });

    return { fc: { type: 'FeatureCollection' as const, features: geoJsonFeatures }, features };
  } catch (err) {
    console.warn('[geo] loadKlinikalar failed:', err);
    return EMPTY;
  }
}

// ── Pharmacies (dorixonalar_point.geojson) ────────────────────────────────────
// EPSG:3857 Points · fields: Obyekt_nom, region_nam, district_n, mahalla_na, Manzili__V, INN
export async function loadDorixonalar() {
  try {
    const raw = await fetchJson('/geo/data/dorixonalar_point.geojson');
    const mercator = isMercatorCrs(raw);
    const base = mercator ? reprojectPoints(raw as FeatureCollection) : (raw as FeatureCollection);

    const features: GeoFeature[] = [];
    const geoJsonFeatures: Feature[] = [];

    base.features.forEach((f: Feature, i: number) => {
      if (f.geometry?.type !== 'Point') return;
      const p = (f.properties ?? {}) as Record<string, unknown>;
      const [lng, lat] = (f.geometry as any).coordinates as number[];

      features.push({
        id: i,
        layerType: 'pharmacies' as GeoLayerType,
        geometryKind: 'point',
        name: (p.Obyekt_nom as string) || `Dorixona ${i + 1}`,
        region: p.region_nam as string,
        district: p.district_n as string,
        mahalla: p.mahalla_na as string,
        address: p.Manzili__V as string,
        inn: p.INN as string,
        coordinates: [lng, lat],
        raw: p,
      });
      geoJsonFeatures.push({ ...f, id: i });
    });

    return { fc: { type: 'FeatureCollection' as const, features: geoJsonFeatures }, features };
  } catch (err) {
    console.warn('[geo] loadDorixonalar failed:', err);
    return EMPTY;
  }
}

// ── Province boundaries (viloyat_chegara.json) ────────────────────────────────
// Esri REST format · EPSG:3857 Polygons · fields: region_name, parent_code, region_cad_id
// NOTE: the sample file may be truncated — loader returns empty on parse failure.
export async function loadViloyat() {
  try {
    const raw = await fetchJson('/geo/data/viloyat_chegara.json');
    const fc = esriToGeoJSON(raw);

    const features: GeoFeature[] = fc.features.map((f: Feature, i: number) => {
      const p = (f.properties ?? {}) as Record<string, unknown>;
      return {
        id: i,
        layerType: 'viloyat' as GeoLayerType,
        geometryKind: 'polygon',
        name: (p.region_name as string) || `Viloyat ${i + 1}`,
        raw: p,
      };
    });

    return { fc, features };
  } catch (err) {
    console.warn('[geo] loadViloyat failed (sample file may be truncated):', err);
    return EMPTY;
  }
}

// ── District boundaries (tuman_chegara.json) ──────────────────────────────────
// Esri REST format · WGS84 Polygons · fields: Tuman, KADASTR
// NOTE: the sample file may be truncated — loader returns empty on parse failure.
export async function loadTuman() {
  try {
    const raw = await fetchJson('/geo/data/tuman_chegara.json');
    const fc = esriToGeoJSON(raw);

    const features: GeoFeature[] = fc.features.map((f: Feature, i: number) => {
      const p = (f.properties ?? {}) as Record<string, unknown>;
      return {
        id: i,
        layerType: 'tuman' as GeoLayerType,
        geometryKind: 'polygon',
        name: (p.Tuman as string) || `Tuman ${i + 1}`,
        raw: p,
      };
    });

    return { fc, features };
  } catch (err) {
    console.warn('[geo] loadTuman failed (sample file may be truncated):', err);
    return EMPTY;
  }
}

// ── Mahalla boundaries (mahalla.geojson) ──────────────────────────────────────
// Accepts either standard GeoJSON FeatureCollection OR Esri REST FeatureSet
// (the file has been re-exported from ArcGIS in both formats over time).
// Fields: nomi, nomi2, tuman, tuman_id, aholi_soni, Mahalla_ID, _uid_, FID
export async function loadMahalla() {
  try {
    const raw = await fetchJson('/geo/data/mahalla.geojson');
    const isEsri = (raw as { geometryType?: string }).geometryType?.startsWith('esri');
    const fc = isEsri ? esriToGeoJSON(raw) : (raw as FeatureCollection);

    const features: GeoFeature[] = fc.features.map((f: Feature, i: number) => {
      const p = (f.properties ?? {}) as Record<string, unknown>;
      const popRaw = p.aholi_soni;
      const population = popRaw ? parseInt(String(popRaw), 10) : undefined;

      return {
        id: i,
        layerType: 'mahalla' as GeoLayerType,
        geometryKind: 'polygon',
        name: (p.nomi as string) || (p.nomi2 as string) || `Mahalla ${i + 1}`,
        district: p.tuman as string,
        population: isNaN(population!) ? undefined : population,
        raw: p,
      };
    });

    // Ensure all features have stable numeric IDs for MapLibre
    const geoJsonFeatures = fc.features.map((f: Feature, i: number) => ({ ...f, id: i }));

    return { fc: { type: 'FeatureCollection' as const, features: geoJsonFeatures }, features };
  } catch (err) {
    console.warn('[geo] loadMahalla failed:', err);
    return EMPTY;
  }
}
