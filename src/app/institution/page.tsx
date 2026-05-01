import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Users, Activity } from "lucide-react";

export default function InstitutionDashboardPage() {
  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold tracking-tight">"Shox Med Center" Boshqaruv Paneli</h1>
        <p className="text-muted-foreground">
          Muassasangiz faoliyati haqida umumiy ma'lumot.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Shifokorlar</CardTitle>
                  <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                  <div className="text-2xl font-bold">12</div>
                  <p className="text-xs text-muted-foreground">Faol shifokorlar soni</p>
              </CardContent>
          </Card>
           <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Bugungi tashriflar</CardTitle>
                  <Activity className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                  <div className="text-2xl font-bold">+85</div>
                  <p className="text-xs text-muted-foreground">O'tgan kunga nisbatan +10%</p>
              </CardContent>
          </Card>
      </div>
      
      <Card>
        <CardHeader>
          <CardTitle>Muassasa ma'lumotlari</CardTitle>
          <CardDescription>
            Muassasa rekvizitlari, manzili va boshqa ma'lumotlarini tahrirlash.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p>Muassasa ma'lumotlarini tahrirlash formasi bu yerda bo'ladi.</p>
        </CardContent>
      </Card>
    </div>
  );
}
