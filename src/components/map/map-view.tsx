"use client";

import 'maplibre-gl/dist/maplibre-gl.css';
import { useMemo, useState, useEffect, useRef, useCallback } from "react";
import Map, { Popup, Source, Layer, Marker, NavigationControl, type MapRef } from 'react-map-gl/maplibre';
import { useMap } from "@/hooks/use-map";
import { Navigation, LocateFixed, Filter } from 'lucide-react';
import type { FeatureCollection, Polygon, MultiPolygon } from 'geojson';
import type { MapLayerMouseEvent } from 'react-map-gl/maplibre';
import { BasemapSwitcher } from './basemap-switcher';
import { useIsMobile } from '@/hooks/use-mobile';
import {
  UZBEKISTAN_BOUNDS,
  UZBEKISTAN_CENTER,
  UZBEKISTAN_MAX_ZOOM,
  UZBEKISTAN_MIN_ZOOM,
  UZBEKISTAN_MOBILE_MIN_ZOOM,
  createUzbekistanMask,
} from '@/lib/map/uzbekistan-map';
import { Button } from '../ui/button';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import type { GeoFeature, GeoLayerType } from '@/lib/geo/types';
import {
  loadDavlatTibbiyot,
  loadKlinikalar,
  loadDorixonalar,
  loadViloyat,
  loadTuman,
  loadMahalla,
} from '@/lib/geo/loaders';
import { LAYER_VISUAL, MAP_LAYER_TO_GEO, GEO_TO_LAYER_TOGGLE } from '@/lib/geo/layer-config';
import { bearingDegrees, haversineMeters } from '@/lib/map/routing';
import type { Layer as LayerToggle } from '@/lib/types';

// ── Types ─────────────────────────────────────────────────────────────────────

type LayerData = {
  fc: FeatureCollection;
  features: GeoFeature[];
};

type GeoState = Partial<Record<GeoLayerType, LayerData>>;

// ── Constants ─────────────────────────────────────────────────────────────────

const INITIAL_VIEW = {
  longitude: UZBEKISTAN_CENTER[0],
  latitude: UZBEKISTAN_CENTER[1],
  zoom: 5.8,
};

// All MapLibre layer IDs that should respond to click / hover
const INTERACTIVE_LAYER_IDS = Object.keys(MAP_LAYER_TO_GEO);

// ── Component ─────────────────────────────────────────────────────────────────

