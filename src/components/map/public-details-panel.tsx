"use client";

import { Card } from "@/components/ui/card";
import { useMap } from "@/hooks/use-map";
import { Button } from "@/components/ui/button";
import {
  Building2,
  MapPin,
  Route,
  Clock,
  Navigation,
  Share2,
  X,
  Users,
  Stethoscope,
  FlaskConical,
  Layers,
  Car,
  PersonStanding,
  Bike,
  Loader2,
  AlertCircle,
  Sparkles,
} from "lucide-react";
import { formatDistance, formatDuration, type RouteProfile } from "@/lib/map/routing";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { LAYER_VISUAL } from "@/lib/geo/layer-config";
import type { GeoFeature, GeoLayerType } from "@/lib/geo/types";

// ── Helpers ───────────────────────────────────────────────────────────────────

// Layer type → badge color
const BADGE_COLOR: Record<GeoLayerType, string> = {
  'state-clinics':   'bg-blue-50 border-blue-200 text-blue-700',
  'private-clinics': 'bg-green-50 border-green-200 text-green-700',
  pharmacies:        'bg-amber-50 border-amber-200 text-amber-700',
  viloyat:           'bg-blue-50 border-blue-200 text-blue-700',
  tuman:             'bg-violet-50 border-violet-200 text-violet-700',
  mahalla:           'bg-cyan-50 border-cyan-200 text-cyan-700',
};

// Layer type → lucide icon
function LayerIcon({ type, className }: { type: GeoLayerType; className?: string }) {
  const cls = cn('h-5 w-5', className);
  switch (type) {
    case 'state-clinics':   return <Building2 className={cls} />;
    case 'private-clinics': return <Stethoscope className={cls} />;
    case 'pharmacies':      return <FlaskConical className={cls} />;
    default:                return <Layers className={cls} />;
  }
}

// Split services string (newlines / commas) into individual items
function parseServices(raw: string): string[] {
  return raw
    .split(/[\n,;]+/)
    .map(s => s.trim())
    .filter(Boolean)
    .slice(0, 12); // cap at 12 to avoid overwhelming the panel
}

// ── Sub-components ────────────────────────────────────────────────────────────

function InfoRow({
  icon,
  label,
  value,
  mono = false,
}: {
  icon: React.ReactNode;
  label: string;
  value: string | undefined | null;
  mono?: boolean;
}) {
  if (!value) return null;
  return (
    <div className="flex gap-3">
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-muted/50">
        {icon}
      </div>
      <div className="space-y-0.5">
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{label}</p>
        <p className={cn('text-sm leading-relaxed', mono && 'font-mono')}>{value}</p>
      </div>
    </div>
  );
}

// Details for point features (clinics / pharmacies)
function PointDetails({ feature }: { feature: GeoFeature }) {
  const services = feature.services ? parseServices(feature.services) : [];
  const locationStr = [feature.district, feature.region].filter(Boolean).join(', ');

  return (
    <div className="space-y-5">
      <InfoRow icon={<MapPin className="h-5 w-5 text-muted-foreground" />} label="Manzil" value={feature.address || locationStr || undefined} />
      <InfoRow icon={<Building2 className="h-5 w-5 text-muted-foreground" />} label="INN (STIR)" value={feature.inn} mono />
      {feature.mahalla && (
        <InfoRow icon={<MapPin className="h-5 w-5 text-muted-foreground" />} label="Mahalla" value={feature.mahalla} />
      )}

      {services.length > 0 && (
        <div className="flex gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-muted/50">
            <Stethoscope className="h-5 w-5 text-muted-foreground" />
          </div>
          <div className="space-y-1.5">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Xizmatlar</p>
            <div className="flex flex-wrap gap-1.5">
              {services.map((s, i) => (
                <span key={i} className="rounded-full bg-muted/70 px-2.5 py-0.5 text-xs text-foreground">
                  {s}
                </span>
              ))}
            </div>
          </div>
        </div>
      )}

      <div className="h-px bg-border" />

      <RouteSection feature={feature} />
    </div>
  );
}

// ── Route section ────────────────────────────────────────────────────────────

const PROFILE_META: Record<RouteProfile, { label: string; Icon: typeof Car; tint: string; bgFrom: string; bgTo: string }> = {
  driving: { label: 'Avtomobil', Icon: Car,             tint: 'text-blue-600',    bgFrom: 'from-blue-50',    bgTo: 'to-blue-100/60' },
  cycling: { label: 'Velosiped', Icon: Bike,            tint: 'text-emerald-600', bgFrom: 'from-emerald-50', bgTo: 'to-emerald-100/60' },
  walking: { label: 'Piyoda',    Icon: PersonStanding,  tint: 'text-amber-600',   bgFrom: 'from-amber-50',   bgTo: 'to-amber-100/60' },
};

