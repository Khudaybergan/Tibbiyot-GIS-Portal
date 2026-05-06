"use client";

import { useEffect, useRef, useState } from "react";
import { useMap } from "@/hooks/use-map";
import { Check, Clock, Route, X } from "lucide-react";
import { formatDistance, haversineMeters } from "@/lib/map/routing";

/**
 * Navigation HUD — intentionally minimal.
 * Only shows remaining time + remaining distance + a close button.
 * Everything else (instructions, speed, progress, destination name) is removed
 * so the user's focus stays on the map and the route.
 */
export function NavigationOverlay() {
  const {
    isNavigating, endNavigation,
    route,
    livePosition, liveSpeedMps,
  } = useMap();

  // Re-render every second so ETA stays current even between GPS fixes
  const [, setTick] = useState(0);
  useEffect(() => {
    if (!isNavigating) return;
    const id = setInterval(() => setTick(t => t + 1), 1000);
    return () => clearInterval(id);
  }, [isNavigating]);

  // Confirmation state for the X button
  const [confirming, setConfirming] = useState(false);
  const confirmTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Auto-cancel confirmation if user doesn't act within 4 seconds
  useEffect(() => {
    if (!confirming) return;
    confirmTimerRef.current = setTimeout(() => setConfirming(false), 4000);
    return () => {
      if (confirmTimerRef.current) clearTimeout(confirmTimerRef.current);
    };
  }, [confirming]);

  // Reset confirmation if navigation ends externally (e.g. arrived)
  useEffect(() => {
    if (!isNavigating) setConfirming(false);
  }, [isNavigating]);

  if (!isNavigating || !route) return null;

  const currentPos = livePosition ?? route.from;

  // Crow-flies remaining distance to destination
  const remainingMeters = haversineMeters(currentPos, route.to);

  // Speed: prefer live GPS speed, fall back to route's average speed
  const avgMps = route.distanceMeters / route.durationSeconds;
  const effectiveMps = liveSpeedMps && liveSpeedMps > 0.5 ? liveSpeedMps : avgMps;
  const remainingSeconds = remainingMeters / Math.max(effectiveMps, 0.5);

  const min = Math.max(0, Math.round(remainingSeconds / 60));
  const timeStr = min < 60 ? `${min} min` : `${Math.floor(min / 60)} soat ${min % 60} min`;

  const arrived = remainingMeters < 30;

  return (
    <div
      className="pointer-events-none fixed inset-x-0 bottom-0 z-50 flex justify-center
                 [padding-bottom:max(1rem,env(safe-area-inset-bottom))]
                 animate-in fade-in slide-in-from-bottom duration-500"
    >
      {confirming ? (
        // Confirmation pill — single click on X turns into "Are you sure?"
        <div
          className="pointer-events-auto flex items-center gap-2 rounded-full
                     border border-white/15 bg-slate-900/95 px-2 py-2 pl-4
                     shadow-2xl backdrop-blur-xl ring-1 ring-black/20
                     animate-in fade-in zoom-in-95 duration-200"
        >
          <span className="text-sm font-semibold text-white px-1">Tugatishni tasdiqlaysizmi?</span>
          <button
            onClick={endNavigation}
            aria-label="Ha, tugatish"
            className="flex h-9 items-center gap-1.5 rounded-full bg-red-500 px-3 text-sm font-bold text-white
                       shadow-md transition-colors hover:bg-red-600 active:scale-95"
          >
            <Check className="h-4 w-4" /> Ha
          </button>
          <button
            onClick={() => setConfirming(false)}
            aria-label="Bekor qilish"
            className="flex h-9 w-9 items-center justify-center rounded-full bg-white/10 text-white
                       transition-colors hover:bg-white/20 active:scale-95"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      ) : (
        <div
          className="pointer-events-auto flex items-center gap-2 rounded-full
                     border border-white/15 bg-slate-900/90 px-2 py-2 pl-4
                     shadow-2xl backdrop-blur-xl ring-1 ring-black/20"
        >
          {arrived ? (
            <span className="px-2 text-base font-bold text-emerald-300">
              🎉 Yetib keldingiz
            </span>
          ) : (
            <>
              <Stat icon={<Clock className="h-4 w-4 text-emerald-300" />} value={timeStr} />
              <span className="h-5 w-px bg-white/15" />
              <Stat icon={<Route className="h-4 w-4 text-blue-300" />} value={formatDistance(remainingMeters)} />
            </>
          )}
          <button
            onClick={() => (arrived ? endNavigation() : setConfirming(true))}
            aria-label="Tugatish"
            className="ml-1 flex h-9 w-9 shrink-0 items-center justify-center rounded-full
                       bg-white/10 text-white transition-colors hover:bg-white/20 active:scale-95"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}
    </div>
  );
}

function Stat({ icon, value }: { icon: React.ReactNode; value: string }) {
  return (
    <span className="flex items-center gap-1.5 px-1">
      {icon}
      <span className="text-base font-black tabular-nums tracking-tight text-white">{value}</span>
    </span>
  );
}
