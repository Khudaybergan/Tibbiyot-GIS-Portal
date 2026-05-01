
'use client';

import { PublicFilterPanel } from "@/components/map/public-filter-panel";
import { MapView } from "@/components/map/map-view";
import { PublicDetailsPanel } from "@/components/map/public-details-panel";
import { MapProvider } from "@/context/map-provider";
import { PublicHeader } from "@/components/public/public-header";
import { useMap } from "@/hooks/use-map";
import { cn } from "@/lib/utils";

function MapPageContent() {
  const { isFilterOpen, isDetailsOpen } = useMap();

  return (
    <div className="relative flex h-screen w-screen flex-col overflow-hidden bg-background">
      <PublicHeader />
      <div className="relative flex-1 overflow-hidden">
        <div 
          className={cn(
            "grid h-full w-full transition-all duration-300 ease-in-out overflow-hidden",
            isFilterOpen && isDetailsOpen ? "lg:grid-cols-[380px_1fr_400px]" :
            isFilterOpen && !isDetailsOpen ? "lg:grid-cols-[380px_1fr_0px]" :
            !isFilterOpen && isDetailsOpen ? "lg:grid-cols-[0px_1fr_400px]" :
            "lg:grid-cols-[0px_1fr_0px]"
          )}
        >
          <PublicFilterPanel />
          <div className="relative h-full w-full">
            <MapView />
          </div>
          <PublicDetailsPanel />
        </div>
      </div>
    </div>
  );
}

export default function Home() {
  return (
    <MapProvider>
      <MapPageContent />
    </MapProvider>
  );
}