function RouteSection({ feature }: { feature: GeoFeature }) {
  const {
    routes, routesLoading, routesError,
    routeProfile, setRouteProfile,
    buildRoutes, clearRoutes,
    startNavigation,
  } = useMap();

  if (!feature.coordinates) return null;
  const dest = feature.coordinates;

  return (
    <div className="space-y-3">
      <h4 className="flex items-center gap-2 text-sm font-bold">
        <Navigation className="h-4 w-4 text-primary" />
        Yo'nalish qurish
      </h4>

      {/* Build button */}
      {!routes && !routesLoading && !routesError && (
        <Button
          onClick={() => buildRoutes(dest)}
          className="group relative w-full justify-between overflow-hidden rounded-xl px-4 py-6 shadow-lg transition-all active:scale-95
                     bg-gradient-to-r from-primary via-blue-600 to-indigo-600 hover:shadow-primary/30 hover:shadow-2xl"
        >
          <span className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/20 to-transparent
                           transition-transform duration-700 group-hover:translate-x-full" />
          <span className="flex items-center gap-2 text-white">
            <Sparkles className="h-5 w-5" />
            Marshrut qurish
          </span>
          <Route className="h-5 w-5 text-white" />
        </Button>
      )}

      {/* Loading */}
      {routesLoading && (
        <div className="flex items-center gap-3 rounded-xl border bg-muted/30 px-4 py-4 animate-in fade-in duration-200">
          <Loader2 className="h-5 w-5 animate-spin text-primary" />
          <div className="space-y-0.5">
            <p className="text-sm font-semibold">Marshrutlar hisoblanmoqda…</p>
            <p className="text-xs text-muted-foreground">3 ta rejim parallel hisoblanmoqda</p>
          </div>
        </div>
      )}

      {/* Error */}
      {routesError && !routesLoading && (
        <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-4 space-y-3 animate-in fade-in slide-in-from-top duration-300">
          <div className="flex gap-3">
            <AlertCircle className="h-5 w-5 shrink-0 text-destructive" />
            <p className="text-sm text-destructive font-medium leading-relaxed">{routesError}</p>
          </div>
          <Button variant="outline" size="sm" onClick={() => buildRoutes(dest)} className="w-full rounded-lg">
            Qayta urinish
          </Button>
        </div>
      )}

      {/* Comparison cards */}
      {routes && !routesLoading && (
        <div className="space-y-3 animate-in fade-in slide-in-from-top duration-500">
          {(Object.keys(PROFILE_META) as RouteProfile[]).map(p => {
            const { label, Icon, tint, bgFrom, bgTo } = PROFILE_META[p];
            const r = routes[p];
            const active = routeProfile === p;
            return (
              <button
                key={p}
                type="button"
                onClick={() => setRouteProfile(p)}
                className={cn(
                  'group relative w-full overflow-hidden rounded-2xl border-2 p-4 text-left transition-all',
                  active
                    ? `border-primary bg-gradient-to-br ${bgFrom} ${bgTo} shadow-lg scale-[1.02]`
                    : 'border-border/50 bg-card hover:border-border hover:shadow-md hover:scale-[1.01]',
                )}
              >
                {active && (
                  <div className="absolute right-3 top-3 flex h-6 w-6 items-center justify-center rounded-full bg-primary text-white">
                    <Sparkles className="h-3 w-3" />
                  </div>
                )}
                <div className="flex items-center gap-3">
                  <div className={cn('flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-white shadow-sm', tint)}>
                    <Icon className="h-6 w-6" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">{label}</p>
                    <div className="mt-0.5 flex items-baseline gap-2">
                      <span className="text-xl font-black tabular-nums">{formatDuration(r.durationSeconds)}</span>
                    </div>
                    <p className="mt-0.5 text-xs text-muted-foreground tabular-nums">
                      {formatDistance(r.distanceMeters)}
                    </p>
                  </div>
                </div>
              </button>
            );
          })}

          {/* Start navigation CTA */}
          <Button
            onClick={startNavigation}
            className="group relative mt-2 w-full overflow-hidden rounded-2xl px-4 py-7 text-base font-bold shadow-2xl transition-all active:scale-[0.98]
                       bg-gradient-to-r from-emerald-500 via-emerald-600 to-teal-600 hover:shadow-emerald-500/40"
          >
            <span className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/30 to-transparent
                             transition-transform duration-700 group-hover:translate-x-full" />
            <span className="flex items-center justify-center gap-2 text-white">
              <Navigation className="h-5 w-5" />
              Boshlash
            </span>
          </Button>

          <Button
            variant="ghost"
            onClick={clearRoutes}
            className="w-full rounded-xl text-xs text-muted-foreground"
          >
            <X className="mr-1.5 h-3 w-3" /> Marshrutni o'chirish
          </Button>
        </div>
      )}
    </div>
  );
}

