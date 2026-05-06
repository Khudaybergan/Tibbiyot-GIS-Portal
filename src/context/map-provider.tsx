"use client";

import { createContext, useState, useCallback, useRef, useEffect, type ReactNode } from "react";
import type { Layer, BasemapId } from "@/lib/types";
import type { GeoFeature } from "@/lib/geo/types";
import { defaultBasemap, basemaps } from "@/lib/basemaps";
import {
  fetchAllRoutes,
  getCurrentPosition,
  type AllRoutes,
  type RouteProfile,
  type RouteResult,
} from "@/lib/map/routing";

export type MapContextType = {
  // Layer visibility toggles
  activeLayers: Layer[];
  toggleLayer: (layer: Layer) => void;

  // Selected feature from any layer (point or polygon)
  selectedFeature: GeoFeature | null;
  setSelectedFeature: (f: GeoFeature | null) => void;

  // Routes — fetched as a triple, currently displayed one is derived
  routes: AllRoutes | null;
  routesLoading: boolean;
  routesError: string | null;
  routeProfile: RouteProfile;
  setRouteProfile: (p: RouteProfile) => void;
  route: RouteResult | null;                            // = routes?.[routeProfile]
  buildRoutes: (to: [number, number]) => Promise<void>;
  clearRoutes: () => void;

  // Live navigation
  isNavigating: boolean;
  startNavigation: () => void;
  endNavigation: () => void;
  livePosition: [number, number] | null;
  liveSpeedMps: number | null;                          // from Geolocation.speed if available
  liveHeading: number | null;                           // degrees, for camera bearing

  // Basemap
  basemapId: BasemapId;
  setBasemapId: (id: BasemapId) => void;
  basemapUrl: string;

  // Panel visibility
  isFilterOpen: boolean;
  setIsFilterOpen: (open: boolean) => void;
  isDetailsOpen: boolean;
  setIsDetailsOpen: (open: boolean) => void;
};

export const MapContext = createContext<MapContextType | undefined>(undefined);

export function MapProvider({ children }: { children: ReactNode }) {
  const [activeLayers, setActiveLayers] = useState<Layer[]>(["state-clinics", "private-clinics"]);
  const [selectedFeature, setSelectedFeatureRaw] = useState<GeoFeature | null>(null);
  const [basemapId, setBasemapId] = useState<BasemapId>(defaultBasemap.id);
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);

  const [routes, setRoutes] = useState<AllRoutes | null>(null);
  const [routesLoading, setRoutesLoading] = useState(false);
  const [routesError, setRoutesError] = useState<string | null>(null);
  const [routeProfile, setRouteProfile] = useState<RouteProfile>('driving');
  const abortRef = useRef<AbortController | null>(null);

  const [isNavigating, setIsNavigating] = useState(false);
  const [livePosition, setLivePosition] = useState<[number, number] | null>(null);
  const [liveSpeedMps, setLiveSpeedMps] = useState<number | null>(null);
  const [liveHeading, setLiveHeading] = useState<number | null>(null);
  const watchIdRef = useRef<number | null>(null);

  const basemapUrl = basemaps.find(b => b.id === basemapId)?.url ?? defaultBasemap.url;
  const route = routes?.[routeProfile] ?? null;

  const toggleLayer = (layer: Layer) => {
    setActiveLayers(prev =>
      prev.includes(layer) ? prev.filter(l => l !== layer) : [...prev, layer]
    );
  };

  const stopWatch = useCallback(() => {
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
  }, []);

  const clearRoutes = useCallback(() => {
    abortRef.current?.abort();
    setRoutes(null);
    setRoutesLoading(false);
    setRoutesError(null);
    setIsNavigating(false);
    setLivePosition(null);
    setLiveSpeedMps(null);
    setLiveHeading(null);
    stopWatch();
  }, [stopWatch]);

  const setSelectedFeature = useCallback((f: GeoFeature | null) => {
    setSelectedFeatureRaw(f);
    setIsDetailsOpen(f !== null);
    abortRef.current?.abort();
    setRoutes(null);
    setRoutesLoading(false);
    setRoutesError(null);
    setIsNavigating(false);
    stopWatch();
    setLivePosition(null);
    setLiveSpeedMps(null);
    setLiveHeading(null);
  }, [stopWatch]);

  const buildRoutes = useCallback(async (to: [number, number]) => {
    abortRef.current?.abort();
    const ac = new AbortController();
    abortRef.current = ac;
    setRoutesLoading(true);
    setRoutesError(null);
    try {
      const from = await getCurrentPosition();
      const all = await fetchAllRoutes(from, to, ac.signal);
      if (!ac.signal.aborted) setRoutes(all);
    } catch (err) {
      if (!ac.signal.aborted) {
        setRoutesError((err as Error).message || "Marshrut qurib bo'lmadi");
        setRoutes(null);
      }
    } finally {
      if (!ac.signal.aborted) setRoutesLoading(false);
    }
  }, []);

  const startNavigation = useCallback(() => {
    if (!route) return;
    // Collapse every other UI surface — navigation mode is "map + route only"
    setIsFilterOpen(false);
    setIsDetailsOpen(false);
    setIsNavigating(true);
    if (!navigator.geolocation) return;
    // Seed with initial position so the UI shows immediately
    setLivePosition(route.from);
    watchIdRef.current = navigator.geolocation.watchPosition(
      pos => {
        setLivePosition([pos.coords.longitude, pos.coords.latitude]);
        setLiveSpeedMps(typeof pos.coords.speed === 'number' ? pos.coords.speed : null);
        setLiveHeading(typeof pos.coords.heading === 'number' ? pos.coords.heading : null);
      },
      () => { /* swallow — retain last known */ },
      { enableHighAccuracy: true, maximumAge: 1000, timeout: 15000 },
    );
  }, [route]);

  const endNavigation = useCallback(() => {
    setIsNavigating(false);
    stopWatch();
  }, [stopWatch]);

  // Cleanup watch on unmount
  useEffect(() => () => stopWatch(), [stopWatch]);

  return (
    <MapContext.Provider
      value={{
        activeLayers,
        toggleLayer,
        selectedFeature,
        setSelectedFeature,
        routes,
        routesLoading,
        routesError,
        routeProfile,
        setRouteProfile,
        route,
        buildRoutes,
        clearRoutes,
        isNavigating,
        startNavigation,
        endNavigation,
        livePosition,
        liveSpeedMps,
        liveHeading,
        basemapId,
        setBasemapId,
        basemapUrl,
        isFilterOpen,
        setIsFilterOpen,
        isDetailsOpen,
        setIsDetailsOpen,
      }}
    >
      {children}
    </MapContext.Provider>
  );
}
