// Canonical layer type identifiers used throughout the geo system.
// Points: state-clinics, private-clinics, pharmacies
// Polygons: viloyat (province), tuman (district), mahalla (neighbourhood)
export type GeoLayerType =
  | 'state-clinics'
  | 'private-clinics'
  | 'pharmacies'
  | 'viloyat'
  | 'tuman'
  | 'mahalla';

// A fully-normalised feature ready for display in the map and details panel.
// Created by the loaders in loaders.ts regardless of source file format.
// In the future, the loaders will fetch from a PostGIS/Supabase API instead of
// local files — the rest of the map code will not need to change.
export type GeoFeature = {
  // Stable within-layer index used to look up the feature after a map click.
  id: number;
  layerType: GeoLayerType;
  geometryKind: 'point' | 'polygon';

  // Human-readable name shown in popup / details panel
  name: string;

  // Common administrative fields (all optional — not every layer has all fields)
  region?: string;    // viloyat name
  district?: string;  // tuman name
  mahalla?: string;   // mahalla name
  address?: string;
  inn?: string;
  services?: string;  // medical services list (private clinics)
  population?: number; // aholi_soni (mahalla boundaries)

  // [lng, lat] WGS84 — only present for Point features
  coordinates?: [number, number];

  // Original raw properties for the details panel to render extra fields
  raw: Record<string, unknown>;
};