export function MapView() {
  const mapRef = useRef<MapRef>(null);
  const isMobile = useIsMobile();
  const { toast } = useToast();

  // Map base layers
  const [uzbekistanBoundary, setUzbekistanBoundary] = useState<FeatureCollection<Polygon | MultiPolygon> | null>(null);
  const [uzbekistanMask, setUzbekistanMask] = useState<FeatureCollection | null>(null);
  const [userLocation, setUserLocation] = useState<[number, number] | null>(null);
  const [userHeading, setUserHeading] = useState<number | null>(null);
  const userWatchRef = useRef<number | null>(null);
  const compassCleanupRef = useRef<(() => void) | null>(null);

  // Loaded geo data: { fc for rendering, features[] for lookup }
  const [geoState, setGeoState] = useState<GeoState>({});

  // Hover state for boundary layers
  const [hoveredLayer, setHoveredLayer] = useState<GeoLayerType | null>(null);
  const [hoveredId, setHoveredId] = useState<number | null>(null);

  const {
    activeLayers,
    selectedFeature,
    setSelectedFeature,
    basemapUrl,
    isFilterOpen,
    setIsFilterOpen,
    route,
    isNavigating,
    livePosition,
    liveHeading,
  } = useMap();

  
  // ── Load all geo layers on mount ──────────────────────────────────────────
  // The country mask + outline are derived from viloyat polygons once they load
  // (their union forms Uzbekistan), so no separate uzbekistan.geojson fetch.
  useEffect(() => {
    const set = (type: GeoLayerType, data: LayerData) =>
      setGeoState(prev => ({ ...prev, [type]: data }));

    loadDavlatTibbiyot().then(d => set('state-clinics', d));
    loadKlinikalar().then(d => set('private-clinics', d));
    loadDorixonalar().then(d => set('pharmacies', d));
    loadViloyat().then(d => {
      set('viloyat', d);
      const polyFc = d.fc as FeatureCollection<Polygon | MultiPolygon>;
      setUzbekistanBoundary(polyFc);
      setUzbekistanMask(createUzbekistanMask(polyFc));
    });
    loadTuman().then(d => set('tuman', d));
    loadMahalla().then(d => set('mahalla', d));
  }, []);

  // ── Fly to selected point feature ─────────────────────────────────────────
  useEffect(() => {
    if (selectedFeature?.coordinates && mapRef.current) {
      mapRef.current.flyTo({
        center: selectedFeature.coordinates,
        zoom: 14,
        duration: 1800,
        essential: true,
      });
    }
  }, [selectedFeature]);

  // ── Fit map to route bounds whenever a new route arrives ──────────────────
  useEffect(() => {
    if (!route || !mapRef.current || isNavigating) return;
    const coords = route.geojson.geometry.coordinates as [number, number][];
    if (coords.length < 2) return;
    let minLng = Infinity, minLat = Infinity, maxLng = -Infinity, maxLat = -Infinity;
    for (const [lng, lat] of coords) {
      if (lng < minLng) minLng = lng;
      if (lat < minLat) minLat = lat;
      if (lng > maxLng) maxLng = lng;
      if (lat > maxLat) maxLat = lat;
    }
    mapRef.current.fitBounds(
      [[minLng, minLat], [maxLng, maxLat]],
      { padding: { top: 80, right: 60, bottom: 120, left: 460 }, duration: 1400, essential: true },
    );
  }, [route, isNavigating]);

  // ── Register the navigation arrow icon on the map style ─────────────────
  useEffect(() => {
    if (!mapRef.current) return;
    const map = mapRef.current.getMap();

    const ensureArrow = () => {
      if (map.hasImage('nav-arrow')) return;
      const SIZE = 96;
      const canvas = document.createElement('canvas');
      canvas.width = SIZE;
      canvas.height = SIZE;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      ctx.translate(SIZE / 2, SIZE / 2);

      // Soft accuracy halo (drawn first, behind arrow)
      const grad = ctx.createRadialGradient(0, 0, 0, 0, 0, SIZE / 2);
      grad.addColorStop(0, 'rgba(37, 99, 235, 0.30)');
      grad.addColorStop(1, 'rgba(37, 99, 235, 0)');
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(0, 0, SIZE / 2, 0, 2 * Math.PI);
      ctx.fill();

      // White outline (slightly bigger arrow drawn underneath)
      ctx.fillStyle = '#FFFFFF';
      ctx.beginPath();
      ctx.moveTo(0, -34);
      ctx.lineTo(22, 22);
      ctx.lineTo(0, 12);
      ctx.lineTo(-22, 22);
      ctx.closePath();
      ctx.fill();

      // Blue chevron fill on top
      ctx.fillStyle = '#2563EB';
      ctx.beginPath();
      ctx.moveTo(0, -29);
      ctx.lineTo(18, 19);
      ctx.lineTo(0, 9);
      ctx.lineTo(-18, 19);
      ctx.closePath();
      ctx.fill();

      const data = ctx.getImageData(0, 0, SIZE, SIZE);
      try { map.addImage('nav-arrow', data, { pixelRatio: 2 }); } catch { /* style not ready, will retry on next event */ }
    };

    if (map.isStyleLoaded()) ensureArrow();
    map.on('styledata', ensureArrow);
    map.on('load', ensureArrow);

    return () => {
      map.off('styledata', ensureArrow);
      map.off('load', ensureArrow);
    };
  }, [basemapUrl]);

  // ── Navigation: follow user position with tilted camera ───────────────────
  useEffect(() => {
    if (!isNavigating || !mapRef.current) return;
    const map = mapRef.current.getMap();

    // Enter nav mode: tilt + zoom in. Run once on entry.
    map.easeTo({
      pitch: 60,
      zoom: 17,
      duration: 1200,
      essential: true,
    });

    return () => {
      // On exit: reset camera
      try { map.easeTo({ pitch: 0, bearing: 0, zoom: 13, duration: 800 }); } catch {}
    };
  }, [isNavigating]);

  // Follow live position with bearing derived from movement direction.
  // Uses a low-pass filter so the map rotates smoothly instead of snapping.
  const prevPosRef = useRef<[number, number] | null>(null);
  const smoothBearingRef = useRef<number | null>(null);
  // Mirror of smoothBearingRef for the JSX arrow marker
  const [navBearing, setNavBearing] = useState<number | null>(null);
  useEffect(() => {
    if (!isNavigating || !livePosition || !mapRef.current) return;
    const map = mapRef.current.getMap();

    let bearing: number = map.getBearing();
    const prev = prevPosRef.current;

    if (prev) {
      const moved = haversineMeters(prev, livePosition);
      // Only update bearing when the user has actually moved — prevents jitter
      // when standing still (GPS will produce tiny noisy deltas).
      if (moved > 3) {
        const measured = bearingDegrees(prev, livePosition);
        const sb = smoothBearingRef.current;
        if (sb === null) {
          smoothBearingRef.current = measured;
          bearing = measured;
        } else {
          // Shortest angular delta in [-180, 180]
          const delta = ((measured - sb + 540) % 360) - 180;
          const smoothed = (sb + delta * 0.35 + 360) % 360;
          smoothBearingRef.current = smoothed;
          bearing = smoothed;
        }
      } else if (smoothBearingRef.current !== null) {
        bearing = smoothBearingRef.current;
      } else if (typeof liveHeading === 'number') {
        bearing = liveHeading;
      }
    } else if (typeof liveHeading === 'number') {
      // Very first fix and we don't yet have movement — use compass if available
      bearing = liveHeading;
      smoothBearingRef.current = liveHeading;
    }
    prevPosRef.current = livePosition;
    setNavBearing(bearing);

    map.easeTo({
      center: livePosition,
      bearing,
      // Re-assert pitch and zoom so they don't get clobbered by the
      // initial tilt-on-entry easeTo being interrupted by this follow call.
      pitch: 60,
      zoom: Math.max(map.getZoom(), 17),
      duration: 900,
      essential: true,
    });
  }, [isNavigating, livePosition, liveHeading]);

  // Reset the bearing filter every time we leave navigation
  useEffect(() => {
    if (!isNavigating) {
      prevPosRef.current = null;
      smoothBearingRef.current = null;
      setNavBearing(null);
    }
  }, [isNavigating]);

  // ── Animate route line: marching-ants effect via dasharray steps ──────────
  useEffect(() => {
    if (!route || !mapRef.current) return;
    const map = mapRef.current.getMap();
    const dashSequence: number[][] = [
      [0, 4, 3], [0.5, 4, 2.5], [1, 4, 2], [1.5, 4, 1.5],
      [2, 4, 1], [2.5, 4, 0.5], [3, 4, 0],
      [0, 0.5, 3, 3.5], [0, 1, 3, 3], [0, 1.5, 3, 2.5],
      [0, 2, 3, 2], [0, 2.5, 3, 1.5], [0, 3, 3, 1], [0, 3.5, 3, 0.5],
    ];
    let step = -1;
    let raf = 0;
    const tick = () => {
      // Wait until react-map-gl has actually mounted the layer
      if (map.getLayer('route-line-flow')) {
        const next = Math.floor((performance.now() / 90) % dashSequence.length);
        if (next !== step) {
          step = next;
          map.setPaintProperty('route-line-flow', 'line-dasharray', dashSequence[step] as never);
        }
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [route]);

  // ── Pulsing destination marker ────────────────────────────────────────────
  useEffect(() => {
    if (!route || !mapRef.current) return;
    const map = mapRef.current.getMap();
    let raf = 0;
    const tick = () => {
      if (map.getLayer('route-destination-pulse')) {
        const t = (performance.now() / 1000) % 2;          // 0..2
        const phase = t < 1 ? t : 2 - t;                   // 0..1..0
        map.setPaintProperty('route-destination-pulse', 'circle-radius', 14 + phase * 18);
        map.setPaintProperty('route-destination-pulse', 'circle-opacity', 0.45 - phase * 0.4);
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [route]);

  // ── Map interactions ──────────────────────────────────────────────────────

  const handleMapClick = useCallback((e: MapLayerMouseEvent) => {
    // While navigating, the map is read-only — taps on it must NOT change
    // selection or clear the active route. Exit only via the X button.
    if (isNavigating) return;

    // Always prefer point features over polygons — clicking a clinic should
    // select the clinic, not the viloyat/tuman/mahalla beneath it.
    const POINT_LAYERS = ['state-clinics-layer', 'private-clinics-layer', 'pharmacies-layer'];
    const pointHit = e.features?.find(f => POINT_LAYERS.includes(f.layer.id));
    const polyHit  = e.features?.find(f => MAP_LAYER_TO_GEO[f.layer.id]);
    const clickedLayerFeature = pointHit ?? polyHit;

    if (!clickedLayerFeature) {
      setSelectedFeature(null);
      return;
    }

    const geoLayerType = MAP_LAYER_TO_GEO[clickedLayerFeature.layer.id];
    const featureId = clickedLayerFeature.id as number;
    // Look up by id, not array index — loaders skip invalid features so the
    // dense features[] array is not aligned with the original feature ids.
    const found = geoState[geoLayerType]?.features.find(f => f.id === featureId);
    if (found) setSelectedFeature(found);
  }, [geoState, setSelectedFeature, isNavigating]);

  const handleMouseMove = useCallback((e: MapLayerMouseEvent) => {
    const polygonFeature = e.features?.find(f =>
      ['viloyat-fill', 'tuman-fill', 'mahalla-fill'].includes(f.layer.id)
    );
    if (polygonFeature) {
      e.target.getCanvas().style.cursor = 'pointer';
      const type = MAP_LAYER_TO_GEO[polygonFeature.layer.id];
      const id = polygonFeature.id as number;
      if (hoveredLayer !== type || hoveredId !== id) {
        setHoveredLayer(type);
        setHoveredId(id);
      }
    } else {
      const pointFeature = e.features?.find(f =>
        ['state-clinics-layer', 'private-clinics-layer', 'pharmacies-layer'].includes(f.layer.id)
      );
      e.target.getCanvas().style.cursor = pointFeature ? 'pointer' : '';
      if (hoveredLayer) {
        setHoveredLayer(null);
        setHoveredId(null);
      }
    }
  }, [hoveredLayer, hoveredId]);

  const handleMouseLeave = useCallback(() => {
    setHoveredLayer(null);
    setHoveredId(null);
  }, []);

  // ── Controls ──────────────────────────────────────────────────────────────

  const handleResetView = () => {
    mapRef.current?.fitBounds(UZBEKISTAN_BOUNDS, { padding: 40, duration: 1500 });
  };

  const stopUserTracking = useCallback(() => {
    if (userWatchRef.current !== null) {
      navigator.geolocation.clearWatch(userWatchRef.current);
      userWatchRef.current = null;
    }
    compassCleanupRef.current?.();
    compassCleanupRef.current = null;
  }, []);

  // Cleanup on unmount
  useEffect(() => () => stopUserTracking(), [stopUserTracking]);

  const handleLocateMe = async () => {
    // Toggle off if already tracking
    if (userWatchRef.current !== null) {
      stopUserTracking();
      setUserLocation(null);
      setUserHeading(null);
      return;
    }

    if (!navigator.geolocation) {
      toast({ variant: 'destructive', title: 'Xatolik', description: "Geolokatsiya qo'llab-quvvatlanmaydi." });
      return;
    }

    let flewOnce = false;
    userWatchRef.current = navigator.geolocation.watchPosition(
      ({ coords }) => {
        const c: [number, number] = [coords.longitude, coords.latitude];
        setUserLocation(c);
        // GPS heading is only valid when the device is moving — keep last valid value otherwise
        if (typeof coords.heading === 'number' && !isNaN(coords.heading)) {
          setUserHeading(coords.heading);
        }
        if (!flewOnce) {
          mapRef.current?.flyTo({ center: c, zoom: 15, duration: 1800 });
          flewOnce = true;
        }
      },
      () => toast({ variant: 'destructive', title: 'Xatolik', description: "Joylashuvingizni aniqlab bo'lmadi." }),
      { enableHighAccuracy: true, maximumAge: 1000, timeout: 15000 },
    );

    // Compass — DeviceOrientationEvent (works on phones; desktop usually has none)
    type IOSDeviceOrientationEvent = typeof DeviceOrientationEvent & {
      requestPermission?: () => Promise<'granted' | 'denied'>;
    };
    const Doe = DeviceOrientationEvent as IOSDeviceOrientationEvent | undefined;
    try {
      if (Doe?.requestPermission) {
        const status = await Doe.requestPermission();
        if (status !== 'granted') return;
      }
    } catch { /* iOS may throw without user gesture — silent */ }

    const handler = (e: DeviceOrientationEvent) => {
      // iOS exposes a true compass heading via webkitCompassHeading
      const ios = (e as DeviceOrientationEvent & { webkitCompassHeading?: number }).webkitCompassHeading;
      if (typeof ios === 'number') {
        setUserHeading(ios);
      } else if (e.alpha != null) {
        // Android: alpha is rotation around Z axis, counter-clockwise from north
        setUserHeading((360 - e.alpha) % 360);
      }
    };
    window.addEventListener('deviceorientationabsolute', handler as EventListener);
    window.addEventListener('deviceorientation', handler as EventListener);
    compassCleanupRef.current = () => {
      window.removeEventListener('deviceorientationabsolute', handler as EventListener);
      window.removeEventListener('deviceorientation', handler as EventListener);
    };
  };

  // ── Layer visibility helpers ──────────────────────────────────────────────

  const isLayerOn = (geoType: GeoLayerType): boolean => {
    const toggle: LayerToggle = GEO_TO_LAYER_TOGGLE[geoType];
    return activeLayers.includes(toggle);
  };

  // ── Paint expressions ─────────────────────────────────────────────────────

  // Circle paint for point layers — selected feature gets a larger radius
  const circlePaint = useCallback(
    (geoType: GeoLayerType) => {
      const cfg = LAYER_VISUAL[geoType];
      const isSelected = selectedFeature?.layerType === geoType;
      return {
        'circle-color': cfg.color,
        'circle-radius': [
          'case',
          isSelected ? ['==', ['id'], selectedFeature!.id] : ['literal', false],
          11,
          cfg.circleRadius ?? 7,
        ] as any,
        'circle-stroke-color': cfg.strokeColor,
        'circle-stroke-width': cfg.circleStrokeWidth ?? 2,
        'circle-opacity': 0.92,
      };
    },
    [selectedFeature],
  );

  // Fill opacity for boundary layers — hovered / selected feature gets higher opacity
  const polygonFillPaint = useCallback(
    (geoType: GeoLayerType) => {
      const cfg = LAYER_VISUAL[geoType];
      const baseOpacity = cfg.fillOpacity ?? 0.08;
      const isHoveredType = hoveredLayer === geoType;
      const isSelectedType = selectedFeature?.layerType === geoType;
      return {
        'fill-color': cfg.color,
        'fill-opacity': [
          'case',
          isSelectedType ? ['==', ['id'], selectedFeature!.id] : ['literal', false],
          baseOpacity * 4,
          isHoveredType ? ['==', ['id'], hoveredId ?? -1] : ['literal', false],
          baseOpacity * 2.5,
          baseOpacity,
        ] as any,
      };
    },
    [hoveredLayer, hoveredId, selectedFeature],
  );

  const polygonStrokePaint = useCallback(
    (geoType: GeoLayerType) => {
      const cfg = LAYER_VISUAL[geoType];
      return {
        'line-color': cfg.strokeColor,
        'line-width': cfg.strokeWidth ?? 1,
        'line-opacity': 0.6,
      };
    },
    [],
  );

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <main className="relative h-full w-full bg-muted overflow-hidden">
      <Map
        ref={mapRef}
        initialViewState={INITIAL_VIEW}
        onClick={handleMapClick}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        style={{ width: '100%', height: '100%' }}
        mapStyle={basemapUrl}
        interactiveLayerIds={INTERACTIVE_LAYER_IDS}
        maxBounds={UZBEKISTAN_BOUNDS}
        minZoom={isMobile ? UZBEKISTAN_MOBILE_MIN_ZOOM : UZBEKISTAN_MIN_ZOOM}
        maxZoom={UZBEKISTAN_MAX_ZOOM}
      >
        {/* Zoom buttons — only show on desktop, mobile uses pinch-to-zoom */}
        {!isMobile && <NavigationControl position="bottom-right" />}

        {/* Outside-Uzbekistan dimming mask */}
        {uzbekistanMask && (
          <Source id="uzbekistan-mask" type="geojson" data={uzbekistanMask}>
            <Layer
              id="uzbekistan-mask-layer"
              type="fill"
              paint={{ 'fill-color': '#0F172A', 'fill-opacity': 0.12 }}
            />
          </Source>
        )}

        {/* ── Boundary layers (drawn below point layers) ─────────────────── */}

        {isLayerOn('viloyat') && geoState.viloyat && (
          <Source id="viloyat-source" type="geojson" data={geoState.viloyat.fc}>
            <Layer id="viloyat-fill" type="fill" paint={polygonFillPaint('viloyat')} />
            <Layer id="viloyat-stroke" type="line" paint={polygonStrokePaint('viloyat')} />
          </Source>
        )}

        {isLayerOn('tuman') && geoState.tuman && (
          <Source id="tuman-source" type="geojson" data={geoState.tuman.fc}>
            {/* Hide tuman details when zoomed out — too cluttered + heavy on mobile */}
            <Layer id="tuman-fill"   type="fill" minzoom={7} paint={polygonFillPaint('tuman')} />
            <Layer id="tuman-stroke" type="line" minzoom={7} paint={polygonStrokePaint('tuman')} />
          </Source>
        )}

        {isLayerOn('mahalla') && geoState.mahalla && (
          <Source id="mahalla-source" type="geojson" data={geoState.mahalla.fc}>
            {/* Mahalla polygons are huge — only render when user has zoomed in */}
            <Layer id="mahalla-fill"   type="fill" minzoom={10} paint={polygonFillPaint('mahalla')} />
            <Layer id="mahalla-stroke" type="line" minzoom={10} paint={polygonStrokePaint('mahalla')} />
          </Source>
        )}

        {/* ── Country border (always visible, drawn on top of boundary fills) */}
        {uzbekistanBoundary && (
          <Source id="uzbekistan-boundary" type="geojson" data={uzbekistanBoundary}>
            <Layer
              id="uzbekistan-boundary-layer"
              type="line"
              paint={{ 'line-color': '#2563EB', 'line-width': 2.5, 'line-opacity': 0.8 }}
            />
          </Source>
        )}

        {/* ── Point layers ──────────────────────────────────────────────────── */}

        {isLayerOn('state-clinics') && geoState['state-clinics'] && (
          <Source id="state-clinics-source" type="geojson" data={geoState['state-clinics'].fc}>
            <Layer id="state-clinics-layer" type="circle" paint={circlePaint('state-clinics')} />
          </Source>
        )}

        {isLayerOn('private-clinics') && geoState['private-clinics'] && (
          <Source id="private-clinics-source" type="geojson" data={geoState['private-clinics'].fc}>
            <Layer id="private-clinics-layer" type="circle" paint={circlePaint('private-clinics')} />
          </Source>
        )}

        {isLayerOn('pharmacies') && geoState.pharmacies && (
          <Source id="pharmacies-source" type="geojson" data={geoState.pharmacies.fc}>
            <Layer id="pharmacies-layer" type="circle" paint={circlePaint('pharmacies')} />
          </Source>
        )}

        {/* ── Route layers (glow + animated dashes + endpoints) ─────────────── */}
        {route && (
          <>
            <Source id="route-source" type="geojson" data={route.geojson}>
              {/* Outer glow */}
              <Layer
                id="route-line-glow"
                type="line"
                layout={{ 'line-cap': 'round', 'line-join': 'round' }}
                paint={{
                  'line-color': '#3B82F6',
                  'line-width': 16,
                  'line-opacity': 0.18,
                  'line-blur': 6,
                }}
              />
              {/* Solid base */}
              <Layer
                id="route-line-base"
                type="line"
                layout={{ 'line-cap': 'round', 'line-join': 'round' }}
                paint={{
                  'line-color': '#1D4ED8',
                  'line-width': 6,
                  'line-opacity': 0.85,
                }}
              />
              {/* Animated marching-ants flow on top */}
              <Layer
                id="route-line-flow"
                type="line"
                layout={{ 'line-cap': 'butt', 'line-join': 'round' }}
                paint={{
                  'line-color': '#FFFFFF',
                  'line-width': 3,
                  'line-opacity': 0.95,
                  'line-dasharray': [0, 4, 3],
                }}
              />
            </Source>

            {/* Origin marker — tracks live position during navigation */}
            {isNavigating ? (
              // In navigation mode: rotating chevron arrow (Google/Yandex style)
              <Marker
                longitude={(livePosition ?? route.from)[0]}
                latitude={(livePosition ?? route.from)[1]}
                anchor="center"
              >
                <NavArrow heading={navBearing} />
              </Marker>
            ) : (
              // In preview mode: green dot with halo
              <Source
                id="route-origin"
                type="geojson"
                data={{ type: 'Feature', geometry: { type: 'Point', coordinates: route.from }, properties: {} }}
              >
                <Layer
                  id="route-origin-halo"
                  type="circle"
                  paint={{ 'circle-radius': 16, 'circle-color': '#10B981', 'circle-opacity': 0.18 }}
                />
                <Layer
                  id="route-origin-dot"
                  type="circle"
                  paint={{
                    'circle-radius': 7,
                    'circle-color': '#10B981',
                    'circle-stroke-color': '#FFFFFF',
                    'circle-stroke-width': 3,
                  }}
                />
              </Source>
            )}

            {/* Destination marker with pulsing halo */}
            <Source
              id="route-destination"
              type="geojson"
              data={{ type: 'Feature', geometry: { type: 'Point', coordinates: route.to }, properties: {} }}
            >
              <Layer
                id="route-destination-pulse"
                type="circle"
                paint={{ 'circle-radius': 14, 'circle-color': '#EF4444', 'circle-opacity': 0.4 }}
              />
              <Layer
                id="route-destination-dot"
                type="circle"
                paint={{
                  'circle-radius': 9,
                  'circle-color': '#EF4444',
                  'circle-stroke-color': '#FFFFFF',
                  'circle-stroke-width': 3,
                }}
              />
            </Source>
          </>
        )}

        {/* ── Popup for selected point feature ──────────────────────────────── */}
        {selectedFeature?.coordinates && (
          <Popup
            longitude={selectedFeature.coordinates[0]}
            latitude={selectedFeature.coordinates[1]}
            onClose={() => setSelectedFeature(null)}
            closeButton={false}
            closeOnClick={false}
            anchor="bottom"
            offset={18}
            className="z-50"
          >
            <div className="px-3 py-2 max-w-[220px]">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground leading-none mb-1">
                {LAYER_VISUAL[selectedFeature.layerType].label}
              </p>
              <p className="text-sm font-bold text-foreground leading-tight line-clamp-2">
                {selectedFeature.name}
              </p>
              {selectedFeature.district && (
                <p className="text-xs text-muted-foreground mt-0.5">{selectedFeature.district}</p>
              )}
            </div>
          </Popup>
        )}

        {/* ── User location with directional arrow ──────────────────────────── */}
        {userLocation && (
          <Marker longitude={userLocation[0]} latitude={userLocation[1]} anchor="center">
            <UserLocationDot heading={userHeading} />
          </Marker>
        )}
      </Map>

      {/* ── Floating controls (hidden during navigation) ──────────────────── */}
      {/* Top-left: filter toggle */}
      <div className={cn(
        "absolute top-4 left-4 z-10 transition-opacity duration-300 lg:top-6 lg:left-6",
        "[padding-top:env(safe-area-inset-top)]",
        isNavigating && "pointer-events-none opacity-0",
      )}>
        {!isFilterOpen && (
          <Button
            variant="default"
            size="icon"
            onClick={() => setIsFilterOpen(true)}
            title="Filtrlarni ochish"
            className="h-11 w-11 rounded-xl shadow-xl hover:scale-105 active:scale-95 transition-all"
          >
            <Filter className="h-5 w-5" />
          </Button>
        )}
      </div>

      {/* Top-right: basemap / locate / reset cluster */}
      <div className={cn(
        "absolute top-4 right-4 z-10 flex flex-col gap-2 transition-opacity duration-300 lg:top-6 lg:right-6",
        "[padding-top:env(safe-area-inset-top)]",
        isNavigating && "pointer-events-none opacity-0",
      )}>
        <BasemapSwitcher />
        <Button
          variant="secondary"
          size="icon"
          onClick={handleLocateMe}
          title="Mening joylashuvim"
          className="h-11 w-11 rounded-xl shadow-lg shadow-black/5 hover:scale-105 active:scale-95 transition-all"
        >
          <Navigation className="h-5 w-5" />
          <span className="sr-only">Mening joylashuvim</span>
        </Button>
        <Button
          variant="secondary"
          size="icon"
          onClick={handleResetView}
          title="O'zbekistonga qaytish"
          className="h-11 w-11 rounded-xl shadow-lg shadow-black/5 hover:scale-105 active:scale-95 transition-all"
        >
          <LocateFixed className="h-5 w-5" />
          <span className="sr-only">O'zbekistonga qaytish</span>
        </Button>
      </div>

      {/* Floating route metrics card */}
      <RouteHud />

      {/* Layer loading indicators — small dots when a layer is still loading */}
      {!isNavigating && (
        <LayerLoadingIndicator geoState={geoState} activeLayers={activeLayers} />
      )}
    </main>
  );
}

// ── Floating route HUD (visible whenever a route is active) ──────────────────

function RouteHud() {
  const { route, clearRoutes, isNavigating } = useMap();
  if (!route || isNavigating) return null;
  const km = route.distanceMeters >= 1000
    ? `${(route.distanceMeters / 1000).toFixed(route.distanceMeters < 10000 ? 1 : 0)} km`
    : `${Math.round(route.distanceMeters)} m`;
  const min = Math.round(route.durationSeconds / 60);
  const time = min < 60 ? `${min} min` : `${Math.floor(min / 60)}h ${min % 60}m`;

  return (
    <div className="pointer-events-auto absolute top-6 left-1/2 z-20 -translate-x-1/2 animate-in fade-in slide-in-from-top-4 duration-500">
      <div className="flex items-center gap-3 rounded-2xl border border-white/40 bg-white/85 px-4 py-2.5 shadow-2xl shadow-primary/20 backdrop-blur-md">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-indigo-600 text-white shadow-md">
          <Navigation className="h-4 w-4" />
        </div>
        <div className="flex items-center gap-3">
          <div>
            <p className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground leading-none">Masofa</p>
            <p className="text-base font-black tabular-nums leading-tight">{km}</p>
          </div>
          <div className="h-7 w-px bg-border" />
          <div>
            <p className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground leading-none">Vaqt</p>
            <p className="text-base font-black tabular-nums leading-tight">{time}</p>
          </div>
        </div>
        <button
          onClick={clearRoutes}
          className="ml-1 flex h-7 w-7 items-center justify-center rounded-full bg-muted/60 hover:bg-muted transition-colors"
          aria-label="Yopish"
        >
          <span className="text-base leading-none">×</span>
        </button>
      </div>
    </div>
  );
}

// ── Small loading indicator ────────────────────────────────────────────────────

function LayerLoadingIndicator({
  geoState,
  activeLayers,
}: {
  geoState: GeoState;
  activeLayers: string[];
}) {
  const pending = (Object.keys(GEO_TO_LAYER_TOGGLE) as GeoLayerType[]).filter(type => {
    const toggle = GEO_TO_LAYER_TOGGLE[type];
    return activeLayers.includes(toggle) && !geoState[type];
  });

  if (pending.length === 0) return null;

  return (
    <div className="absolute bottom-20 left-1/2 -translate-x-1/2 z-10 lg:bottom-6">
      <div className="flex items-center gap-2 rounded-full bg-white/90 px-3 py-1.5 text-xs text-slate-600 shadow-md backdrop-blur-sm border border-slate-100">
        <div className="h-2 w-2 animate-pulse rounded-full bg-primary" />
        Qatlamlar yuklanmoqda…
      </div>
    </div>
  );
}

// ── Navigation arrow: rotating chevron pointing in the direction of travel ──

function NavArrow({ heading }: { heading: number | null }) {
  const angle = typeof heading === 'number' && !isNaN(heading) ? heading : 0;
  return (
    <div className="pointer-events-none relative flex h-14 w-14 items-center justify-center">
      {/* Soft accuracy halo behind the arrow */}
      <div
        className="absolute h-14 w-14 rounded-full bg-blue-500/20"
        style={{ filter: 'blur(2px)' }}
      />
      {/* The chevron itself — rotates by the smoothed movement bearing */}
      <svg
        width="46"
        height="46"
        viewBox="-23 -23 46 46"
        className="relative drop-shadow-[0_4px_8px_rgba(37,99,235,0.45)]"
        style={{
          transform: `rotate(${angle}deg)`,
          transformOrigin: 'center',
          transition: 'transform 250ms linear',
        }}
      >
        {/* Outer white ring (gives the arrow a clean edge against the map) */}
        <path
          d="M 0 -18 L 13 14 L 0 8 L -13 14 Z"
          fill="#FFFFFF"
          stroke="#FFFFFF"
          strokeWidth="3"
          strokeLinejoin="round"
        />
        {/* Filled blue chevron */}
        <path
          d="M 0 -18 L 13 14 L 0 8 L -13 14 Z"
          fill="#2563EB"
          stroke="#1D4ED8"
          strokeWidth="0.8"
          strokeLinejoin="round"
        />
      </svg>
    </div>
  );
}

// ── User location: rotating Google-Maps-style cone + dot ─────────────────────

function UserLocationDot({ heading }: { heading: number | null }) {
  const hasHeading = typeof heading === 'number' && !isNaN(heading);
  return (
    <div className="pointer-events-none relative flex h-12 w-12 items-center justify-center">
      {/* Direction cone — only when we have a heading */}
      {hasHeading && (
        <svg
          width="80"
          height="80"
          viewBox="-40 -40 80 80"
          className="absolute inset-1/2 -translate-x-1/2 -translate-y-1/2 overflow-visible"
          style={{
            transform: `translate(-50%, -50%) rotate(${heading}deg)`,
            transition: 'transform 200ms linear',
            pointerEvents: 'none',
          }}
        >
          <defs>
            <radialGradient id="userConeGradient" cx="50%" cy="100%" r="100%">
              <stop offset="0%" stopColor="#3B82F6" stopOpacity="0.7" />
              <stop offset="60%" stopColor="#3B82F6" stopOpacity="0.15" />
              <stop offset="100%" stopColor="#3B82F6" stopOpacity="0" />
            </radialGradient>
          </defs>
          {/* Wedge: apex at the dot center (0,0), fans outward upward */}
          <path d="M 0 0 L -22 -34 A 40 40 0 0 1 22 -34 Z" fill="url(#userConeGradient)" />
        </svg>
      )}

      {/* Pulsing halo */}
      <div className="absolute h-12 w-12 animate-ping rounded-full bg-blue-500/25" style={{ animationDuration: '2s' }} />

      {/* Solid blue dot with white ring */}
      <div className="relative h-4 w-4 rounded-full bg-blue-600 shadow-md ring-[3px] ring-white" />
    </div>
  );
}
