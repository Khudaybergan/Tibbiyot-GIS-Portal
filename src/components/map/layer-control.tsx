"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { useMap } from "@/hooks/use-map";
import type { Layer } from "@/lib/types";

const layerGroups = [
  {
    title: "Ma'muriy chegaralar",
    layers: [
      { id: "regions", name: "Viloyatlar" },
      { id: "districts", name: "Tumanlar" },
      { id: "mahallas", name: "Mahallalar" },
    ],
  },
  {
    title: "Obyektlar",
    layers: [
      { id: "state-clinics", name: "Davlat klinikalari" },
      { id: "private-clinics", name: "Xususiy klinikalari" },
      { id: "pharmacies", name: "Dorixonalar" },
      { id: "airports", name: "Aeroportlar" },
    ],
  },
  {
    title: "Tematik qatlamlar",
    layers: [
      { id: "diseases", name: "Kasalliklar" },
      { id: "equipment", name: "Jihozlar" },
    ],
  },
];

export function LayerControl() {
  const { activeLayers, toggleLayer } = useMap();

  return (
    <aside className="hidden h-full flex-col border-r bg-card p-4 shadow-lg md:flex">
      <CardHeader className="p-2">
        <CardTitle>Tibbiyot GIS Portal</CardTitle>
      </CardHeader>
      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input placeholder="Obyektlarni qidirish..." className="pl-10" />
      </div>
      <Card className="flex-1 overflow-y-auto">
        <CardContent className="p-2">
          <Accordion type="multiple" defaultValue={["item-0", "item-1"]} className="w-full">
            {layerGroups.map((group, index) => (
              <AccordionItem value={`item-${index}`} key={index}>
                <AccordionTrigger className="text-sm font-semibold">{group.title}</AccordionTrigger>
                <AccordionContent>
                  <div className="space-y-3 pl-2">
                    {group.layers.map((layer) => (
                      <div key={layer.id} className="flex items-center space-x-2">
                        <Checkbox
                          id={layer.id}
                          checked={activeLayers.includes(layer.id as Layer)}
                          onCheckedChange={() => toggleLayer(layer.id as Layer)}
                        />
                        <Label htmlFor={layer.id} className="text-sm font-normal">
                          {layer.name}
                        </Label>
                      </div>
                    ))}
                  </div>
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </CardContent>
      </Card>
    </aside>
  );
}
