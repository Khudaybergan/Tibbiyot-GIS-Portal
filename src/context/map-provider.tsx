"use client";

import { createContext, useState, useCallback, type ReactNode } from "react";
import type { Layer, BasemapId } from "@/lib/types";
import type { GeoFeature } from "@/lib/geo/types";
import { defaultBasemap, basemaps } from "@/lib/basemaps";

export type MapContextType = {
  // Layer visibility toggles
  activeLayers: Layer[];
  toggleLayer: (layer: Layer) => void;

  // Selected feature from any layer (point or polygon)
  selectedFeature: GeoFeature | null;
  setSelectedFeature: (f: GeoFeature | null) => void;

  // Route display (transport convenience section)
  showRoute: boolean;
  setShowRoute: (show: boolean) => void;

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
  const [showRoute, setShowRoute] = useState(false);
  const [basemapId, setBasemapId] = useState<BasemapId>(defaultBasemap.id);
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);

  const basemapUrl = basemaps.find(b => b.id === basemapId)?.url ?? defaultBasemap.url;

  const toggleLayer = (layer: Layer) => {
    setActiveLayers(prev =>
      prev.includes(layer) ? prev.filter(l => l !== layer) : [...prev, layer]
    );
  };

  const setSelectedFeature = useCallback((f: GeoFeature | null) => {
    setSelectedFeatureRaw(f);
    setShowRoute(false);
    setIsDetailsOpen(f !== null);
  }, []);

  return (
    <MapContext.Provider
      value={{
        activeLayers,
        toggleLayer,
        selectedFeature,
        setSelectedFeature,
        showRoute,
        setShowRoute,
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
