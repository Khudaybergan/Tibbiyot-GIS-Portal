"use client";

import 'maplibre-gl/dist/maplibre-gl.css';
import { useRef, useEffect, useState } from "react";
import Map, { Marker, NavigationControl, type MapRef } from 'react-map-gl/maplibre';
import { 
  UZBEKISTAN_BOUNDS, 
  UZBEKISTAN_CENTER 
} from '@/lib/map/uzbekistan-map';
import { Button } from "@/components/ui/button";
import { LocateFixed, MapPin, Navigation, Trash2 } from "lucide-react";
import { defaultBasemap } from "@/lib/basemaps";
import { cn } from "@/lib/utils";

interface LocationSelectorMapProps {
  lat?: number;
  lng?: number;
  onLocationSelect: (lat: number, lng: number) => void;
  isInvalid?: boolean;
}

export function LocationSelectorMap({ lat, lng, onLocationSelect, isInvalid }: LocationSelectorMapProps) {
  const mapRef = useRef<MapRef>(null);
  const [viewState, setViewState] = useState({
    longitude: lng || UZBEKISTAN_CENTER[0],
    latitude: lat || UZBEKISTAN_CENTER[1],
    zoom: lat && lng ? 14 : 5.8
  });

  useEffect(() => {
    if (lat && lng && (lat !== viewState.latitude || lng !== viewState.longitude)) {
      setViewState({
        longitude: lng,
        latitude: lat,
        zoom: 14
      });
      mapRef.current?.flyTo({
        center: [lng, lat],
        zoom: 14,
        duration: 1000
      });
    }
  }, [lat, lng]);

  const handleMapClick = (e: any) => {
    const { lng: newLng, lat: newLat } = e.lngLat;
    onLocationSelect(newLat, newLng);
  };

  const handleMarkerDragEnd = (e: any) => {
    const { lng: newLng, lat: newLat } = e.lngLat;
    onLocationSelect(newLat, newLng);
  };

  const handleResetView = () => {
    mapRef.current?.fitBounds(UZBEKISTAN_BOUNDS, { padding: 40, duration: 1000 });
  };

  return (
    <div className={cn(
      "relative h-[450px] w-full rounded-xl border-2 overflow-hidden transition-all duration-300",
      isInvalid ? "border-destructive/50 ring-2 ring-destructive/10" : "border-slate-200"
    )}>
      <Map
        ref={mapRef}
        {...viewState}
        onMove={evt => setViewState(evt.viewState)}
        onClick={handleMapClick}
        style={{ width: '100%', height: '100%' }}
        mapStyle={defaultBasemap.url}
        maxBounds={UZBEKISTAN_BOUNDS}
      >
        <NavigationControl position="top-right" />
        
        {lat && lng && (
          <Marker 
            longitude={lng} 
            latitude={lat} 
            draggable 
            onDragEnd={handleMarkerDragEnd}
            anchor="bottom"
          >
            <div className="group relative">
               <MapPin 
                className={cn(
                  "h-10 w-10 drop-shadow-lg transition-transform hover:scale-110 active:scale-95 cursor-grab active:cursor-grabbing",
                  isInvalid ? "text-destructive" : "text-primary"
                )} 
                fill="currentColor" 
                stroke="#fff" 
                strokeWidth={2} 
              />
              <div className="absolute -top-10 left-1/2 -translate-x-1/2 bg-slate-900 text-white text-[10px] px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
                Surg'uting
              </div>
            </div>
          </Marker>
        )}
      </Map>

      <div className="absolute bottom-4 left-4 flex flex-col gap-2">
        <Button 
          type="button"
          variant="secondary" 
          size="sm" 
          onClick={handleResetView}
          className="shadow-md bg-white/90 backdrop-blur hover:bg-white"
        >
          <LocateFixed className="mr-2 h-4 w-4" />
          O'zbekistonga qaytish
        </Button>
      </div>

      {!lat && !lng && (
        <div className="absolute inset-0 flex items-center justify-center bg-slate-900/10 backdrop-blur-[1px] pointer-events-none">
          <div className="bg-white/95 px-6 py-3 rounded-full border shadow-xl text-sm font-bold text-slate-800 animate-bounce flex items-center gap-2">
            <Navigation className="h-4 w-4 text-primary animate-pulse" />
            Joylashuvni tanlash uchun xaritaga bosing
          </div>
        </div>
      )}
    </div>
  );
}
