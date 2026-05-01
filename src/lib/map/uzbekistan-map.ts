import type { Feature, FeatureCollection, Polygon, MultiPolygon } from 'geojson';

export const UZBEKISTAN_BOUNDS: [[number, number], [number, number]] = [
  [55.8, 37.0], // Southwest corner (lng, lat)
  [73.3, 45.7], // Northeast corner (lng, lat)
];

export const UZBEKISTAN_CENTER: [number, number] = [64.5853, 41.3775];

export const UZBEKISTAN_MIN_ZOOM = 4.5;
export const UZBEKISTAN_MAX_ZOOM = 18;
export const UZBEKISTAN_MOBILE_MIN_ZOOM = 4.0;


/**
 * Creates a GeoJSON feature that masks the world outside of the provided boundary.
 * The boundary is expected to be a FeatureCollection with at least one Polygon or MultiPolygon.
 * @param boundary - A GeoJSON FeatureCollection containing the boundary of Uzbekistan.
 * @returns A GeoJSON FeatureCollection representing the mask.
 */
export function createUzbekistanMask(boundary?: FeatureCollection<Polygon | MultiPolygon>): FeatureCollection | null {
  if (!boundary || !boundary.features || boundary.features.length === 0) {
    return null;
  }

  const worldRectangle = [
    [-180, -90],
    [180, -90],
    [180, 90],
    [-180, 90],
    [-180, -90],
  ];

  // Extract only the EXTERIOR rings from all polygons/multipolygons to use as holes for the world mask.
  const holes = boundary.features.flatMap((feature) => {
    const geom = feature.geometry;
    if (geom.type === 'Polygon') {
      // A polygon's coordinates array contains the exterior ring followed by any interior rings (holes).
      // We only want the exterior ring for the mask's hole.
      return [geom.coordinates[0]];
    }
    if (geom.type === 'MultiPolygon') {
      // A multipolygon's coordinates is an array of polygon coordinate arrays.
      // For each polygon, we take only its exterior ring (the first one).
      return geom.coordinates.map((polygonRings) => polygonRings[0]);
    }
    return [];
  });

  const maskFeature: Feature<Polygon> = {
    type: 'Feature',
    properties: {},
    geometry: {
      type: 'Polygon',
      // The first ring is the exterior (the world), subsequent rings are the holes (Uzbekistan's exterior boundaries).
      coordinates: [worldRectangle, ...holes],
    },
  };

  return {
    type: 'FeatureCollection',
    features: [maskFeature],
  };
}
