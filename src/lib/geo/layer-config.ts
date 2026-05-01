import type { GeoLayerType } from './types';
import type { Layer } from '@/lib/types';

export type LayerVisualConfig = {
  label: string;         // Uzbek display name
  color: string;         // primary hex color
  strokeColor: string;   // outline hex color
  // Points
  circleRadius?: number;
  circleStrokeWidth?: number;
  // Polygons
  fillOpacity?: number;
  strokeWidth?: number;
};

export const LAYER_VISUAL: Record<GeoLayerType, LayerVisualConfig> = {
  'state-clinics': {
    label: 'Davlat klinikalari',
    color: '#2563EB',
    strokeColor: '#ffffff',
    circleRadius: 7,
    circleStrokeWidth: 2,
  },
  'private-clinics': {
    label: 'Xususiy klinikalar',
    color: '#16A34A',
    strokeColor: '#ffffff',
    circleRadius: 7,
    circleStrokeWidth: 2,
  },
  pharmacies: {
    label: 'Dorixonalar',
    color: '#F59E0B',
    strokeColor: '#ffffff',
    circleRadius: 6,
    circleStrokeWidth: 2,
  },
  viloyat: {
    label: 'Viloyatlar',
    color: '#2563EB',
    strokeColor: '#1D4ED8',
    fillOpacity: 0.07,
    strokeWidth: 2,
  },
  tuman: {
    label: 'Tumanlar',
    color: '#7C3AED',
    strokeColor: '#6D28D9',
    fillOpacity: 0.06,
    strokeWidth: 1.5,
  },
  mahalla: {
    label: 'Mahallalar',
    color: '#0891B2',
    strokeColor: '#0E7490',
    fillOpacity: 0.1,
    strokeWidth: 1,
  },
};

// Maps GeoLayerType → the Layer toggle ID used in the filter panel / context.
// Keeps GIS-domain naming (viloyat/tuman/mahalla) separate from UI toggle names.
export const GEO_TO_LAYER_TOGGLE: Record<GeoLayerType, Layer> = {
  'state-clinics': 'state-clinics',
  'private-clinics': 'private-clinics',
  pharmacies: 'pharmacies',
  viloyat: 'regions',
  tuman: 'districts',
  mahalla: 'mahallas',
};

// Reverse map: Layer toggle ID → GeoLayerType
export const LAYER_TOGGLE_TO_GEO: Partial<Record<Layer, GeoLayerType>> = {
  'state-clinics': 'state-clinics',
  'private-clinics': 'private-clinics',
  pharmacies: 'pharmacies',
  regions: 'viloyat',
  districts: 'tuman',
  mahallas: 'mahalla',
};

// MapLibre layer id → GeoLayerType (used in click handler)
export const MAP_LAYER_TO_GEO: Record<string, GeoLayerType> = {
  'state-clinics-layer': 'state-clinics',
  'private-clinics-layer': 'private-clinics',
  'pharmacies-layer': 'pharmacies',
  'viloyat-fill': 'viloyat',
  'tuman-fill': 'tuman',
  'mahalla-fill': 'mahalla',
};
