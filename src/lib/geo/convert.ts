import type { Feature, FeatureCollection } from 'geojson';

// ── Coordinate projection ─────────────────────────────────────────────────────

// Web Mercator (EPSG:3857) → WGS84 (EPSG:4326)
export function mercatorToWgs84(x: number, y: number): [number, number] {
  const lng = (x / 20037508.342789244) * 180;
  const lat = (Math.atan(Math.exp((y / 20037508.342789244) * Math.PI)) * 360) / Math.PI - 90;
  return [lng, lat];
}

function convertRing(ring: number[][]): number[][] {
  return ring.map(([x, y]) => {
    const [lng, lat] = mercatorToWgs84(x, y);
    return [lng, lat];
  });
}

// Re-project all Point features from Web Mercator to WGS84 in-place.
// Returns a new FeatureCollection; non-Point features are left unchanged.
export function reprojectPoints(fc: FeatureCollection): FeatureCollection {
  return {
    ...fc,
    features: fc.features.map((f: Feature) => {
      if (f.geometry?.type !== 'Point') return f;
      const [x, y] = (f.geometry as any).coordinates as number[];
      const [lng, lat] = mercatorToWgs84(x, y);
      return { ...f, geometry: { type: 'Point', coordinates: [lng, lat] } };
    }),
  };
}

// ── Esri REST JSON → GeoJSON FeatureCollection ────────────────────────────────
// Supports esriGeometryPolygon and esriGeometryPoint.
// Automatically re-projects if spatialReference is Web Mercator (wkid 102100 / 3857).

export function esriToGeoJSON(esriData: unknown): FeatureCollection {
  const data = esriData as Record<string, any>;
  const rawFeatures: any[] = data.features ?? [];
  const spatialRef = data.spatialReference ?? {};

  const isMercator =
    spatialRef.wkid === 102100 ||
    spatialRef.wkid === 3857 ||
    spatialRef.latestWkid === 3857;

  const features: Feature[] = rawFeatures.map((f: any, i: number) => {
    const props: Record<string, unknown> = { ...(f.attributes ?? {}) };
    let geometry: any = null;

    if (f.geometry?.rings) {
      const rings: number[][][] = isMercator
        ? (f.geometry.rings as number[][][]).map(convertRing)
        : f.geometry.rings;
      geometry = { type: 'Polygon', coordinates: rings };
    } else if (f.geometry?.x !== undefined) {
      let [x, y] = [f.geometry.x as number, f.geometry.y as number];
      if (isMercator) [x, y] = mercatorToWgs84(x, y);
      geometry = { type: 'Point', coordinates: [x, y] };
    }

    return {
      type: 'Feature',
      // Use array index as stable ID so MapLibre click events can find the feature
      id: i,
      properties: props,
      geometry,
    };
  });

  return { type: 'FeatureCollection', features };
}

// ── CRS detection ─────────────────────────────────────────────────────────────

export function isMercatorCrs(data: unknown): boolean {
  const crs = (data as any)?.crs?.properties?.name ?? '';
  return crs.includes('3857') || crs.includes('102100');
}
