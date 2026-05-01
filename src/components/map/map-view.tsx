"use client";

import 'maplibre-gl/dist/maplibre-gl.css';
import { useMemo, useState, useEffect, useRef, useCallback } from "react";
import Map, { Popup, Source, Layer, NavigationControl, type MapRef } from 'react-map-gl/maplibre';
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
  } = useMap();

  // ── Load Uzbekistan base boundary ─────────────────────────────────────────
  useEffect(() => {
    fetch('/geo/uzbekistan.geojson')
      .then(r => r.json())
      .then(data => {
        setUzbekistanBoundary(data);
        setUzbekistanMask(createUzbekistanMask(data));
      })
      .catch(err => console.error('[map] uzbekistan boundary load failed:', err));
  }, []);

  // ── Load all geo layers on mount ──────────────────────────────────────────
  useEffect(() => {
    const set = (type: GeoLayerType, data: LayerData) =>
      setGeoState(prev => ({ ...prev, [type]: data }));

    loadDavlatTibbiyot().then(d => set('state-clinics', d));
    loadKlinikalar().then(d => set('private-clinics', d));
    loadDorixonalar().then(d => set('pharmacies', d));
    loadViloyat().then(d => set('viloyat', d));
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

  // ── Map interactions ──────────────────────────────────────────────────────

  const handleMapClick = useCallback((e: MapLayerMouseEvent) => {
    const clickedLayerFeature = e.features?.find(f => MAP_LAYER_TO_GEO[f.layer.id]);
    if (!clickedLayerFeature) {
      setSelectedFeature(null);
      return;
    }

    const geoLayerType = MAP_LAYER_TO_GEO[clickedLayerFeature.layer.id];
    const featureId = clickedLayerFeature.id as number;
    const found = geoState[geoLayerType]?.features[featureId];
    if (found) setSelectedFeature(found);
  }, [geoState, setSelectedFeature]);

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

  const handleLocateMe = () => {
    if (!navigator.geolocation) {
      toast({ variant: 'destructive', title: 'Xatolik', description: "Geolokatsiya qo'llab-quвvatlanmaydi." });
      return;
    }
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        const { longitude, latitude } = coords;
        setUserLocation([longitude, latitude]);
        mapRef.current?.flyTo({ center: [longitude, latitude], zoom: 14, duration: 2000 });
      },
      () => toast({ variant: 'destructive', title: 'Xatolik', description: "Joylashuvingizni aniqlab bo'lmadi." }),
    );
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
        <NavigationControl position="bottom-right" />

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
            <Layer id="tuman-fill" type="fill" paint={polygonFillPaint('tuman')} />
            <Layer id="tuman-stroke" type="line" paint={polygonStrokePaint('tuman')} />
          </Source>
        )}

        {isLayerOn('mahalla') && geoState.mahalla && (
          <Source id="mahalla-source" type="geojson" data={geoState.mahalla.fc}>
            <Layer id="mahalla-fill" type="fill" paint={polygonFillPaint('mahalla')} />
            <Layer id="mahalla-stroke" type="line" paint={polygonStrokePaint('mahalla')} />
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

        {/* ── User location ─────────────────────────────────────────────────── */}
        {userLocation && (
          <Source
            id="user-location-source"
            type="geojson"
            data={{ type: 'Feature', geometry: { type: 'Point', coordinates: userLocation }, properties: {} }}
          >
            <Layer
              id="user-location-pulse"
              type="circle"
              paint={{
                'circle-radius': 14,
                'circle-color': '#2563EB',
                'circle-opacity': 0.2,
              }}
            />
            <Layer
              id="user-location-dot"
              type="circle"
              paint={{
                'circle-radius': 6,
                'circle-color': '#2563EB',
                'circle-stroke-color': '#ffffff',
                'circle-stroke-width': 2,
              }}
            />
          </Source>
        )}
      </Map>

      {/* ── Floating controls ─────────────────────────────────────────────── */}
      <div className="absolute top-6 left-6 z-10 flex flex-col gap-3">
        {!isFilterOpen && (
          <Button
            variant="default"
            size="icon"
            onClick={() => setIsFilterOpen(true)}
            title="Filtrlarni ochish"
            className="rounded-xl shadow-xl hover:scale-105 active:scale-95 transition-all h-12 w-12"
          >
            <Filter className="h-6 w-6" />
          </Button>
        )}
        <BasemapSwitcher />
        <Button
          variant="secondary"
          size="icon"
          onClick={handleLocateMe}
          title="Mening joylashuvim"
          className="rounded-xl shadow-lg shadow-black/5 hover:scale-105 active:scale-95 transition-all"
        >
          <Navigation className="h-5 w-5" />
          <span className="sr-only">Mening joylashuvim</span>
        </Button>
        <Button
          variant="secondary"
          size="icon"
          onClick={handleResetView}
          title="O'zbekistonga qaytish"
          className="rounded-xl shadow-lg shadow-black/5 hover:scale-105 active:scale-95 transition-all"
        >
          <LocateFixed className="h-5 w-5" />
          <span className="sr-only">O'zbekistonga qaytish</span>
        </Button>
      </div>

      {/* Mobile bottom filter button */}
      <div className="absolute bottom-6 left-1/2 z-10 -translate-x-1/2 lg:hidden">
        <Button
          size="lg"
          className="rounded-full shadow-2xl shadow-primary/20"
          onClick={() => setIsFilterOpen(true)}
        >
          <Filter className="mr-2 h-4 w-4" /> Filtrlar
        </Button>
      </div>

      {/* Layer loading indicators — small dots when a layer is still loading */}
      <LayerLoadingIndicator geoState={geoState} activeLayers={activeLayers} />
    </main>
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
