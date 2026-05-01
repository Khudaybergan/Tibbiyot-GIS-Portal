"use client";

import { useContext } from "react";
import { MapContext, type MapContextType } from "@/context/map-provider";

export const useMap = (): MapContextType => {
  const context = useContext(MapContext);
  if (context === undefined) {
    throw new Error("useMap must be used within a MapProvider");
  }
  return context;
};
