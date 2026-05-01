import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Hospital, Syringe, FileUp, Database } from "lucide-react";

export function DashboardCards() {
  const stats = [
    {
      title: "Jami Obyektlar",
      value: "1,250",
      icon: Database,
      description: "Tizimdagi barcha geobyektlar",
    },
    {
      title: "Klinikalar",
      value: "450",
      icon: Hospital,
      description: "Davlat va xususiy klinikalar",
    },
    {
      title: "Dorixonalar",
      value: "800",
      icon: Syringe,
      description: "Barcha litsenziyalangan dorixonalar",
    },
    {
      title: "Oxirgi Import",
      value: "2 kun oldin",
      icon: FileUp,
      description: "Oxirgi muvaffaqiyatli yuklama",
    },
  ];

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {stats.map((stat, index) => (
        <Card key={index}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{stat.title}</CardTitle>
            <stat.icon className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stat.value}</div>
            <p className="text-xs text-muted-foreground">{stat.description}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
