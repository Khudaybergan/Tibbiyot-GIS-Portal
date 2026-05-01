
'use client';

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { Layers } from 'lucide-react';
import { useMap } from '@/hooks/use-map';
import { basemaps } from '@/lib/basemaps';
import type { BasemapId } from '@/lib/types';

export function BasemapSwitcher() {
  const { basemapId, setBasemapId } = useMap();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="secondary" size="icon" className="rounded-xl shadow-lg shadow-black/5 hover:scale-105 active:scale-95 transition-all">
          <Layers className="h-5 w-5" />
          <span className="sr-only">Switch Basemap</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="rounded-xl p-2 min-w-[150px]">
        <DropdownMenuRadioGroup
          value={basemapId}
          onValueChange={(value) => setBasemapId(value as BasemapId)}
        >
          {basemaps.map((basemap) => (
            <DropdownMenuRadioItem key={basemap.id} value={basemap.id} className="rounded-lg">
              {basemap.name}
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
