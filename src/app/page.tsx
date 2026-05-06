'use client';

import { PublicFilterPanel } from "@/components/map/public-filter-panel";
import { MapView } from "@/components/map/map-view";
import { PublicDetailsPanel } from "@/components/map/public-details-panel";
import { NavigationOverlay } from "@/components/map/navigation-overlay";
import { MapProvider } from "@/context/map-provider";
import { PublicHeader } from "@/components/public/public-header";
import { useMap } from "@/hooks/use-map";
import { cn } from "@/lib/utils";

function MapPageContent() {
  const { isNavigating, isFilterOpen, setIsFilterOpen } = useMap();

  return (
    // 100dvh respects mobile browser chrome (URL bar) — avoids the classic
    // "bottom of UI cut off on iOS Safari" problem.
    <div className="relative flex h-[100dvh] w-screen flex-col overflow-hidden bg-background">
      <div className={cn(
        "transition-all duration-300",
        isNavigating && "pointer-events-none -translate-y-full opacity-0",
      )}>
        <PublicHeader />
      </div>

      <div className="relative flex-1 overflow-hidden">
        {/* Map is always the full-bleed background */}
        <div className="absolute inset-0">
          <MapView />
        </div>

        {/* Mobile-only scrim — taps it to dismiss the filter drawer */}
        {isFilterOpen && (
          <button
            type="button"
            aria-label="Yopish"
            onClick={() => setIsFilterOpen(false)}
            className="absolute inset-0 z-20 bg-black/30 backdrop-blur-[1px] lg:hidden animate-in fade-in duration-200"
          />
        )}

        {/* Panels are floating overlays */}
        <PublicFilterPanel />
        <PublicDetailsPanel />
      </div>

      <NavigationOverlay />
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
