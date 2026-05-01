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
  ChevronRight,
  X,
  Users,
  Stethoscope,
  FlaskConical,
  Layers,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
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
function PointDetails({ feature, showRoute, setShowRoute }: {
  feature: GeoFeature;
  showRoute: boolean;
  setShowRoute: (v: boolean) => void;
}) {
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

      {/* Transport section */}
      <div className="space-y-3">
        <h4 className="flex items-center gap-2 text-sm font-bold">
          <Navigation className="h-4 w-4 text-primary" />
          Transport qulayligi
        </h4>
        <Button
          className="w-full justify-between rounded-xl px-4 py-6 shadow-md transition-all active:scale-95"
          onClick={() => setShowRoute(!showRoute)}
        >
          <span className="flex items-center gap-2">
            <Route className="h-5 w-5" />
            {showRoute ? "Yo'nalishni yashirish" : "Yaqin aeroportgacha yo'nalish"}
          </span>
          <ChevronRight className={cn('h-4 w-4 transition-transform', showRoute && 'rotate-90')} />
        </Button>
        {showRoute && (
          <div className="rounded-2xl border bg-muted/30 p-4 space-y-3 animate-in slide-in-from-top duration-300">
            <p className="text-xs font-semibold text-muted-foreground uppercase">Eng yaqin aeroport</p>
            <p className="text-sm font-bold">Toshkent Xalqaro Aeroporti</p>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Route className="h-4 w-4 text-primary" />
                <span className="text-sm font-medium">~15 km</span>
              </div>
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-primary" />
                <span className="text-sm font-medium">~25 daqiqa</span>
              </div>
            </div>
          </div>
        )}
      </div>
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
  const { selectedFeature, setSelectedFeature, showRoute, setShowRoute, isDetailsOpen, setIsDetailsOpen } = useMap();
  const isPoint = selectedFeature?.geometryKind === 'point';

  return (
    <aside
      className={cn(
        'relative flex h-full flex-col border-l bg-card/50 backdrop-blur-sm transition-all duration-300 ease-in-out',
        !isDetailsOpen ? 'w-0 opacity-0 pointer-events-none' : 'w-[400px] opacity-100',
      )}
    >
      {!selectedFeature ? (
        <div className="flex h-full flex-col items-center justify-center p-8 text-center animate-in fade-in zoom-in duration-300 w-[400px]">
          <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-3xl bg-muted/50 text-muted-foreground">
            <MapPin className="h-10 w-10" />
          </div>
          <h3 className="text-xl font-bold">Ob'ekt tanlanmagan</h3>
          <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
            Batafsil ma'lumotni ko'rish uchun xaritadagi ob'ektlardan birini tanlang.
          </p>
        </div>
      ) : (
        <div className="flex h-full flex-col overflow-hidden animate-in slide-in-from-right duration-300 w-[400px]">
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

          <ScrollArea className="flex-1 px-6 pt-6 pb-4">
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
                <PointDetails
                  feature={selectedFeature}
                  showRoute={showRoute}
                  setShowRoute={setShowRoute}
                />
              ) : (
                <BoundaryDetails feature={selectedFeature} />
              )}
            </div>
          </ScrollArea>

          {/* Footer actions */}
          <div className="grid grid-cols-2 gap-3 p-6 border-t bg-muted/10">
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
