"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useMap } from "@/hooks/use-map";
import { Button } from "@/components/ui/button";
import { Map, Pin, Route, Clock } from "lucide-react";

// Legacy info panel — kept for reference but replaced by PublicDetailsPanel in the main layout.
export function InfoPanel() {
  const { selectedFeature, showRoute, setShowRoute } = useMap();

  return (
    <aside className="hidden h-full flex-col border-l bg-card p-4 shadow-lg lg:flex">
      <Card className="flex-1 overflow-y-auto">
        <CardHeader>
          <CardTitle>Ma'lumot</CardTitle>
          <CardDescription>Tanlangan obyekt yoki hudud haqida axborot.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {!selectedFeature && (
            <div className="flex flex-col items-center justify-center text-center text-muted-foreground pt-12">
              <Map className="h-12 w-12 mb-4" />
              <p className="font-semibold">Hech narsa tanlanmagan</p>
              <p className="text-sm">Tafsilotlarni ko'rish uchun xaritadagi obyekt yoki hududni tanlang.</p>
            </div>
          )}

          {selectedFeature && (
            <div className="space-y-2">
              <h3 className="font-bold text-lg">{selectedFeature.name}</h3>
              {selectedFeature.address && (
                <div className="text-sm space-y-1 pt-2">
                  <p><strong>Manzil:</strong> {selectedFeature.address}</p>
                  {selectedFeature.inn && <p><strong>INN (STIR):</strong> {selectedFeature.inn}</p>}
                </div>
              )}
              {selectedFeature.geometryKind === 'point' && (
                <Button className="w-full mt-4" onClick={() => setShowRoute(!showRoute)}>
                  <Pin className="mr-2 h-4 w-4" />
                  {showRoute ? "Yo'nalishni yashirish" : "Yaqin aeroportgacha yo'nalish"}
                </Button>
              )}
              {showRoute && (
                <Card className="bg-secondary mt-4 p-4">
                  <h4 className="font-semibold mb-2">Eng yaqin aeroport: Toshkent Xalqaro Aeroporti</h4>
                  <div className="flex items-center text-sm text-muted-foreground">
                    <Route className="h-4 w-4 mr-2" />
                    <span>Masofa: ~15 km</span>
                  </div>
                  <div className="flex items-center text-sm text-muted-foreground mt-1">
                    <Clock className="h-4 w-4 mr-2" />
                    <span>Taxminiy vaqt: ~25 daqiqa</span>
                  </div>
                </Card>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </aside>
  );
}