// Details for boundary features (viloyat / tuman / mahalla)
function BoundaryDetails({ feature }: { feature: GeoFeature }) {
  return (
    <div className="space-y-5">
      {feature.district && (
        <InfoRow icon={<MapPin className="h-5 w-5 text-muted-foreground" />} label="Tuman" value={feature.district} />
      )}
      {feature.population && (
        <InfoRow icon={<Users className="h-5 w-5 text-muted-foreground" />} label="Aholi soni" value={feature.population.toLocaleString('uz-UZ')} />
      )}
      {Boolean(feature.raw.KADASTR ?? feature.raw.kadastr) && (
        <InfoRow
          icon={<Building2 className="h-5 w-5 text-muted-foreground" />}
          label="Kadastr raqami"
          value={String(feature.raw.KADASTR ?? feature.raw.kadastr ?? '')}
          mono
        />
      )}
      {Boolean(feature.raw.parent_code) && (
        <InfoRow
          icon={<Layers className="h-5 w-5 text-muted-foreground" />}
          label="SOATO kodi"
          value={String(feature.raw.parent_code)}
          mono
        />
      )}
    </div>
  );
}

// ── Main panel ────────────────────────────────────────────────────────────────

export function PublicDetailsPanel() {
  const { selectedFeature, setSelectedFeature, isDetailsOpen, setIsDetailsOpen } = useMap();
  const isPoint = selectedFeature?.geometryKind === 'point';

  return (
    <aside
      className={cn(
        // ─ Mobile (< lg): bottom sheet ─────────────────────────────────────
        'absolute z-30 flex flex-col overflow-hidden bg-card/95 shadow-2xl backdrop-blur-md',
        'inset-x-0 bottom-0 max-h-[75dvh] rounded-t-3xl border-t',
        'transition-transform duration-300 ease-in-out will-change-transform',
        // ─ Desktop (lg+): right sidebar ────────────────────────────────────
        'lg:inset-y-0 lg:bottom-auto lg:right-0 lg:left-auto lg:top-0',
        'lg:w-[400px] lg:max-h-none lg:rounded-none lg:border-l lg:border-t-0',
        // ─ Open / closed state ─────────────────────────────────────────────
        isDetailsOpen
          ? 'translate-y-0 lg:translate-y-0 lg:translate-x-0'
          : 'translate-y-full lg:translate-y-0 lg:translate-x-full',
      )}
    >
      {/* Mobile drag-handle (visual cue only) */}
      <div className="flex h-5 shrink-0 items-center justify-center lg:hidden">
        <div className="h-1.5 w-12 rounded-full bg-muted-foreground/30" />
      </div>

      {!selectedFeature ? (
        <div className="flex flex-1 flex-col items-center justify-center p-8 text-center animate-in fade-in zoom-in duration-300">
          <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-3xl bg-muted/50 text-muted-foreground">
            <MapPin className="h-8 w-8" />
          </div>
          <h3 className="text-lg font-bold">Ob'ekt tanlanmagan</h3>
          <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
            Batafsil ma'lumotni ko'rish uchun xaritadagi ob'ektlardan birini tanlang.
          </p>
        </div>
      ) : (
        <div className="flex h-full min-h-0 flex-col overflow-hidden animate-in fade-in duration-300">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b">
            <h3 className="font-bold">Ma'lumotlar</h3>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => { setIsDetailsOpen(false); setSelectedFeature(null); }}
              className="rounded-full"
            >
              <X className="h-5 w-5" />
            </Button>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 pt-4 pb-4 sm:px-6 sm:pt-6">
            <div className="space-y-5">
              {/* Title block */}
              <div>
                <Badge
                  variant="outline"
                  className={cn(
                    'mb-3 rounded-full px-3 text-xs font-semibold border',
                    BADGE_COLOR[selectedFeature.layerType],
                  )}
                >
                  <LayerIcon type={selectedFeature.layerType} className="mr-1.5 h-3 w-3" />
                  {LAYER_VISUAL[selectedFeature.layerType].label}
                </Badge>
                <h2 className="text-xl font-bold tracking-tight text-foreground leading-tight">
                  {selectedFeature.name}
                </h2>
                {selectedFeature.region && (
                  <p className="mt-1 text-sm text-muted-foreground">{selectedFeature.region}</p>
                )}
              </div>

              <div className="h-px bg-border" />

              {isPoint ? (
                <PointDetails feature={selectedFeature} />
              ) : (
                <BoundaryDetails feature={selectedFeature} />
              )}
            </div>
          </div>

          {/* Footer actions */}
          <div className="grid grid-cols-2 gap-3 border-t bg-muted/10 p-4 sm:p-6 pb-[max(1rem,env(safe-area-inset-bottom))]">
            <Button
              variant="outline"
              className="rounded-xl"
              onClick={() => {
                const text = `${selectedFeature.name}${selectedFeature.address ? ' — ' + selectedFeature.address : ''}`;
                navigator.clipboard?.writeText(text).catch(() => {});
              }}
            >
              <Share2 className="mr-2 h-4 w-4" /> Ulashish
            </Button>
            <Button
              variant="outline"
              className="rounded-xl"
              onClick={() => {
                if (selectedFeature.coordinates) {
                  const [lng, lat] = selectedFeature.coordinates;
                  window.open(`https://www.google.com/maps?q=${lat},${lng}`, '_blank');
                }
              }}
              disabled={!selectedFeature.coordinates}
            >
              <MapPin className="mr-2 h-4 w-4" /> Xaritada
            </Button>
          </div>
        </div>
      )}
    </aside>
  );
}
