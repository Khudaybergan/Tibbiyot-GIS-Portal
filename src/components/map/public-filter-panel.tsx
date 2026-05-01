"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Search,
  Filter,
  ChevronLeft,
  Building2,
  Stethoscope,
  FlaskConical,
  Map,
  Grid3X3,
  LayoutGrid,
} from "lucide-react";
import { useMap } from "@/hooks/use-map";
import { cn } from "@/lib/utils";
import type { Layer } from "@/lib/types";
import { LAYER_VISUAL } from "@/lib/geo/layer-config";

// ── Layer toggle data ─────────────────────────────────────────────────────────

type ToggleGroup = {
  label: string;
  items: {
    id: Layer;
    label: string;
    icon: React.ElementType;
    color: string;
  }[];
};

const TOGGLE_GROUPS: ToggleGroup[] = [
  {
    label: 'Muassasalar',
    items: [
      { id: 'state-clinics',   label: LAYER_VISUAL['state-clinics'].label,   icon: Building2,    color: LAYER_VISUAL['state-clinics'].color },
      { id: 'private-clinics', label: LAYER_VISUAL['private-clinics'].label, icon: Stethoscope,  color: LAYER_VISUAL['private-clinics'].color },
      { id: 'pharmacies',      label: LAYER_VISUAL['pharmacies'].label,       icon: FlaskConical, color: LAYER_VISUAL['pharmacies'].color },
    ],
  },
  {
    label: 'Chegaralar',
    items: [
      { id: 'regions',   label: LAYER_VISUAL['viloyat'].label,  icon: Map,        color: LAYER_VISUAL['viloyat'].color },
      { id: 'districts', label: LAYER_VISUAL['tuman'].label,    icon: Grid3X3,    color: LAYER_VISUAL['tuman'].color },
      { id: 'mahallas',  label: LAYER_VISUAL['mahalla'].label,  icon: LayoutGrid, color: LAYER_VISUAL['mahalla'].color },
    ],
  },
];

// ── Component ─────────────────────────────────────────────────────────────────

export function PublicFilterPanel() {
  const {
    activeLayers,
    toggleLayer,
    isFilterOpen,
    setIsFilterOpen,
  } = useMap();

  const [search, setSearch] = useState('');

  const handleReset = () => {
    setSearch('');
    // Keep all current layer selections — only clear search
  };

  return (
    <aside
      className={cn(
        'relative flex h-full flex-col border-r bg-card/50 backdrop-blur-sm transition-all duration-300 ease-in-out',
        !isFilterOpen ? 'w-0 opacity-0 pointer-events-none' : 'w-[380px] opacity-100',
      )}
    >
      <div className="flex h-full flex-col p-6 w-[380px]">
        {/* Header */}
        <div className="mb-6 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Filter className="h-5 w-5 text-primary" />
            <h2 className="text-lg font-bold">Filtrlar</h2>
          </div>
          <Button variant="ghost" size="icon" onClick={() => setIsFilterOpen(false)} className="rounded-full">
            <ChevronLeft className="h-5 w-5" />
          </Button>
        </div>

        {/* Search */}
        <div className="relative mb-6">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Muassasa nomi, manzil..."
            className="rounded-xl pl-10 focus-visible:ring-primary"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>

        {/* Layer toggles */}
        <div className="flex-1 overflow-y-auto space-y-7 pb-4 pr-1">
          {TOGGLE_GROUPS.map(group => (
            <div key={group.label} className="space-y-3">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                {group.label}
              </h3>
              <div className="space-y-2">
                {group.items.map(item => {
                  const active = activeLayers.includes(item.id);
                  return (
                    <button
                      key={item.id}
                      onClick={() => toggleLayer(item.id)}
                      className={cn(
                        'flex w-full items-center gap-3 rounded-xl border px-4 py-3 text-sm font-medium transition-all',
                        'hover:scale-[1.01] active:scale-[0.99]',
                        active
                          ? 'border-transparent bg-white shadow-md shadow-black/5 text-foreground'
                          : 'border-muted/40 bg-transparent text-muted-foreground hover:bg-muted/30',
                      )}
                    >
                      {/* Color dot */}
                      <span
                        className="h-3 w-3 shrink-0 rounded-full border-2 border-white shadow-sm"
                        style={{ backgroundColor: active ? item.color : '#94a3b8' }}
                      />
                      <item.icon
                        className="h-4 w-4 shrink-0 transition-colors"
                        style={{ color: active ? item.color : undefined }}
                      />
                      <span className="flex-1 text-left">{item.label}</span>
                      {/* Toggle indicator */}
                      <span
                        className={cn(
                          'h-5 w-9 rounded-full transition-all flex items-center px-0.5',
                          active ? 'bg-primary justify-end' : 'bg-muted justify-start',
                        )}
                      >
                        <span className="h-4 w-4 rounded-full bg-white shadow-sm" />
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          ))}

          {/* Legend */}
          <div className="rounded-xl border bg-muted/20 p-4 space-y-3">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Belgilar</h3>
            <div className="space-y-2">
              {[
                { color: '#2563EB', label: 'Davlat klinikalari', shape: 'circle' },
                { color: '#16A34A', label: 'Xususiy klinikalar', shape: 'circle' },
                { color: '#F59E0B', label: 'Dorixonalar',        shape: 'circle' },
                { color: '#2563EB', label: 'Viloyat chegarasi',  shape: 'line' },
                { color: '#7C3AED', label: 'Tuman chegarasi',    shape: 'line' },
                { color: '#0891B2', label: 'Mahalla chegarasi',  shape: 'line' },
              ].map(item => (
                <div key={item.label} className="flex items-center gap-2.5 text-xs text-muted-foreground">
                  {item.shape === 'circle' ? (
                    <span className="h-3 w-3 shrink-0 rounded-full" style={{ backgroundColor: item.color }} />
                  ) : (
                    <span className="h-0.5 w-4 shrink-0 rounded-full" style={{ backgroundColor: item.color }} />
                  )}
                  {item.label}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Footer reset */}
        <div className="mt-auto pt-4 border-t">
          <Button
            variant="ghost"
            className="w-full justify-center rounded-xl text-muted-foreground hover:text-destructive"
            onClick={handleReset}
          >
            Filtrlarni tozalash
          </Button>
        </div>
      </div>
    </aside>
  );
}
